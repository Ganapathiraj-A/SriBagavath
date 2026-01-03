import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const GlobalSettingsContext = createContext();

export const useGlobalSettings = () => {
    return useContext(GlobalSettingsContext);
};

export const GlobalSettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        onlineTransactionsEnabled: true
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, 'settings', 'global');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data());
            } else {
                // Initialize default if not exists
                setDoc(docRef, { onlineTransactionsEnabled: true });
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching global settings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleOnlineTransactions = async (newValue) => {
        try {
            await setDoc(doc(db, 'settings', 'global'), {
                ...settings,
                onlineTransactionsEnabled: newValue
            }, { merge: true });
        } catch (error) {
            console.error("Error updating online transactions setting:", error);
            throw error;
        }
    };

    return (
        <GlobalSettingsContext.Provider value={{
            onlineTransactionsEnabled: settings.onlineTransactionsEnabled,
            toggleOnlineTransactions,
            loading
        }}>
            {!loading && children}
        </GlobalSettingsContext.Provider>
    );
};
