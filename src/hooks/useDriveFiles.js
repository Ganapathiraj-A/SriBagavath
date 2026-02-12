// src/hooks/useDriveFiles.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { needsServerSync, markSyncedLocally, shouldCheckDriveForChanges, updateDriveCheckTimestamp } from '@/utils/SyncManager';

const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * Hook to fetch files from Google Drive with intelligent caching
 * @param {string} folderId - Google Drive folder ID
 * @param {string} collectionId - Sync registry collection ID (e.g., 'digital_books_tamil')
 */
export function useDriveFiles(folderId, collectionId) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(loading);
  const [error, setError] = useState(null);

  // Sync ref with state
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const fetchFiles = useCallback(async (signal, timerSetter) => {
    setError(null);

    try {
      if (!API_KEY) {
        throw new Error('Missing Google Drive API key. Set VITE_GOOGLE_DRIVE_API_KEY in .env');
      }

      const cacheKey = `drive_cache_${folderId}`;
      const cached = localStorage.getItem(cacheKey);

      // Step 1: If we have cache, show it immediately
      if (cached) {
        setFiles(JSON.parse(cached));
        setLoading(false);
        console.log(`[Drive] Showing cached files for ${collectionId || folderId}`);
      } else {
        setLoading(true);
      }

      // Diagnostic alert for the user if it's taking a while
      timerSetter();

      // Step 2: Determine if we need a background refresh
      // We always refresh if:
      // 1. No cache exists
      // 2. No collectionId (safety)
      // 3. collectionId says we need sync
      // 4. It's been > 24h (background check)
      const needsSync = !collectionId || needsServerSync(collectionId);
      const shouldCheckDrive = !collectionId || shouldCheckDriveForChanges(collectionId);

      if (!cached || needsSync || shouldCheckDrive) {
        console.log(`[Drive] Refreshing files for ${collectionId || folderId}...`);
        const params = new URLSearchParams({
          key: API_KEY,
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'files(id,name,webViewLink,iconLink,mimeType,modifiedTime,size)',
          orderBy: 'name_natural',
        });

        const res = await fetch(`${DRIVE_API_URL}?${params.toString()}`, { signal });

        console.log(`[Drive] Fetch response for ${collectionId || folderId}: ${res.status}`);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Drive API error ${res.status}: ${text}`);
        }

        const data = await res.json();
        const fileList = data.files ?? [];

        // Cache & Update UI
        localStorage.setItem(cacheKey, JSON.stringify(fileList));
        setFiles(fileList);

        if (collectionId) {
          const latestModified = getLatestModifiedTime(fileList);
          // Fire and forget to avoid hanging on permission errors or slow networks
          updateDriveCheckTimestamp(collectionId, latestModified)
            .catch(e => console.error("[Drive] Failed to update timestamp:", e));
          markSyncedLocally(collectionId);
        }
      }
    } catch (_err) {
      if (_err.name !== 'AbortError') {
        console.error('[Drive] Fetch failed:', _err);
        const errorMsg = `Drive Fetch Error (${collectionId || folderId}): ${_err.message}`;
        setError(errorMsg);
        // Only alert once for high-level debugging
        if (!localStorage.getItem(`alert_shown_${collectionId}`)) {
          alert(errorMsg + "\nCheck your network and API Key.");
          localStorage.setItem(`alert_shown_${collectionId}`, 'true');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [folderId, collectionId]);

  useEffect(() => {
    if (!folderId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let timer;

    const timerSetter = () => {
      timer = setTimeout(() => {
        if (loadingRef.current) {
          console.warn(`[Drive] Fetch for ${collectionId || folderId} is taking > 5s...`);
        }
      }, 5000);
    };

    fetchFiles(controller.signal, timerSetter);

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [folderId, collectionId, fetchFiles]); // Removed `loading` dependency

  return { files, loading, error };
}

/**
 * Get latest modification time from file list
 */
function getLatestModifiedTime(files) {
  if (!files || files.length === 0) return new Date().toISOString();

  const times = files.map(f => new Date(f.modifiedTime).getTime());
  return new Date(Math.max(...times)).toISOString();
}
