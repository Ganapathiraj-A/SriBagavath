import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useUnseenCounts = () => {
    const [counts, setCounts] = useState({
        registrations: 0,
        transactions: 0,
        hasNewPrograms: false,
        hasNewMeetings: false,
        hasNewSatsangs: false,
        hasNewSchedule: false
    });

    useEffect(() => {
        // 1. ADMIN LOGIC: Total Pending (Registrations & Bookstore)
        const pendingQuery = query(
            collection(db, 'transactions'),
            where('status', '==', 'PENDING')
        );

        const unsubAdmin = onSnapshot(pendingQuery, (snapshot) => {
            let regCount = 0;
            let bookCount = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.itemType === 'BOOK' || data.itemType === 'DONATION') {
                    bookCount++;
                } else if (data.itemType === 'PROGRAM') {
                    regCount++;
                }
            });

            setCounts(prev => ({
                ...prev,
                registrations: regCount,
                transactions: bookCount
            }));
        }, err => console.error("Admin counts error:", err));

        // 2. METADATA LOGIC: Check for NEW content across categories
        const metadataQuery = query(collection(db, 'system'), where('__name__', '==', 'metadata'));

        const unsubMetadata = onSnapshot(metadataQuery, (snapshot) => {
            if (snapshot.empty) return;

            const data = snapshot.docs[0].data();

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
        }, err => console.error("Metadata counts error:", err));

        return () => {
            unsubAdmin();
            unsubMetadata();
        };
    }, []);

    return counts;
};
