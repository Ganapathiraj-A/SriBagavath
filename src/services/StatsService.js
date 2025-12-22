import { db } from '../firebase';
import { doc, updateDoc, increment, setDoc, getDoc, collection, Timestamp } from 'firebase/firestore';

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

    // 4. Image Stats
    recordImage: async (sizeInBytes) => {
        const sizeInMB = sizeInBytes / (1024 * 1024);
        await StatsService.updateTotals({
            totalImages: increment(1),
            totalImageSizeMB: increment(sizeInMB)
        });
    },

    // 5. User Tracking (Today/Past Month & Geographic)
    // This is called on App Launch or Login
    trackUserLogin: async () => {
        try {
            // Get location via IP (Client-side, IP is NOT stored)
            // Using ipapi.co as it supports HTTPS for free
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();

            const district = data.city || "Unknown";
            const country = data.country_name || "Unknown";
            const isIndia = data.country_code === 'IN';
            const locationKey = isIndia ? district : country;

            const today = new Date().toISOString().split('T')[0];
            const month = today.substring(0, 7); // YYYY-MM

            // Increment Daily Unique (Simple implementation: one doc per day)
            // To make it truly unique, we'd need a temp ID or session, 
            // but for "Unique users today" as requested without user data, 
            // we will use a localStorage flag to only count once per device per day.
            const lastSessionDate = localStorage.getItem('last_stat_log');
            if (lastSessionDate !== today) {
                // Update Today's Count
                const dailyRef = doc(db, "system_stats", `daily_${today}`);
                await setDoc(dailyRef, { count: increment(1) }, { merge: true });

                // Update Geo Stats
                const geoRef = doc(db, "geo_stats", "login_counts");
                const updates = {};
                updates[`counts.${locationKey}`] = increment(1);
                updates[`monthly.${month}.${locationKey}`] = increment(1);

                try {
                    await updateDoc(geoRef, updates);
                } catch (e) {
                    await setDoc(geoRef, updates, { merge: true });
                }

                localStorage.setItem('last_stat_log', today);
            }
        } catch (e) {
            console.error("Stats tracking failed:", e);
        }
    }
};
