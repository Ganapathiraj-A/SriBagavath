import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { useAdminAuth } from './AdminAuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const { isAdmin } = useAdminAuth();
    const [counts, setCounts] = useState({
        registrations: 0,
        purchases: 0,
        donations: 0,
        hasNewPrograms: false,
        hasNewMeetings: false,
        hasNewSatsangs: false,
        hasNewSchedule: false
    });

    // 1. ADMIN LOGIC: Total Pending (Registrations & Bookstore)
    useEffect(() => {
        let unsubAdmin = () => { };

        if (isAdmin) {
            console.log("[NotificationContext] Initializing Admin Transactions Listener");
            const pendingQuery = query(
                collection(db, 'transactions'),
                where('status', '==', 'PENDING')
            );

            unsubAdmin = onSnapshot(pendingQuery, (snapshot) => {
                let regCount = 0;
                let purchaseCount = 0;
                let donationCount = 0;

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.itemType === 'BOOK') {
                        purchaseCount++;
                    } else if (data.itemType === 'DONATION') {
                        donationCount++;
                    } else if (data.itemType === 'PROGRAM') {
                        regCount++;
                    }
                });

                setCounts(prev => ({
                    ...prev,
                    registrations: regCount,
                    purchases: purchaseCount,
                    donations: donationCount
                }));
            }, err => console.error("Admin counts error:", err));
        } else {
            // Reset admin counts when not admin
            setCounts(prev => ({
                ...prev,
                registrations: 0,
                purchases: 0,
                donations: 0
            }));
        }

        return () => {
            console.log("[NotificationContext] Cleaning up Admin listener");
            unsubAdmin();
        };
    }, [isAdmin]);

    // 2. METADATA LOGIC: Check for NEW content across categories - Always active once
    useEffect(() => {
        console.log("[NotificationContext] Initializing Metadata Listener");
        const metadataDocRef = doc(db, 'system', 'metadata');

        const handleMetadata = (data) => {
            if (!data) return;

            // Get last visit times from localStorage
            const getLocalTime = (key) => {
                const val = localStorage.getItem(key);
                return val ? new Date(val).getTime() : 0;
            };

            const getServerTime = (serverVal) => {
                if (!serverVal) return 0;
                if (serverVal.toMillis) return serverVal.toMillis();
                return new Date(serverVal).getTime();
            };

            const vPrograms = getLocalTime('lastVisited_programs');
            const vMeetings = getLocalTime('lastVisited_online_meetings');
            const vSatsangs = getLocalTime('lastVisited_satsangs');
            const vSchedule = getLocalTime('lastVisited_schedule');

            const sPrograms = getServerTime(data.lastUpdated_programs);
            const sMeetings = getServerTime(data.lastUpdated_online_meetings);
            const sSatsangs = getServerTime(data.lastUpdated_satsangs);
            const sSchedule = getServerTime(data.lastUpdated_schedule);

            setCounts(prev => ({
                ...prev,
                hasNewPrograms: sPrograms > vPrograms,
                hasNewMeetings: sMeetings > vMeetings,
                hasNewSatsangs: sSatsangs > vSatsangs,
                hasNewSchedule: sSchedule > vSchedule
            }));
        };

        // Cache-first initial check
        getDocCacheFirst(metadataDocRef).then(snap => {
            if (snap.exists()) handleMetadata(snap.data());
        });

        const unsubMetadata = onSnapshot(metadataDocRef, (snapshot) => {
            if (snapshot.exists()) {
                handleMetadata(snapshot.data());
            }
        }, err => console.error("Metadata counts error:", err));

        return () => {
            console.log("[NotificationContext] Cleaning up Metadata listener");
            unsubMetadata();
        };
    }, []); // Empty dependency array means it only runs once per app lifecycle

    return (
        <NotificationContext.Provider value={counts}>
            {children}
        </NotificationContext.Provider>
    );
};
