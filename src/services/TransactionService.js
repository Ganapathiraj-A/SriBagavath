import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, orderBy, where, limit, Timestamp } from 'firebase/firestore';

import { auth } from '../firebase';

export const TransactionService = {
    // Helper to get persistent device ID (Legacy/Fallback)
    getDeviceId: () => {
        let id = localStorage.getItem('sbb_device_id');
        if (!id) {
            id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sbb_device_id', id);
        }
        return id;
    },

    // Record a new transaction (Split Storage: Meta + Image)
    recordTransaction: async (data, base64Image) => {
        const newDocRef = doc(collection(db, "transactions"));
        const txId = newDocRef.id;

        const user = auth.currentUser;
        const userId = user ? user.uid : null;

        const txData = {
            id: txId,
            itemName: data.itemName, // Program Name
            amount: data.amount,
            status: 'PENDING', // PENDING, REGISTERED, HOLD, BNK_VERIFIED, REJECTED
            timestamp: Timestamp.now(),
            hasImage: !!base64Image,
            ocrText: data.ocrText || "",
            parsedAmount: data.parsedAmount || null,
            // Additional Fields for Sri Bagavath Registration
            participantCount: data.participantCount || 1,
            primaryApplicant: data.primaryApplicant || {},
            participants: data.participants || [],
            place: data.place || "",
            programId: data.programId || null, // Save Program ID
            programDate: data.programDate || null,
            programCity: data.programCity || null,
            deviceId: TransactionService.getDeviceId(),
            userId: userId // Attach User ID for Security Rules
        };

        // 1. Write Meta
        await setDoc(newDocRef, txData);

        // 2. Write Image (if present)
        if (base64Image) {
            const imgDocRef = doc(collection(db, "transaction_images"), txId);
            await setDoc(imgDocRef, {
                id: txId,
                base64: base64Image,
                userId: userId // Attach User ID
            });
        }

        return txId;
    },

    // Get live stream of transactions (ADMIN)
    streamTransactions: (callback, onError) => {
        const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
        return onSnapshot(q, (snapshot) => {
            const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(txs);
        }, (error) => {
            if (onError) onError(error);
            else console.error("Stream Error", error);
        });
    },

    // Get live stream of USER transactions (Support Account-based Recovery)
    streamUserTransactions: (callback) => {
        const user = auth.currentUser;
        let q;

        if (user && !user.isAnonymous) {
            // Priority 1: Registered with Account (Persists after Reinstall)
            q = query(collection(db, "transactions"), where("userId", "==", user.uid));
        } else {
            // Priority 2: Device-based (Lost on Reinstall/Clear Data)
            const dId = TransactionService.getDeviceId();
            q = query(collection(db, "transactions"), where("deviceId", "==", dId));
        }

        return onSnapshot(q, (snapshot) => {
            const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Client-side sort to avoid composite index requirement
            txs.sort((a, b) => {
                const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                return tB - tA;
            });
            callback(txs);
        }, (error) => {
            console.error("User Stream Error", error);
            callback([]); // Return empty list on error to stop loading
        });
    },

    // Update status
    updateStatus: async (id, newStatus, comments) => {
        const ref = doc(db, "transactions", id);
        const updates = { status: newStatus };
        if (comments) updates.comments = comments;
        await updateDoc(ref, updates);
    },

    // Fetch Base64 Image on demand
    getImage: async (id) => {
        const ref = doc(db, "transaction_images", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return snap.data().base64;
        }
        return null;
    },

    // Delete Transaction
    deleteTransaction: async (id) => {
        await deleteDoc(doc(db, "transactions", id));
        // Also try delete image (fire and forget)
        deleteDoc(doc(db, "transaction_images", id)).catch(e => console.warn("Img delete failed", e));
    },

    // Delete All Verified (Batch)
    deleteAllVerified: async () => {
        // Simple client-side filter and batch delete
        const q = query(collection(db, "transactions"), orderBy("status")); // Needs index?
        // Fallback to client filter if index issue
        // Actually, let's just fetch all and filter client side to avoid index creation delay
        const snap = await getDocs(collection(db, "transactions"));

        const { writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(db);
        let count = 0;

        snap.docs.forEach(d => {
            if (d.data().status === 'BNK_VERIFIED') {
                batch.delete(d.ref);
                deleteDoc(doc(db, "transaction_images", d.id)).catch(() => { });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }
        return count;
    },

    // Check if registrations exist for a program
    hasRegistrationsForProgram: async (programId) => {
        try {
            const q = query(collection(db, "transactions"), where("programId", "==", programId), limit(1));
            const snap = await getDocs(q);
            return !snap.empty;
        } catch (e) {
            console.error("Error checking registrations", e);
            return false;
        }
    }
};
