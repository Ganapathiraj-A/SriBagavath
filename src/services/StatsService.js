import { db } from '@/firebase';
import { doc, updateDoc, increment, setDoc, getDocs, collection, deleteDoc, Timestamp } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';

export const StatsService = {
    // 1. Overall Totals (Programs, Registrations, Images, Size)
    // Images and Size are updated whenever a banner or transaction image is saved
    updateTotals: async (updates) => {
        const ref = doc(db, "system_stats", "totals");
        try {
            await updateDoc(ref, updates);
        } catch (_err) {
            // If document doesn't exist, create it
            await setDoc(ref, updates, { merge: true });
        }
    },

    // 2. Track Participants (Overall)
    recordRegistration: async (count, isNew = true) => {
        const val = isNew ? count : -count;
        await StatsService.updateTotals({
            totalParticipants: increment(val)
        });
    },

    // 2.1 Track Book Order
    recordBookOrder: async (amount, isNew = true) => {
        const countVal = isNew ? 1 : -1;
        const amountVal = isNew ? amount : -amount;
        await StatsService.updateTotals({
            totalBookOrders: increment(countVal),
            totalBookRevenue: increment(amountVal)
        });
    },

    // 3. Track Program
    recordProgram: async (isNew = true) => {
        const val = isNew ? 1 : -1;
        await StatsService.updateTotals({
            totalPrograms: increment(val)
        });
    },

    // 4. Image Stats (Separated)
    recordImage: async (sizeInBytes, type = 'RECEIPT') => {
        const sizeInMB = sizeInBytes / (1024 * 1024);
        const updates = {
            totalImageSizeMB: increment(sizeInMB)
        };
        if (type === 'BANNER') {
            updates.totalBanners = increment(sizeInBytes >= 0 ? 1 : -1);
        } else if (type === 'BOOK_COVER') {
            updates.totalBookCoverSizeMB = increment(sizeInMB);
            updates.totalBookCovers = increment(sizeInBytes >= 0 ? 1 : -1);
        } else {
            updates.totalReceipts = increment(sizeInBytes >= 0 ? 1 : -1);
        }
        await StatsService.updateTotals(updates);
    },

    // 6. Recalculate everything from scratch
    recalculateTotals: async () => {
        console.log("Starting recalculation...");
        try {
            // A. Count Programs (Active + Archived)
            const progsSnap = await getDocs(collection(db, "programs"));
            const archivedProgsSnap = await getDocs(collection(db, "archived_programs"));
            const totalPrograms = progsSnap.size + archivedProgsSnap.size;

            // B. Count Participants & Books (Active + Archived)
            const txSnap = await getDocs(collection(db, "transactions"));
            const archivedTxSnap = await getDocs(collection(db, "archived_transactions"));

            let totalParticipants = 0;
            let totalBookOrders = 0;
            let totalBookRevenue = 0;

            const processTxDoc = (doc) => {
                const d = doc.data();
                if (d.itemType === 'BOOK' || d.itemType === 'MAGAZINE_SUBSCRIPTION') {
                    totalBookOrders++;
                    totalBookRevenue += (d.amount || 0);
                } else {
                    totalParticipants += (d.participantCount || d.participants?.length || 1);
                }
            };

            txSnap.docs.forEach(processTxDoc);
            archivedTxSnap.docs.forEach(processTxDoc);

            // C. Count Images & Size (Active + Archived)
            const bannersSnap = await getDocs(collection(db, "program_banners"));
            const archivedBannersSnap = await getDocs(collection(db, "archived_program_banners"));

            const receiptsSnap = await getDocs(collection(db, "transaction_images"));
            const archivedReceiptsSnap = await getDocs(collection(db, "archived_transaction_images"));

            const onlineBannersSnap = await getDocs(collection(db, "online_meeting_banners"));
            const satsangBannersSnap = await getDocs(collection(db, "satsang_banners"));
            const bookCoversSnap = await getDocs(collection(db, "book_covers"));

            let totalImageSizeMB = 0;
            let totalBookCoverSizeMB = 0;
            const processedBannerIds = new Set();

            const processBannerDoc = (d) => {
                const data = d.data();
                const content = data.base64 || data.banner || data.image || data.url || data.programBanner;
                if (content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                    processedBannerIds.add(d.id);
                }
            };

            const processReceiptDoc = (d) => {
                const data = d.data();
                const content = data.base64 || data.banner || data.image || data.url || data.receipt;
                if (content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                }
            };

            bannersSnap.docs.forEach(processBannerDoc);
            archivedBannersSnap.docs.forEach(processBannerDoc);

            onlineBannersSnap.docs.forEach(processBannerDoc);
            satsangBannersSnap.docs.forEach(processBannerDoc);

            // Scan Legacy Banners in Programs (Active + Archived)
            const allProgDocs = [...progsSnap.docs, ...archivedProgsSnap.docs];
            allProgDocs.forEach(d => {
                const data = d.data();
                const content = data.programBanner || data.banner;
                if (!processedBannerIds.has(d.id) && content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                    processedBannerIds.add(d.id);
                }
            });

            receiptsSnap.docs.forEach(processReceiptDoc);
            archivedReceiptsSnap.docs.forEach(processReceiptDoc);

            bookCoversSnap.docs.forEach(d => {
                const data = d.data();
                const content = data.cover || data.image || data.url;
                if (content && typeof content === 'string') {
                    totalBookCoverSizeMB += (content.length * 0.75) / (1024 * 1024);
                }
            });

            totalImageSizeMB += totalBookCoverSizeMB; // Add to global total for health limits

            const newTotals = {
                totalPrograms,
                totalParticipants,
                totalBanners: processedBannerIds.size,
                totalOnlineBanners: onlineBannersSnap.size,
                totalSatsangBanners: satsangBannersSnap.size,
                totalBookCovers: bookCoversSnap.size,
                totalReceipts: receiptsSnap.size + archivedReceiptsSnap.size,
                totalImageSizeMB,
                totalBookCoverSizeMB,
                totalBookOrders,
                totalBookRevenue,
                updatedAt: Timestamp.now()
            };

            console.log("New Totals Calculated (including archives):", newTotals);

            const ref = doc(db, "system_stats", "totals");
            await setDoc(ref, newTotals, { merge: true });
            return true;
        } catch (_err) {
            console.error("Recalculate failed", _err);
            throw _err;
        }
    },

    // 7. Clear EVERYTHING (Extreme caution)
    clearAllData: async () => {
        try {
            const collections = ["programs", "program_banners", "transactions", "transaction_images", "online_meetings", "online_meeting_banners", "satsangs", "satsang_banners", "book_covers"];

            for (const colName of collections) {
                const snap = await getDocs(collection(db, colName));
                // Note: This is client-side batching, fine for small datasets
                for (const d of snap.docs) {
                    await deleteDoc(d.ref);
                }
            }

            // Reset Stats
            await setDoc(doc(db, "system_stats", "totals"), {
                totalPrograms: 0,
                totalParticipants: 0,
                totalBanners: 0,
                totalOnlineBanners: 0,
                totalSatsangBanners: 0,
                totalBookCovers: 0,
                totalReceipts: 0,
                totalImageSizeMB: 0,
                totalBookCoverSizeMB: 0,
                totalUniqueDevices: 0
            });

            // Optional: Reset Geo Stats? User usually wants counts reset too
            await setDoc(doc(db, "geo_stats", "login_counts"), { counts: {}, monthly: {} });

            return true;
        } catch (_err) {
            console.error("Clear all failed", _err);
            throw _err;
        }
    },

    // 5. User Tracking (Today/Past Month & Geographic)
    trackUserLogin: async (force = false) => {
        try {
            const today = getLocalDateString();
            const month = today.substring(0, 7);
            const sessionKey = `last_stat_log_${today}`;
            const alreadyLoggedToday = localStorage.getItem(sessionKey);

            if (!alreadyLoggedToday || force) {
                console.log(`Tracking user login (force=${force})...`);

                // 1. Update Daily, Monthly & Total Counts (Guaranteed)
                try {
                    // Daily doc
                    const dailyRef = doc(db, "system_stats", `daily_${today}`);
                    await setDoc(dailyRef, { count: increment(1) }, { merge: true });

                    // Monthly doc (New: for redundant month tracking)
                    const monthlyRef = doc(db, "system_stats", `monthly_${month}`);
                    await setDoc(monthlyRef, { count: increment(1) }, { merge: true });

                    // Overall totals
                    await StatsService.updateTotals({ totalUniqueDevices: increment(1) });

                    localStorage.setItem(sessionKey, "true");
                    localStorage.removeItem('last_stat_log');
                } catch (_err) {
                    console.error("Core count update failed:", _err);
                }

                // 2. Geo Tracking (With Fallback)
                let locationKey = "Unknown";
                try {
                    const response = await fetch('https://ipapi.co/json/').catch(() => null);
                    if (response && response.ok) {
                        const data = await response.json();
                        const district = data.city || data.region || "Unknown";
                        const country = data.country_name || "Unknown";
                        const isIndia = data.country_code === 'IN';
                        locationKey = isIndia ? district : country;
                    }
                } catch (_err) {
                    console.warn("Geo lookup failed, using fallback:", _err);
                }

                try {
                    const geoRef = doc(db, "geo_stats", "login_counts");
                    const updates = {};
                    updates[`counts.${locationKey}`] = increment(1);
                    updates[`monthly.${month}.${locationKey}`] = increment(1);

                    // Use updateDoc for dot notation safety
                    await updateDoc(geoRef, updates).catch(async (err) => {
                        if (err.code === 'not-found') {
                            await setDoc(geoRef, { counts: { [locationKey]: 1 }, monthly: { [month]: { [locationKey]: 1 } } }, { merge: true });
                        } else {
                            throw err;
                        }
                    });
                } catch (_err) {
                    console.error("Geo recording failed:", _err);
                }
            } else {
                console.log("User already tracked for today.");
            }
        } catch (_err) {
            console.error("trackUserLogin overall failure:", _err);
        }
    }
};
