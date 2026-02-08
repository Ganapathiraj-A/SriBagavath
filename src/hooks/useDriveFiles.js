// src/hooks/useDriveFiles.js
import { useEffect, useState } from 'react';
import { needsServerSync, markSyncedLocally, shouldCheckDriveForChanges, updateDriveCheckTimestamp } from '../utils/SyncManager';

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
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!folderId) return;

    const controller = new AbortController();

    async function fetchFiles() {
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
        const timer = setTimeout(() => {
          if (loading && !cached) {
            console.warn(`[Drive] Fetch for ${collectionId || folderId} is taking > 5s...`);
          }
        }, 5000);

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

          const res = await fetch(`${DRIVE_API_URL}?${params.toString()}`, {
            signal: controller.signal,
          });

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
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[Drive] Fetch failed:', err);
          const errorMsg = `Drive Fetch Error (${collectionId || folderId}): ${err.message}`;
          setError(errorMsg);
          // Only alert once for high-level debugging
          if (!localStorage.getItem(`alert_shown_${collectionId}`)) {
            alert(errorMsg + "\nCheck your network and API Key.");
            localStorage.setItem(`alert_shown_${collectionId}`, 'true');
          }
        }
      } finally {
        setLoading(false);
        clearTimeout(timer);
      }
    }

    fetchFiles();
    return () => controller.abort();
  }, [folderId, collectionId]);

  return { files, loading, error };
}

/**
 * Background check for Drive changes (doesn't update UI)
 * Only fetches the most recently modified file to check for changes
 */
async function checkForDriveChanges(folderId, collectionId) {
  try {
    const params = new URLSearchParams({
      key: API_KEY,
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 1 // Only need the latest
    });

    const res = await fetch(`${DRIVE_API_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Drive API error ${res.status}`);
    }

    const data = await res.json();
    const latestModified = data.files?.[0]?.modifiedTime || new Date().toISOString();

    await updateDriveCheckTimestamp(collectionId, latestModified);
  } catch (e) {
    console.error('[Drive] Background check failed:', e);
  }
}

/**
 * Get latest modification time from file list
 */
function getLatestModifiedTime(files) {
  if (!files || files.length === 0) return new Date().toISOString();

  const times = files.map(f => new Date(f.modifiedTime).getTime());
  return new Date(Math.max(...times)).toISOString();
}
