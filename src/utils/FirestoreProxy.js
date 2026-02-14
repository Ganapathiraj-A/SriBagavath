import * as firestore from 'firebase/firestore';
import ApiMonitor from './ApiMonitor';

// Re-export everything from the original SDK
export * from 'firebase/firestore';

// Explicit exports to avoid reference errors in some environments
export {
    collection, doc, query, orderBy, where, limit,
    startAfter, addDoc as firebaseAddDoc, setDoc as firebaseSetDoc,
    updateDoc as firebaseUpdateDoc, deleteDoc as firebaseDeleteDoc,
    getDoc as firebaseGetDoc, getDocs as firebaseGetDocs
} from 'firebase/firestore';

// Helper to track reads from snapshots
const lastLoggedDocs = new Map(); // Track last doc count/data for listeners to avoid spam

const trackRead = (snapshot, context = 'Query') => {
    if (!snapshot) return;
    const isCache = snapshot.metadata?.fromCache;
    const source = isCache ? 'CACHE' : 'SERVER';
    let count = 0;

    if (snapshot.docChanges) {
        const changes = snapshot.docChanges();
        count = changes.length > 0 ? changes.length : snapshot.size;
        if (count === 0 && !snapshot.empty) count = snapshot.size;
        if (snapshot.empty && !isCache) count = 1; // Server empty query costs 1
    } else {
        count = snapshot.exists() ? 1 : 0;
    }

    // Optimization: Skip logging if this is a server "latch" with 0 changes and we already showed cache docs
    const key = `${context}_${snapshot._query?.path?.segments?.join('/') || ''}`;
    if (!isCache && snapshot.docChanges && snapshot.docChanges().length === 0 && lastLoggedDocs.get(key) === count) {
        // This is likely just the metadata change event (Cache -> Server) with no actual data change
        // We still technically hit the server, but for the user's visual count, it's just "confirming" cache.
        // We will log it as a sync but maybe keep it subtle?
        // Actually, let's keep logging but add "Synced"
        console.log(`[Firestore] SYNC | ${source} | ${context} | Docs: ${count} (No changes)`);
        return;
    }

    lastLoggedDocs.set(key, count);

    const type = isCache ? 'recordCacheRead' : 'recordServerRead';
    ApiMonitor[type](count);

    console.log(`[Firestore] READ | ${source} | ${context} | Docs: ${count}`);
};

// Override getDoc
export const getDoc = async (...args) => {
    const snap = await firestore.getDoc(...args);
    const path = args[0]?.path || 'unknown';
    trackRead(snap, `Doc: ${path}`);
    return snap;
};

// Override getDocs
export const getDocs = async (...args) => {
    const snap = await firestore.getDocs(...args);
    const path = args[0]?._query?.path?.segments?.join('/') || 'unknown';
    trackRead(snap, `Collection: ${path}`);
    return snap;
};

// Override onSnapshot
export const onSnapshot = (...args) => {
    const path = args[0]?.path || args[0]?._query?.path?.segments?.join('/') || 'unknown';
    const callback = typeof args[1] === 'function' ? args[1] : args[2];
    const wrappedCallback = (snapshot) => {
        trackRead(snapshot, `Listen: ${path}`);
        return callback(snapshot);
    };

    if (typeof args[1] === 'function') {
        args[1] = wrappedCallback;
    } else {
        args[2] = wrappedCallback;
    }

    return firestore.onSnapshot(...args);
};

// Tracking Writes
export const setDoc = async (...args) => {
    const path = args[0]?.path || 'unknown';
    console.log(`[Firestore] WRITE | Set | ${path}`);
    const res = await firestore.setDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

export const addDoc = async (...args) => {
    const path = args[0]?._path?.segments?.join('/') || 'unknown';
    console.log(`[Firestore] WRITE | Add | ${path}`);
    const res = await firestore.addDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

export const updateDoc = async (...args) => {
    const path = args[0]?.path || 'unknown';
    console.log(`[Firestore] WRITE | Update | ${path}`);
    const res = await firestore.updateDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

export const deleteDoc = async (...args) => {
    const path = args[0]?.path || 'unknown';
    console.log(`[Firestore] WRITE | Delete | ${path}`);
    const res = await firestore.deleteDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

// Batch & Transactions
export const writeBatch = (db) => {
    const batch = firestore.writeBatch(db);
    const originalCommit = batch.commit.bind(batch);
    batch.commit = async () => {
        console.log(`[Firestore] WRITE | Batch Commit`);
        const res = await originalCommit();
        ApiMonitor.recordWrite(1);
        return res;
    };
    return batch;
};

export const runTransaction = async (db, updateFunction) => {
    return firestore.runTransaction(db, async (transaction) => {
        console.log(`[Firestore] WRITE | Transaction Start`);
        const result = await updateFunction(transaction);
        ApiMonitor.recordWrite(1);
        return result;
    });
};

// --- Cache-First Helpers ---

export const getDocCacheFirst = async (ref) => {
    const path = ref?.path || 'unknown';
    try {
        const snap = await firestore.getDocFromCache(ref);
        if (snap.exists()) {
            trackRead(snap, `Doc (CacheFirst): ${path}`);
            return snap;
        }
    } catch (_err) {
        // Cache miss
    }
    const snap = await firestore.getDocFromServer(ref);
    trackRead(snap, `Doc (CacheFirst): ${path}`);
    return snap;
};

export const getDocsCacheFirst = async (q) => {
    const path = q?._query?.path?.segments?.join('/') || 'unknown';
    try {
        const snap = await firestore.getDocsFromCache(q);
        if (!snap.empty) {
            trackRead(snap, `Collection (CacheFirst): ${path}`);
            return snap;
        }
    } catch (_err) {
        // Cache miss
    }
    const snap = await firestore.getDocsFromServer(q);
    trackRead(snap, `Collection (CacheFirst): ${path}`);
    return snap;
};
