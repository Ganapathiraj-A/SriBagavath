import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * PersistentImageCache
 * 
 * Provides persistent image caching using the device filesystem.
 * This ensures images are only downloaded once and served locally.
 */

const CACHE_DIR = 'persistent_image_cache';

/**
 * Simple hash function to create unique filenames from URLs
 */
const getHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
};

/**
 * Extracts extension from URL or defaults to jpg
 */
const getExtension = (url) => {
    try {
        const path = new URL(url).pathname;
        const parts = path.split('.');
        const ext = parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
        return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'jpg';
    } catch {
        return 'jpg';
    }
};

/**
 * Gets a cached version of an image URL, or downloads and caches it if missing.
 * @param {string} url - The remote image URL
 * @param {string|number} [version] - Optional version tag/timestamp for cache-busting
 * @returns {Promise<string>} - The local URI or the original URL on failure/web
 */
export const getCachedImage = async (url, version = '') => {
    // 1. Skip if not native or invalid URL
    if (!Capacitor.isNativePlatform() || !url || !url.startsWith('http')) {
        return url;
    }

    // Include version in the hash to force a new filename if content changed at same URL
    const hashInput = version ? `${url}_${version}` : url;
    const filename = `${getHash(hashInput)}.${getExtension(url)}`;
    const path = `${CACHE_DIR}/${filename}`;

    try {
        // 2. Ensure Cache Directory exists (cheap operation)
        try {
            await Filesystem.mkdir({
                path: CACHE_DIR,
                directory: Directory.Cache,
                recursive: true
            });
        } catch (e) {
            // Directory likely already exists
        }

        // 3. Check if file already exists
        try {
            const stat = await Filesystem.stat({
                path,
                directory: Directory.Cache
            });
            // Return converted path for <img src>
            return Capacitor.convertFileSrc(stat.uri);
        } catch (e) {
            // 4. File doesn't exist, download and cache it
            // console.log(`[PersistentImageCache] Downloading: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const blob = await response.blob();
            
            // Convert to Base64 for writing
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            await Filesystem.writeFile({
                path,
                data: base64,
                directory: Directory.Cache
            });

            // Re-fetch URI after write
            const finalUri = await Filesystem.getUri({
                path,
                directory: Directory.Cache
            });
            
            return Capacitor.convertFileSrc(finalUri.uri);
        }
    } catch (err) {
        console.error("[PersistentImageCache] Error:", err.message);
        return url; // Safe fallback
    }
};

/**
 * Clears the entire persistent image cache
 */
export const clearImageCache = async () => {
    try {
        await Filesystem.rmdir({
            path: CACHE_DIR,
            directory: Directory.Cache,
            recursive: true
        });
        console.log("[PersistentImageCache] Cache cleared");
    } catch (err) {
        console.error("[PersistentImageCache] Failed to clear cache:", err);
    }
};
