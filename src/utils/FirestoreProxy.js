import * as firestore from 'firebase/firestore';
import ApiMonitor from './ApiMonitor';

// Re-export everything from the original SDK
export * from 'firebase/firestore';

// Helper to track reads from snapshots
const trackRead = (snapshot) => {
    if (!snapshot) return;
    const count = snapshot.size !== undefined ? snapshot.size : 1;
    ApiMonitor.recordRead(count);
};

// Override getDoc
export const getDoc = async (...args) => {
    const snap = await firestore.getDoc(...args);
    if (snap.exists()) ApiMonitor.recordRead(1);
    return snap;
};

// Override getDocs
export const getDocs = async (...args) => {
    const snap = await firestore.getDocs(...args);
    ApiMonitor.recordRead(snap.size);
    return snap;
};

// Override onSnapshot
export const onSnapshot = (...args) => {
    const callback = typeof args[1] === 'function' ? args[1] : args[2];
    const wrappedCallback = (snapshot) => {
        // docChanges is only on QuerySnapshot
        if (snapshot.docChanges) {
            const changes = snapshot.docChanges();
            if (changes.length > 0) {
                ApiMonitor.recordRead(changes.length);
            } else if (!snapshot.empty && changes.length === 0) {
                // Initial call might have 0 changes but existing data
                ApiMonitor.recordRead(snapshot.size);
            }
        } else {
            // It's a DocumentSnapshot
            if (snapshot.exists()) {
                ApiMonitor.recordRead(1);
            }
        }
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

// Batch & Transactions
export const writeBatch = (db) => {
    const batch = firestore.writeBatch(db);
    const originalCommit = batch.commit.bind(batch);
    batch.commit = async () => {
        const res = await originalCommit();
        // Note: Batch size isn't easily accessible, but we can assume at least 1 write
        ApiMonitor.recordWrite(1);
        return res;
    };
    return batch;
};

export const runTransaction = async (db, updateFunction) => {
    return firestore.runTransaction(db, async (transaction) => {
        const result = await updateFunction(transaction);
        // Transaction tracking is complex as it involves reads and writes.
        // For simplicity, we record at least 1 write if successful.
        ApiMonitor.recordWrite(1);
        return result;
    });
};
