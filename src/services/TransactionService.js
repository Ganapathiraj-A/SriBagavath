import { db, auth, storage } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, orderBy, where, limit, Timestamp, writeBatch } from '@/utils/FirestoreProxy';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
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

    // Helper to upload base64 to storage
    uploadBase64ToStorage: async (id, base64Image, pathPrefix = 'transactions', fileName = 'image.jpg') => {
        if (!base64Image) return null;
        try {
            const storageRef = ref(storage, `${pathPrefix}/${id}/${fileName}`);
            // uploadString supports data_url format
            const uploadSnapshot = await uploadString(storageRef, base64Image, 'data_url');
            const downloadUrl = await getDownloadURL(uploadSnapshot.ref);
            return downloadUrl;
        } catch (error) {
            console.error("Storage upload failed", error);
            throw error;
        }
    },

    // Record a new transaction (Atomic Storage: Meta + Image)
    recordTransaction: async (data, base64Image) => {
        const txId = doc(collection(db, "transactions")).id;
        const newDocRef = doc(db, "transactions", txId);

        const user = auth.currentUser;
        const userId = user?.uid;

        if (!userId) {
            throw new Error("Unable to record transaction: User not authenticated.");
        }

        const txData = {
            id: txId,
            itemName: data.itemName || data.programName || "Unknown Item",
            amount: data.amount,
            status: data.status || 'PENDING',
            isOffline: data.isOffline || false,
            offlineRefNo: data.offlineRefNo || "",
            timestamp: Timestamp.now(),
            createdAt: new Date().toISOString(),
            hasImage: !!base64Image,
            ocrText: data.ocrText || "",
            utr: data.utr || null,
            parsedAmount: data.parsedAmount || null,
            itemType: data.itemType || 'PROGRAM',
            orderItems: data.orderItems || [],
            shippingAddress: data.shippingAddress || null,
            participantCount: data.participantCount || 0,
            primaryApplicant: data.primaryApplicant || {},
            participants: data.participants || [],
            place: data.place || "",
            programId: data.programId || null,
            programDate: data.programDate || null,
            programCity: data.programCity || null,
            selectedOptions: data.selectedOptions || [],
            deviceId: TransactionService.getDeviceId(),
            userId: userId,
            userEmail: user ? user.email : null,
            // Razorpay Fields
            paymentSource: data.paymentSource || 'manual',
            razorpayOrderId: data.razorpayOrderId || null,
            razorpayPaymentId: data.razorpayPaymentId || null
        };

        const batch = writeBatch(db);

        // 1. Write Meta (Temporarily hasImage until upload succeeds)
        batch.set(newDocRef, txData);

        // 3. Commit Batch (Meta only)
        await batch.commit();

        // 2. Write Image to Storage (if present)
        if (base64Image) {
            try {
                const downloadUrl = await TransactionService.uploadBase64ToStorage(txId, base64Image);
                await updateDoc(newDocRef, {
                    imageUrl: downloadUrl,
                    hasImage: true
                });

                // Update Image Stats (Rough estimate)
                const sizeInBytes = base64Image.length * 0.75;
                StatsService.recordImage(sizeInBytes).catch(() => { });
            } catch (storageErr) {
                console.error("Storage Error, falling back to Firestore collection (legacy)", storageErr);
                // Fallback to legacy behavior if storage fails
                const imgDocRef = doc(db, "transaction_images", txId);
                await setDoc(imgDocRef, {
                    id: txId,
                    base64: base64Image,
                    userId: userId
                });
            }
        }

        // 4. Update Stats (Async / Non-atomic with TX)
        if (data.itemType === 'BOOK' || data.itemType === 'MAGAZINE_SUBSCRIPTION') {
            StatsService.recordBookOrder(data.amount, true).catch(() => { });
        } else {
            const pCount = data.participantCount || (data.participants?.length) || 1;
            StatsService.recordRegistration(pCount, true).catch(() => { });
        }

        return txId;
    },

    // Get live stream of transactions (ADMIN)
    streamTransactions: (callback, onError) => {
        // Limited to last 100 for performance
        const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(100));
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

    // Fetch Image URL or Base64 on demand
    getImage: async (id) => {
        // 1. Check if it's already in the transaction meta as imageUrl
        const txSnap = await getDoc(doc(db, "transactions", id));
        if (txSnap.exists() && txSnap.data().imageUrl) {
            return txSnap.data().imageUrl;
        }

        // 2. Fallback to legacy collection
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

            // Delete from storage if exists
            try {
                const storageRef = ref(storage, `transactions/${id}/receipt.jpg`);
                await deleteObject(storageRef);
            } catch (e) {
                // If not in storage, try legacy collection
                deleteDoc(doc(db, "transaction_images", id)).catch(e => console.warn("Img delete failed", e));
            }

            // Update Stats (Decrement)
            if (snap.data().itemType === 'BOOK' || snap.data().itemType === 'MAGAZINE_SUBSCRIPTION') {
                StatsService.recordBookOrder(snap.data().amount, false).catch(() => { });
            } else {
                const count = snap.data().participantCount || (snap.data().participants?.length) || 1;
                StatsService.recordRegistration(count, false).catch(() => { });
            }
        }
    },

    // Delete All Verified (Batch)
    deleteAllVerified: async () => {
        // Optimization: Use server-side query to only fetch COMPLETED transactions
        const q = query(collection(db, "transactions"), where("status", "==", "COMPLETED"));
        const snap = await getDocs(q);

        const { writeBatch } = await import('@/utils/FirestoreProxy');
        let batch = writeBatch(db);
        let count = 0;
        let batchCount = 0;

        for (const d of snap.docs) {
            batch.delete(d.ref);
            // Image delete is separate as it's in a different collection
            deleteDoc(doc(db, "transaction_images", d.id)).catch(() => { });
            count++;
            batchCount++;

            if (batchCount >= 499) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

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
        } catch (_err) {
            console.error("Error checking registrations", _err);
            return false;
        }
    },

    // Get all registrations for a program (for counting options)
    getProgramRegistrations: async (programId) => {
        try {
            const q = query(collection(db, "transactions"), where("programId", "==", programId));
            const snap = await getDocs(q);
            return snap.docs.map(doc => doc.data());
        } catch (_err) {
            console.error("Error fetching program registrations", _err);
            return [];
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
        } catch (_err) {
            console.error("Archive transaction failed", _err);
            throw _err;
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
        } catch (_err) {
            console.error("Archive program failed", _err);
            throw _err;
        }
    },

    // Upload/Attach Receipt to existing transaction (Atomic Update)
    uploadReceipt: async (id, base64Image) => {
        const txRef = doc(db, "transactions", id);
        const imgRef = doc(db, "transaction_images", id);

        const user = auth.currentUser;
        const userId = user ? user.uid : null;

        // 1. Update Meta
        await updateDoc(txRef, {
            hasImage: true,
            updatedAt: new Date().toISOString()
        });

        // 2. Write Image to Storage
        try {
            const downloadUrl = await TransactionService.uploadBase64ToStorage(id, base64Image);
            await updateDoc(txRef, { imageUrl: downloadUrl });
        } catch (storageErr) {
            console.error("Storage Error, falling back to Firestore (legacy)", storageErr);
            await setDoc(imgRef, {
                id: id,
                base64: base64Image,
                userId: userId
            });
        }

        // 4. Update Image Stats
        const sizeInBytes = base64Image.length * 0.75;
        StatsService.recordImage(sizeInBytes).catch(() => { });

        return true;
    },

    // Update transaction details (UTR, Amount, ParsedAmount etc)
    updateTransactionDetails: async (id, updates) => {
        const ref = doc(db, "transactions", id);
        await updateDoc(ref, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    }
};
