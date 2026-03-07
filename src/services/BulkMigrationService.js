import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, limit } from '@/utils/FirestoreProxy';
import { TransactionService } from './TransactionService';

/**
 * BulkMigrationService
 * Handles the migration of legacy Base64 images from Firestore to Cloud Storage.
 */
export const BulkMigrationService = {
    /**
     * Shared helper to check if a document is already migrated.
     * Checks storage_migrated flag, imageUrl field, and the data value itself.
     */
    isAlreadyMigrated: (data, value) => {
        if (data.storage_migrated === true) return true;
        if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('http')) return true;
        if (value && typeof value === 'string' && value.startsWith('http')) return true;
        return false;
    },

    /**
     * Common migration logic for a single item
     */
    migrateItem: async (id, base64, pathPrefix, fileName, parentDocRef, sourceDocRef = null, sourceFieldName = 'imageUrl') => {
        try {
            // 1. Ensure base64 is in data_url format for Firebase Storage
            let storageBase64 = base64;
            if (base64 && !base64.startsWith('data:')) {
                // Default to jpeg if prefix is missing
                storageBase64 = `data:image/jpeg;base64,${base64}`;
            }

            // 2. Upload to Storage
            const downloadUrl = await TransactionService.uploadBase64ToStorage(id, storageBase64, pathPrefix, fileName);

            // 3. Update the parent document (usually the main record)
            const parentUpdate = {
                imageUrl: downloadUrl,
                hasImage: true,
                storage_migrated: true
            };
            await updateDoc(parentDocRef, parentUpdate);

            // 4. Update the source document if it's different or needs specific field update
            if (sourceDocRef && sourceDocRef.path !== parentDocRef.path) {
                await updateDoc(sourceDocRef, {
                    [sourceFieldName]: downloadUrl,
                    storage_migrated: true
                });
            } else if (!sourceDocRef && sourceFieldName !== 'imageUrl') {
                // If sourceDocRef is null but fieldName is custom, it means parent == source
                await updateDoc(parentDocRef, {
                    [sourceFieldName]: downloadUrl
                });
            }

            return { success: true, id };
        } catch (error) {
            console.error(`Migration failed for ${id}:`, error);
            return { success: false, id, error: error.message };
        }
    },

    /**
     * Migrate Transaction Receipts
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

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'transactions', txId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const parentData = parentSnap.data();
                    // Additional check on parent doc if needed
                    if (!BulkMigrationService.isAlreadyMigrated(parentData, parentData.imageUrl)) {
                        const res = await BulkMigrationService.migrateItem(txId, base64, 'transactions', 'image.jpg', parentRef, docSnap.ref, 'base64');
                        results.push(res);
                    }
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
     */
    migrateProgramBanners: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'program_banners'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const progId = docSnap.id;
            const base64 = data.banner;

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'programs', progId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const parentData = parentSnap.data();
                    if (!BulkMigrationService.isAlreadyMigrated(parentData, parentData.imageUrl)) {
                        const res = await BulkMigrationService.migrateItem(progId, base64, 'banners', 'banner.jpg', parentRef, docSnap.ref, 'banner');
                        results.push(res);
                    }
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
     */
    migrateTeachers: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'daily_zoom_teachers'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const teacherId = docSnap.id;
            const base64 = data.image;

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'daily_zoom_teachers', teacherId);
                const res = await BulkMigrationService.migrateItem(teacherId, base64, 'teachers', 'photo.jpg', parentRef, null, 'image');
                results.push(res);
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: teacherId });
        }
        return results;
    },

    /**
     * Migrate Satsang Banners
     */
    migrateSatsangBanners: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'satsang_banners'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const masterId = docSnap.id;
            const base64 = data.banner;

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'satsangs', masterId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const parentData = parentSnap.data();
                    if (!BulkMigrationService.isAlreadyMigrated(parentData, parentData.imageUrl)) {
                        const res = await BulkMigrationService.migrateItem(masterId, base64, 'satsang_banners', 'banner.jpg', parentRef, docSnap.ref, 'banner');
                        results.push(res);
                    }
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
     */
    migrateOnlineMeetingBanners: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'online_meeting_banners'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const meetingId = docSnap.id;
            const base64 = data.banner;

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'online_meetings', meetingId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const parentData = parentSnap.data();
                    if (!BulkMigrationService.isAlreadyMigrated(parentData, parentData.imageUrl)) {
                        const res = await BulkMigrationService.migrateItem(meetingId, base64, 'online_meeting_banners', 'banner.jpg', parentRef, docSnap.ref, 'banner');
                        results.push(res);
                    }
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
     */
    migrateBookCovers: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'book_covers'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const bookId = docSnap.id;
            const base64 = data.cover;

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'books', bookId);
                const parentSnap = await getDoc(parentRef);

                if (parentSnap.exists()) {
                    const parentData = parentSnap.data();
                    if (!BulkMigrationService.isAlreadyMigrated(parentData, parentData.imageUrl)) {
                        const res = await BulkMigrationService.migrateItem(bookId, base64, 'book_covers', 'cover.jpg', parentRef, docSnap.ref, 'cover');
                        results.push(res);
                    }
                } else {
                    results.push({ success: false, id: bookId, error: 'Parent book document not found' });
                }
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: bookId });
        }
        return results;
    },

    /**
     * Migrate Digital Book Covers
     */
    migrateDigitalBooks: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'digital_book_configs'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const configId = docSnap.id;
            const base64 = data.cover;

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'digital_book_configs', configId);
                const res = await BulkMigrationService.migrateItem(configId, base64, 'digital_books', 'cover.jpg', parentRef, null, 'cover');
                results.push(res);
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: configId });
        }
        return results;
    },

    /**
     * Migrate Audio Book Covers
     */
    migrateAudioBooks: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'audio_books'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const bookId = docSnap.id;
            const base64 = data.image;

            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'audio_books', bookId);
                const res = await BulkMigrationService.migrateItem(bookId, base64, 'audio_books', 'cover.jpg', parentRef, null, 'image');
                results.push(res);
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: bookId });
        }
        return results;
    },

    /**
     * Migrate Daily Zoom Meeting Images
     */
    migrateDailyZoomMeetings: async (onProgress) => {
        const snapshot = await getDocs(collection(db, 'daily_zoom_meetings'));
        const total = snapshot.size;
        let processed = 0;
        const results = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const meetingId = docSnap.id;
            const base64 = data.image;

            // Only migrate if image exists and is not already a URL
            if (base64 && !BulkMigrationService.isAlreadyMigrated(data, base64)) {
                const parentRef = doc(db, 'daily_zoom_meetings', meetingId);
                const res = await BulkMigrationService.migrateItem(meetingId, base64, 'daily_zoom_meetings', 'image.jpg', parentRef, null, 'image');
                results.push(res);
            }

            processed++;
            if (onProgress) onProgress({ processed, total, id: meetingId });
        }
        return results;
    }


};
