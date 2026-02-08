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
    if (!folderId || !collectionId) return;

    const controller = new AbortController();

    async function fetchFiles() {
      setLoading(true);
      setError(null);

      try {
        if (!API_KEY) {
          throw new Error('Missing Google Drive API key. Set VITE_GOOGLE_DRIVE_API_KEY in .env');
        }

        // Step 1: Check if we need to sync from server
        const needsSync = needsServerSync(collectionId);

        // Step 2: Try cache first
        const cacheKey = `drive_cache_${folderId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached && !needsSync) {
          // Use cache - zero API calls
          console.log(`[Drive] Using cached files for ${collectionId}`);
          setFiles(JSON.parse(cached));
          setLoading(false);

          // Step 3: Background check if 24 hours passed
          if (shouldCheckDriveForChanges(collectionId)) {
            console.log(`[Drive] 24h passed, checking for changes in background...`);
            checkForDriveChanges(folderId, collectionId).catch(err =>
              console.error('[Drive] Background check failed:', err)
            );
          }

          return;
        }

        // Step 4: Fetch from Google Drive
        console.log(`[Drive] Fetching fresh files for ${collectionId}`);
        const params = new URLSearchParams({
          key: API_KEY,
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'files(id,name,webViewLink,iconLink,mimeType,modifiedTime,size)',
          orderBy: 'name_natural',
        });

        const res = await fetch(`${DRIVE_API_URL}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Drive API error ${res.status}: ${text}`);
        }

        const data = await res.json();
        const fileList = data.files ?? [];

        // Step 5: Cache the result
        localStorage.setItem(cacheKey, JSON.stringify(fileList));

        // Step 6: Update check timestamp
        const latestModified = getLatestModifiedTime(fileList);
        await updateDriveCheckTimestamp(collectionId, latestModified);

        // Step 7: Mark as synced
        markSyncedLocally(collectionId);

        setFiles(fileList);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load files from Google Drive');
        }
      } finally {
        setLoading(false);
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
