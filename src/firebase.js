import { initializeApp } from 'firebase/app';
import * as firestore from 'firebase/firestore';
import ApiMonitor from './utils/ApiMonitor';

// Firebase configuration using environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = firestore.getFirestore(app);

// --- Firestore Proxy / Monitoring Layer ---
const lastLoggedDocs = new Map();

const trackRead = (snapshot, context = 'Query') => {
    if (!snapshot) return;
    const isCache = snapshot.metadata?.fromCache;
    const source = isCache ? 'CACHE' : 'SERVER';
    let count = 0;

    if (snapshot.docChanges) {
        const changes = snapshot.docChanges();
        count = changes.length > 0 ? changes.length : snapshot.size;
        if (count === 0 && !snapshot.empty) count = snapshot.size;
        if (snapshot.empty && !isCache) count = 1;
    } else {
        count = snapshot.exists() ? 1 : 0;
    }

    const key = `${context}_${snapshot._query?.path?.segments?.join('/') || ''}`;
    if (!isCache && snapshot.docChanges && snapshot.docChanges().length === 0 && lastLoggedDocs.get(key) === count) {
        return;
    }

    lastLoggedDocs.set(key, count);
    const type = isCache ? 'recordCacheRead' : 'recordServerRead';
    ApiMonitor[type](count);
    console.log(`[Firestore] READ | ${source} | ${context} | Docs: ${count}`);
};

// Re-export standard members
export const collection = firestore.collection;
export const doc = firestore.doc;
export const query = firestore.query;
export const orderBy = firestore.orderBy;
export const where = firestore.where;
export const limit = firestore.limit;
export const startAfter = firestore.startAfter;
export const startAt = firestore.startAt;
export const endAt = firestore.endAt;
export const endBefore = firestore.endBefore;
export const Timestamp = firestore.Timestamp;
export const serverTimestamp = firestore.serverTimestamp;
export const increment = firestore.increment;
export const arrayUnion = firestore.arrayUnion;
export const arrayRemove = firestore.arrayRemove;
export const getDocFromCache = firestore.getDocFromCache;
export const getDocsFromCache = firestore.getDocsFromCache;
export const getDocFromServer = firestore.getDocFromServer;
export const getDocsFromServer = firestore.getDocsFromServer;
export const getCountFromServer = firestore.getCountFromServer;
export const enableMultiTabIndexedDbPersistence = firestore.enableMultiTabIndexedDbPersistence;
export const getFirestore = firestore.getFirestore;

// Proxied versions
export const getDoc = async (...args) => {
    const snap = await firestore.getDoc(...args);
    const path = args[0]?.path || 'unknown';
    trackRead(snap, `Doc: ${path}`);
    return snap;
};

export const getDocs = async (...args) => {
    const snap = await firestore.getDocs(...args);
    const path = args[0]?._query?.path?.segments?.join('/') || 'unknown';
    trackRead(snap, `Collection: ${path}`);
    return snap;
};

export const onSnapshot = (...args) => {
    const path = args[0]?.path || args[0]?._query?.path?.segments?.join('/') || 'unknown';
    const nextIndex = typeof args[1] === 'function' ? 1 : 2;
    const originalNext = args[nextIndex];

    const wrappedNext = (snapshot) => {
        trackRead(snapshot, `Listen: ${path}`);
        if (originalNext) return originalNext(snapshot);
    };

    const newArgs = [...args];
    newArgs[nextIndex] = wrappedNext;

    return firestore.onSnapshot(...newArgs);
};

export const setDoc = async (...args) => {
    const res = await firestore.setDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

export const addDoc = async (...args) => {
    const res = await firestore.addDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

export const updateDoc = async (...args) => {
    const res = await firestore.updateDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

export const deleteDoc = async (...args) => {
    const res = await firestore.deleteDoc(...args);
    ApiMonitor.recordWrite(1);
    return res;
};

export const writeBatch = (db) => {
    const batch = firestore.writeBatch(db);
    const originalCommit = batch.commit.bind(batch);
    batch.commit = async () => {
        const res = await originalCommit();
        ApiMonitor.recordWrite(1);
        return res;
    };
    return batch;
};

export const runTransaction = async (db, updateFunction) => {
    return firestore.runTransaction(db, async (transaction) => {
        const result = await updateFunction(transaction);
        ApiMonitor.recordWrite(1);
        return result;
    });
};

// --- Cache-First Helpers ---
export const getDocCacheFirst = async (ref) => {
    try {
        const snap = await firestore.getDocFromCache(ref);
        if (snap.exists()) {
            trackRead(snap, `Doc (CF): ${ref.path}`);
            return snap;
        }
    } catch (_e) {}
    const snap = await firestore.getDocFromServer(ref);
    trackRead(snap, `Doc (CF): ${ref.path}`);
    return snap;
};

export const getDocsCacheFirst = async (q) => {
    try {
        const snap = await firestore.getDocsFromCache(q);
        if (!snap.empty) {
            trackRead(snap, "Query (CF)");
            return snap;
        }
    } catch (_e) {}
    const snap = await firestore.getDocsFromServer(q);
    trackRead(snap, "Query (CF)");
    return snap;
};

// --- Auth & Storage & Analytics ---
import { getAuth } from 'firebase/auth';
export const auth = getAuth(app);

import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

import { getAnalytics, isSupported } from 'firebase/analytics';
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

// Enable persistence
if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        console.warn('Persistence failed:', err.code);
    });
}
