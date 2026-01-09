import { db, auth } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, orderBy, where, limit, Timestamp, increment } from 'firebase/firestore';
import { StatsService } from './StatsService';

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
            itemName: data.itemName, // Program Name or "Book Order"
            amount: data.amount,
            status: data.status || 'PENDING', // Allow override (e.g. COMPLETED for offline)
            isOffline: data.isOffline || false,
            offlineRefNo: data.offlineRefNo || "",
            timestamp: Timestamp.now(),
            createdAt: new Date().toISOString(),
            hasImage: !!base64Image,
            ocrText: data.ocrText || "",
            utr: data.utr || null,
            parsedAmount: data.parsedAmount || null,
            itemType: data.itemType || 'PROGRAM', // 'PROGRAM' or 'BOOK'
            // Bookstore specific
            orderItems: data.orderItems || [],
            shippingAddress: data.shippingAddress || null,
            // Additional Fields for Sri Bagavath Registration
            participantCount: data.participantCount || 0,
            primaryApplicant: data.primaryApplicant || {},
            participants: data.participants || [],
            place: data.place || "",
            programId: data.programId || null,
            programDate: data.programDate || null,
            programCity: data.programCity || null,
            deviceId: TransactionService.getDeviceId(),
            userId: userId, // Attach User ID for Security Rules
            userEmail: user ? user.email : null // Explicitly store Gmail ID
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
            // Update Image Stats (Rough estimate of size from Base64 length)
            const sizeInBytes = base64Image.length * 0.75;
            StatsService.recordImage(sizeInBytes).catch(() => { });
        }

        // 3. Update Stats
        if (data.itemType === 'BOOK') {
            StatsService.recordBookOrder(data.amount, true).catch(() => { });
        } else {
            const pCount = data.participantCount || (data.participants?.length) || 1;
            StatsService.recordRegistration(pCount, true).catch(() => { });
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
            // Disable fallback to deviceId for user records as per security requirement
            callback([]);
            return () => { };
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
        const docRef = doc(db, "transactions", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            await deleteDoc(docRef);
            // Also try delete image (fire and forget)
            deleteDoc(doc(db, "transaction_images", id)).catch(e => console.warn("Img delete failed", e));
            // Update Stats (Decrement)
            if (snap.data().itemType === 'BOOK') {
                StatsService.recordBookOrder(snap.data().amount, false).catch(() => { });
            } else {
                const count = snap.data().participantCount || (snap.data().participants?.length) || 1;
                StatsService.recordRegistration(count, false).catch(() => { });
            }
        }
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
            if (d.data().status === 'COMPLETED') {
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
    },

    // Archive Transaction (Move to Storage)
    archiveTransaction: async (id) => {
        try {
            const txRef = doc(db, "transactions", id);
            const txSnap = await getDoc(txRef);

            if (txSnap.exists()) {
                const data = txSnap.data();
                // 1. Copy to archived_transactions
                await setDoc(doc(db, "archived_transactions", id), {
                    ...data,
                    archivedAt: new Date().toISOString()
                });

                // 2. Handle associated image
                const imgRef = doc(db, "transaction_images", id);
                const imgSnap = await getDoc(imgRef);
                if (imgSnap.exists()) {
                    await setDoc(doc(db, "archived_transaction_images", id), imgSnap.data());
                    await deleteDoc(imgRef);
                }

                // 3. Delete from active
                await deleteDoc(txRef);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Archive transaction failed", e);
            throw e;
        }
    },

    // Archive Program (Move to Storage)
    archiveProgram: async (id) => {
        try {
            const progRef = doc(db, "programs", id);
            const progSnap = await getDoc(progRef);

            if (progSnap.exists()) {
                const data = progSnap.data();
                // 1. Copy to archived_programs
                await setDoc(doc(db, "archived_programs", id), {
                    ...data,
                    archivedAt: new Date().toISOString()
                });

                // 2. Handle associated banner
                const bannerRef = doc(db, "program_banners", id);
                const bannerSnap = await getDoc(bannerRef);
                if (bannerSnap.exists()) {
                    await setDoc(doc(db, "archived_program_banners", id), bannerSnap.data());
                    await deleteDoc(bannerRef);
                }

                // 3. Delete from active
                await deleteDoc(progRef);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Archive program failed", e);
            throw e;
        }
    }
};
