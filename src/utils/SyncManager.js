import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { doc, getDoc, updateDoc, increment, setDoc } from '@/utils/FirestoreProxy';
import { db } from '../firebase';

/**
 * SyncManager
 * 
 * Implements a Global Version Registry to minimize Firestore reads.
 * For static collections (programs, books, etc.), the app only fetches from the server
 * if the local version is behind the server version.
 */

const LOCAL_STORAGE_KEY = 'sbb_sync_registry';

const syncState = {
    serverRegistry: JSON.parse(localStorage.getItem('sbb_server_registry_cache') || '{}'),
    localRegistry: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'),
    isInitialized: false
};

const REGISTRY_CACHE_KEY = 'sbb_server_registry_cache';
const REGISTRY_TIME_KEY = 'sbb_server_registry_time';

/**
 * Fetch the latest version numbers from the server
 */
export const initializeSyncManager = async (force = false) => {
    try {
        const now = Date.now();
        const lastRegistryFetch = parseInt(localStorage.getItem(REGISTRY_TIME_KEY) || '0', 10);
        const cacheAgeMinutes = (now - lastRegistryFetch) / (1000 * 60);

        // Optimization: Use cache if it's less than 60 minutes old, unless forced
        if (!force && lastRegistryFetch && cacheAgeMinutes < 60 && Object.keys(syncState.serverRegistry).length > 0) {
            console.log(`[SyncManager] Using cached registry (Age: ${Math.round(cacheAgeMinutes)}m)`);
            syncState.isInitialized = true;
            return;
        }

        console.log("[SyncManager] Fetching fresh registry from server...");
        const registryDoc = await getDoc(doc(db, 'app_settings', 'sync_registry'));
        if (registryDoc.exists()) {
            syncState.serverRegistry = registryDoc.data();
            localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(syncState.serverRegistry));
            localStorage.setItem(REGISTRY_TIME_KEY, now.toString());
            console.log("[SyncManager] Loaded server registry:", syncState.serverRegistry);
        } else {
            console.warn("[SyncManager] Registry doc not found on server");
        }
        syncState.isInitialized = true;
    } catch (e) {
        console.error("[SyncManager] Initialization failed:", e);
    }
};


// Lazy initialization - don't block module load
let initPromise = null;

export const ensureInitialized = async () => {
    if (syncState.isInitialized) return;
    if (initPromise) return initPromise;

    initPromise = initializeSyncManager();
    await initPromise;
};

// Initialize in background after a short delay (non-blocking)
if (typeof window !== 'undefined') {
    // Start initialization immediately but don't block
    ensureInitialized();

    if (Capacitor.isNativePlatform()) {
        App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                console.log("[SyncManager] App resumed, re-checking registry");
                initializeSyncManager(true); // Force check on resume
            }
        });
    }
}

/**
 * Check if a collection needs a server fetch
 * @param {string} collectionId 
 * @returns {boolean} True if local version is outdated or missing
 */
export const needsServerSync = (collectionId) => {
    if (!syncState.isInitialized) {
        console.log(`[SyncManager] Sync check for ${collectionId} - Blocked (Not Initialized)`);
        return true; // Safety default
    }

    const serverVersion = syncState.serverRegistry[collectionId] || 0;
    const localVersion = syncState.localRegistry[collectionId] || 0;

    const result = serverVersion > localVersion;
    if (result) {
        console.log(`[SyncManager] Sync REQUIRED for ${collectionId} (Server: ${serverVersion}, Local: ${localVersion})`);
    }
    return result;
};

/**
 * Debug helper to view internal state
 */
export const getSyncState = () => syncState;

/**
 * Mark a collection as up-to-date locally
 * @param {string} collectionId 
 */
export const markSyncedLocally = (collectionId) => {
    const serverVersion = syncState.serverRegistry[collectionId] || 1;
    syncState.localRegistry[collectionId] = serverVersion;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(syncState.localRegistry));
    console.log(`[SyncManager] Marked ${collectionId} as synced at version ${serverVersion}`);
};

/**
 * ADMIN ONLY: Increment the version of a collection on the server
 * @param {string} collectionId 
 */
export const bumpServerVersion = async (collectionId) => {
    try {
        const ref = doc(db, 'app_settings', 'sync_registry');
        await updateDoc(ref, {
            [collectionId]: increment(1)
        });
        console.log(`[SyncManager] Bumped server version for ${collectionId}`);
    } catch (e) {
        // If doc doesn't exist, create it
        try {
            await setDoc(doc(db, 'app_settings', 'sync_registry'), { [collectionId]: 1 }, { merge: true });
        } catch (err) {
            console.error("[SyncManager] Failed to bump version:", err);
        }
    }
};

/**
 * Check if we should perform a Google Drive sync check
 * @param {string} collectionId - e.g., 'digital_books_tamil'
 * @returns {boolean} True if 24 hours have passed since last check
 */
export const shouldCheckDriveForChanges = (collectionId) => {
    if (!syncState.isInitialized) return false;

    const lastCheckedKey = `${collectionId}_lastChecked`;
    const serverLastChecked = syncState.serverRegistry[lastCheckedKey];

    // Also check local localStorage for a recent check (for anonymous users who can't update server)
    const localLastChecked = localStorage.getItem(`last_drive_check_${collectionId}`);

    const bestLastChecked = (serverLastChecked && localLastChecked)
        ? (new Date(serverLastChecked) > new Date(localLastChecked) ? serverLastChecked : localLastChecked)
        : (serverLastChecked || localLastChecked);

    if (!bestLastChecked) return true; // Never checked before

    const hoursSinceCheck = (Date.now() - new Date(bestLastChecked).getTime()) / (1000 * 60 * 60);
    return hoursSinceCheck >= 24;
};

/**
 * Update Drive folder check timestamp and version if changed
 * @param {string} collectionId 
 * @param {string} latestModifiedTime - ISO timestamp from Google Drive API
 */
export const updateDriveCheckTimestamp = async (collectionId, latestModifiedTime) => {
    try {
        const ref = doc(db, 'app_settings', 'sync_registry');
        const lastModifiedKey = `${collectionId}_lastModified`;
        const lastCheckedKey = `${collectionId}_lastChecked`;

        // Double-check: another app might have just updated (race condition prevention)
        const docSnap = await getDoc(ref);
        if (docSnap.exists()) {
            const currentLastChecked = docSnap.data()[lastCheckedKey];
            if (currentLastChecked) {
                const hoursSince = (Date.now() - new Date(currentLastChecked).getTime()) / (1000 * 60 * 60);
                if (hoursSince < 1) {
                    // Another app just checked within the last hour, skip
                    console.log(`[SyncManager] Another app recently checked ${collectionId}, skipping`);
                    return;
                }
            }
        }

        // Get current stored modification time
        const currentModified = syncState.serverRegistry[lastModifiedKey];

        const updates = {
            [lastCheckedKey]: new Date().toISOString()
        };

        // ALways update local check time so even anonymous users don't spam Drive
        localStorage.setItem(`last_drive_check_${collectionId}`, updates[lastCheckedKey]);

        // If Drive files were modified since last check, bump version
        if (!currentModified || new Date(latestModifiedTime) > new Date(currentModified)) {
            updates[lastModifiedKey] = latestModifiedTime;
            updates[collectionId] = increment(1);
            console.log(`[SyncManager] Drive files changed for ${collectionId}, bumping version`);
        } else {
            console.log(`[SyncManager] No changes detected for ${collectionId}`);
        }

        await updateDoc(ref, updates);

        // Re-initialize to get latest registry
        await initializeSyncManager();
    } catch (e) {
        // If doc doesn't exist, create it
        try {
            await setDoc(doc(db, 'app_settings', 'sync_registry'), {
                [collectionId]: 1,
                [`${collectionId}_lastChecked`]: new Date().toISOString(),
                [`${collectionId}_lastModified`]: latestModifiedTime
            }, { merge: true });
            await initializeSyncManager();
        } catch (err) {
            console.error("[SyncManager] Failed to update Drive check:", err);
        }
    }
};
