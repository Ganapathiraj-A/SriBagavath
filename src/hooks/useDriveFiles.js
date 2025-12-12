// src/hooks/useDriveFiles.js
import { useEffect, useState } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export function useDriveFiles(folderId) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!folderId) return;

    const controller = new AbortController();

    async function fetchFiles() {
      setLoading(true);
      setError(null);

      try {
        if (!API_KEY) {
          throw new Error(
            'Missing Google Drive API key. Set VITE_GOOGLE_DRIVE_API_KEY in .env'
          );
        }

        const params = new URLSearchParams({
          key: API_KEY,
          q: `'${folderId}' in parents and trashed=false`,
          fields:
            'files(id,name,webViewLink,iconLink,mimeType,modifiedTime,size)',
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
        setFiles(data.files ?? []);
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
  }, [folderId]);

  return { files, loading, error };
}
