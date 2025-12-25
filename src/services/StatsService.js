import { db } from '../firebase';
import { doc, updateDoc, increment, setDoc, getDoc, getDocs, collection, deleteDoc, Timestamp } from 'firebase/firestore';

export const StatsService = {
    // 1. Overall Totals (Programs, Registrations, Images, Size)
    // Images and Size are updated whenever a banner or transaction image is saved
    updateTotals: async (updates) => {
        const ref = doc(db, "system_stats", "totals");
        try {
            await updateDoc(ref, updates);
        } catch (e) {
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
            updates.totalBanners = increment(1);
        } else {
            updates.totalReceipts = increment(1);
        }
        await StatsService.updateTotals(updates);
    },

    // 6. Recalculate everything from scratch
    recalculateTotals: async () => {
        console.log("Starting recalculation...");
        try {
            // A. Count Programs
            const progsSnap = await getDocs(collection(db, "programs"));
            const totalPrograms = progsSnap.size;

            // B. Count Participants
            const txSnap = await getDocs(collection(db, "transactions"));
            let totalParticipants = 0;
            txSnap.docs.forEach(doc => {
                const d = doc.data();
                totalParticipants += (d.participantCount || d.participants?.length || 1);
            });

            // C. Count Images & Size
            const bannersSnap = await getDocs(collection(db, "program_banners"));
            const totalBanners = bannersSnap.size;

            const receiptsSnap = await getDocs(collection(db, "transaction_images"));
            const totalReceipts = receiptsSnap.size;

            const onlineBannersSnap = await getDocs(collection(db, "online_meeting_banners"));
            const sathsangBannersSnap = await getDocs(collection(db, "sathsang_banners"));

            console.log(`Found ${bannersSnap.size} records in program_banners.`);
            console.log(`Found ${onlineBannersSnap.size} records in online_meeting_banners.`);
            console.log(`Found ${sathsangBannersSnap.size} records in sathsang_banners.`);

            let totalImageSizeMB = 0;
            const processedBannerIds = new Set();

            // 1. Scan Dedicated Banners
            bannersSnap.docs.forEach(d => {
                const data = d.data();
                const content = data.base64 || data.banner || data.image || data.url || data.programBanner;
                if (content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                    processedBannerIds.add(d.id);
                }
            });

            // 1.1 Scan Online Meeting Banners
            onlineBannersSnap.docs.forEach(d => {
                const data = d.data();
                const content = data.banner || data.base64;
                if (content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                }
            });

            // 1.2 Scan Sathsang Banners
            sathsangBannersSnap.docs.forEach(d => {
                const data = d.data();
                const content = data.banner || data.base64;
                if (content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                }
            });

            // 2. Scan Legacy Banners in Programs (if not already processed as dedicated)
            progsSnap.docs.forEach(d => {
                const data = d.data();
                const content = data.programBanner || data.banner;
                if (!processedBannerIds.has(d.id) && content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                    processedBannerIds.add(d.id);
                }
            });

            // 3. Scan Receipts
            receiptsSnap.docs.forEach(d => {
                const data = d.data();
                const content = data.base64 || data.banner || data.image || data.url || data.receipt;
                if (content && typeof content === 'string') {
                    totalImageSizeMB += (content.length * 0.75) / (1024 * 1024);
                }
            });

            const newTotals = {
                totalPrograms,
                totalParticipants,
                totalBanners: processedBannerIds.size,
                totalOnlineBanners: onlineBannersSnap.size,
                totalSathsangBanners: sathsangBannersSnap.size,
                totalReceipts,
                totalImageSizeMB,
                updatedAt: Timestamp.now()
            };

            console.log("New Totals Calculated:", newTotals);

            const ref = doc(db, "system_stats", "totals");
            await setDoc(ref, newTotals, { merge: true });
            return true;
        } catch (e) {
            console.error("Recalculate failed", e);
            throw e;
        }
    },

    // 7. Clear EVERYTHING (Extreme caution)
    clearAllData: async () => {
        try {
            const collections = ["programs", "program_banners", "transactions", "transaction_images", "online_meetings", "online_meeting_banners", "sathsangs", "sathsang_banners"];

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
                totalSathsangBanners: 0,
                totalReceipts: 0,
                totalImageSizeMB: 0,
                totalUniqueDevices: 0
            });

            // Optional: Reset Geo Stats? User usually wants counts reset too
            await setDoc(doc(db, "geo_stats", "login_counts"), { counts: {}, monthly: {} });

            return true;
        } catch (e) {
            console.error("Clear all failed", e);
            throw e;
        }
    },

    // 5. User Tracking (Today/Past Month & Geographic)
    trackUserLogin: async (force = false) => {
        try {
            const today = new Date().toISOString().split('T')[0];
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
                } catch (e) {
                    console.error("Core count update failed:", e);
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
                } catch (e) {
                    console.warn("Geo lookup failed, using fallback:", e);
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
                } catch (e) {
                    console.error("Geo recording failed:", e);
                }
            } else {
                console.log("User already tracked for today.");
            }
        } catch (e) {
            console.error("trackUserLogin overall failure:", e);
        }
    }
};
