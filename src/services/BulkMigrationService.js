import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, limit } from '@/utils/FirestoreProxy';
import { TransactionService } from './TransactionService';

/**
 * BulkMigrationService
 * Handles the migration of legacy Base64 images from Firestore to Cloud Storage.
 */
export const BulkMigrationService = {
    /**
     * Common migration logic for a single item
     */
    migrateItem: async (id, base64, pathPrefix, fileName, updateDocRef) => {
        try {
            // 1. Upload to Storage
            const downloadUrl = await TransactionService.uploadBase64ToStorage(id, base64, pathPrefix, fileName);

            // 2. Update the parent document
            await updateDoc(updateDocRef, {
                imageUrl: downloadUrl,
                hasImage: true,
                // We keep the legacy field for a while for safety, but mark it as migrated
                storage_migrated: true
            });

            return { success: true, id };
        } catch (error) {
            console.error(`Migration failed for ${id}:`, error);
            return { success: false, id, error: error.message };
        }
    },

    /**
     * Migrate Transaction Receipts
     * Collection: transaction_images -> Storage: transactions/
     */
    migrateTransactions: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'transaction_images'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const txId = docSnap.id;
            const base64 = data.base64;

            if (base64) {
                const parentRef = doc(db, 'transactions', txId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const res = await BulkMigrationService.migrateItem(txId, base64, 'transactions', 'image.jpg', parentRef);
                    results.push(res);
                } else {
                    results.push({ success: false, id: txId, error: 'Parent transaction document not found' });
                }
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: txId });
        }
        return results;
    },

    /**
     * Migrate Program Banners
     * Collection: program_banners -> Storage: banners/
     */
    migrateProgramBanners: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'program_banners'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const progId = docSnap.id;
            const base64 = data.base64;

            if (base64) {
                const parentRef = doc(db, 'programs', progId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const res = await BulkMigrationService.migrateItem(progId, base64, 'banners', 'banner.jpg', parentRef);
                    results.push(res);
                } else {
                    results.push({ success: false, id: progId, error: 'Parent program document not found' });
                }
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: progId });
        }
        return results;
    },

    /**
     * Migrate Teacher Photos
     * Collection: daily_zoom_teachers (internal field 'image') -> Storage: teachers/
     */
    migrateTeachers: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'daily_zoom_teachers'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const teacherId = docSnap.id;
            const base64 = data.image; // Internal field name for teachers

            if (base64 && !base64.startsWith('http')) {
                const parentRef = doc(db, 'daily_zoom_teachers', teacherId);
                const res = await BulkMigrationService.migrateItem(teacherId, base64, 'teachers', 'photo.jpg', parentRef);
                results.push(res);
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: teacherId });
        }
        return results;
    },

    /**
     * Migrate Satsang Banners
     * Collection: satsang_banners -> Storage: satsang_banners/
     */
    migrateSatsangBanners: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'satsang_banners'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const masterId = docSnap.id;
            const base64 = data.base64;

            if (base64) {
                const parentRef = doc(db, 'satsangs', masterId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const res = await BulkMigrationService.migrateItem(masterId, base64, 'satsang_banners', 'banner.jpg', parentRef);
                    results.push(res);
                } else {
                    results.push({ success: false, id: masterId, error: 'Parent satsang document not found' });
                }
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: masterId });
        }
        return results;
    },

    /**
     * Migrate Online Meeting Banners
     * Collection: online_meeting_banners -> Storage: online_meeting_banners/
     */
    migrateOnlineMeetingBanners: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'online_meeting_banners'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const meetingId = docSnap.id;
            const base64 = data.base64;

            if (base64) {
                const parentRef = doc(db, 'online_meetings', meetingId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const res = await BulkMigrationService.migrateItem(meetingId, base64, 'online_meeting_banners', 'banner.jpg', parentRef);
                    results.push(res);
                } else {
                    results.push({ success: false, id: meetingId, error: 'Parent online meeting document not found' });
                }
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: meetingId });
        }
        return results;
    },

    /**
     * Migrate Book Covers
     * Collection: book_covers -> Storage: book_covers/
     */
    migrateBookCovers: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'book_covers'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const bookId = docSnap.id;
            const base64 = data.base64;

            if (base64) {
                const parentRef = doc(db, 'books', bookId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const res = await BulkMigrationService.migrateItem(bookId, base64, 'book_covers', 'cover.jpg', parentRef);
                    results.push(res);
                } else {
                    results.push({ success: false, id: bookId, error: 'Parent book document not found' });
                }
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: bookId });
        }
        return results;
    }
};
