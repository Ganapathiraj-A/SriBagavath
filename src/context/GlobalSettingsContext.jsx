import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from '@/utils/FirestoreProxy';
import { onAuthStateChanged } from 'firebase/auth';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const GlobalSettingsContext = createContext();

export const useGlobalSettings = () => {
    return useContext(GlobalSettingsContext);
};

const DEFAULT_USER_SETTINGS = {
    devMode: false,
    updateSource: 'auto',
    serverUrl: 'http://192.168.1.3:8080',
    landingPage: '/',
    showApiCounter: true, // Temporarily enabled for testing
    showDiagnosticLogs: true // Temporarily enabled for testing
};

export const GlobalSettingsProvider = ({ children }) => {
    // Firestore Global Settings (Functional)
    const [settings, setSettings] = useState({
        onlineTransactionsEnabled: true,
        minAppVersion: '3.0.0',
        bankPassword: '',
        sheetLink: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit',
        scriptUrl: 'https://script.google.com/macros/s/AKfycbwceASoBU6CCZFOtNg5QSjsIXrA6fzK9kBvMbkCEBuh4FabjRNXU0P-7NRGwRNXCNzBHg/exec',
        programImportUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=0',
        programExportUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=186682100',
        programUpdateUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=464998222',
        bookImportUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=106820319',
        bookExportUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=918205091',
        bookUpdateUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=1377614208',
        donationImportUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=314638099',
        donationExportUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=1623097087',
        donationUpdateUrl: 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=227329141'
    });

    // Firestore Per-User Settings (Developer Options)
    const [userSettings, setUserSettings] = useState(DEFAULT_USER_SETTINGS);

    // Injected by Vite via package.json
    const APP_VERSION_TAG = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.0.0';

    const [appVersion, setAppVersion] = useState(APP_VERSION_TAG);
    const [currentUser, setCurrentUser] = useState(null);

    const LATEST_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwceASoBU6CCZFOtNg5QSjsIXrA6fzK9kBvMbkCEBuh4FabjRNXU0P-7NRGwRNXCNzBHg/exec';

    // 1. Fetch App Version
    useEffect(() => {
        const fetchVersion = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const info = await CapacitorApp.getInfo();
                    setAppVersion(info.version);
                } catch (e) {
                    console.error("Error fetching app info:", e);
                    setAppVersion(APP_VERSION_TAG);
                }
            } else {
                setAppVersion(APP_VERSION_TAG);
            }
        };
        fetchVersion();
    }, [APP_VERSION_TAG]);

    // 2. Auth state Listener + User Settings Sync
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                const userDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
                const unsubscribeUserSub = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserSettings(docSnap.data());
                    } else {
                        // Migration from LocalStorage for Developer Options on first login
                        const localDevMode = localStorage.getItem('settings_devMode') === 'true';
                        const localUpdateSource = localStorage.getItem('settings_updateSource') || DEFAULT_USER_SETTINGS.updateSource;
                        const localServerUrl = localStorage.getItem('settings_serverUrl') || DEFAULT_USER_SETTINGS.serverUrl;
                        const localLandingPage = localStorage.getItem('admin_landing_page') || DEFAULT_USER_SETTINGS.landingPage;

                        const initData = {
                            devMode: localDevMode,
                            updateSource: localUpdateSource,
                            serverUrl: localServerUrl,
                            landingPage: localLandingPage,
                            showApiCounter: false,
                            showDiagnosticLogs: false
                        };
                        setDoc(userDocRef, initData);
                        setUserSettings(initData);
                    }
                });
                return () => unsubscribeUserSub();
            } else {
                setUserSettings(DEFAULT_USER_SETTINGS);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 3. Global Settings Sync + Initial Migration
    useEffect(() => {
        const docRef = doc(db, 'settings', 'global');
        const unsubscribeGlobal = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Ensure migration-only fields like scriptUrl are auto-updated if hardcoded logic demands it
                if (data.scriptUrl && data.scriptUrl !== LATEST_SCRIPT_URL) {
                    // We don't auto-override Firestore here, but we could if we wanted strict versioning.
                    // For now, let's just use what's in Firestore.
                }
                setSettings(prev => ({ ...prev, ...data }));
            } else {
                // Perform one-time migration from LocalStorage if Firestore is completely empty
                console.log("Global settings not found in Firestore. Migrating from LocalStorage...");
                const initData = {
                    onlineTransactionsEnabled: true,
                    minAppVersion: '3.0.0',
                    bankPassword: localStorage.getItem('bank_statement_password') || '',
                    sheetLink: localStorage.getItem('admin_import_export_sheet_url') || settings.sheetLink,
                    scriptUrl: localStorage.getItem('admin_import_export_script_url') || settings.scriptUrl,
                    programImportUrl: localStorage.getItem('admin_program_import_url') || settings.programImportUrl,
                    programExportUrl: localStorage.getItem('admin_program_export_url') || settings.programExportUrl,
                    programUpdateUrl: localStorage.getItem('admin_program_update_url') || settings.programUpdateUrl,
                    bookImportUrl: localStorage.getItem('admin_book_import_url') || settings.bookImportUrl,
                    bookExportUrl: localStorage.getItem('admin_book_export_url') || settings.bookExportUrl,
                    bookUpdateUrl: localStorage.getItem('admin_book_update_url') || settings.bookUpdateUrl,
                    donationImportUrl: localStorage.getItem('admin_donation_import_url') || settings.donationImportUrl,
                    donationExportUrl: localStorage.getItem('admin_donation_export_url') || settings.donationExportUrl,
                    donationUpdateUrl: localStorage.getItem('admin_donation_update_url') || settings.donationUpdateUrl
                };
                await setDoc(docRef, initData);
                setSettings(initData);
            }
        }, (error) => {
            console.error("Error fetching global settings:", error);
        });
        return () => unsubscribeGlobal();
    }, []);

    // helper for Global Updates
    const updateGlobal = async (updates) => {
        try {
            const docRef = doc(db, 'settings', 'global');
            await setDoc(docRef, updates, { merge: true });
        } catch (error) {
            console.error("Error updating global settings:", error);
            throw error;
        }
    };

    // helper for User Updates
    const updateUser = async (updates) => {
        if (!currentUser) return;
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
            await setDoc(docRef, updates, { merge: true });
        } catch (error) {
            console.error("Error updating user settings:", error);
            throw error;
        }
    };

    return (
        <GlobalSettingsContext.Provider value={{
            // Functional Settings (Global)
            onlineTransactionsEnabled: settings.onlineTransactionsEnabled,
            minAppVersion: settings.minAppVersion,
            bankPassword: settings.bankPassword,
            sheetLink: settings.sheetLink,
            scriptUrl: settings.scriptUrl,
            programImportUrl: settings.programImportUrl,
            programExportUrl: settings.programExportUrl,
            programUpdateUrl: settings.programUpdateUrl,
            bookImportUrl: settings.bookImportUrl,
            bookExportUrl: settings.bookExportUrl,
            bookUpdateUrl: settings.bookUpdateUrl,
            donationImportUrl: settings.donationImportUrl,
            donationExportUrl: settings.donationExportUrl,
            donationUpdateUrl: settings.donationUpdateUrl,

            toggleOnlineTransactions: (val) => updateGlobal({ onlineTransactionsEnabled: val }),
            setMinAppVersion: (val) => updateGlobal({ minAppVersion: val }),
            setBankPassword: (val) => updateGlobal({ bankPassword: val }),
            setSheetLink: (val) => updateGlobal({ sheetLink: val }),
            setScriptUrl: (val) => updateGlobal({ scriptUrl: val }),
            setProgramImportUrl: (val) => updateGlobal({ programImportUrl: val }),
            setProgramExportUrl: (val) => updateGlobal({ programExportUrl: val }),
            setProgramUpdateUrl: (val) => updateGlobal({ programUpdateUrl: val }),
            setBookImportUrl: (val) => updateGlobal({ bookImportUrl: val }),
            setBookExportUrl: (val) => updateGlobal({ bookExportUrl: val }),
            setBookUpdateUrl: (val) => updateGlobal({ bookUpdateUrl: val }),
            setDonationImportUrl: (val) => updateGlobal({ donationImportUrl: val }),
            setDonationExportUrl: (val) => updateGlobal({ donationExportUrl: val }),
            setDonationUpdateUrl: (val) => updateGlobal({ donationUpdateUrl: val }),

            // Developer Settings (Per-User)
            devMode: userSettings.devMode ?? DEFAULT_USER_SETTINGS.devMode,
            updateSource: userSettings.updateSource ?? DEFAULT_USER_SETTINGS.updateSource,
            serverUrl: userSettings.serverUrl ?? DEFAULT_USER_SETTINGS.serverUrl,
            landingPage: userSettings.landingPage ?? DEFAULT_USER_SETTINGS.landingPage,
            showApiCounter: userSettings.showApiCounter ?? DEFAULT_USER_SETTINGS.showApiCounter,
            showDiagnosticLogs: userSettings.showDiagnosticLogs ?? DEFAULT_USER_SETTINGS.showDiagnosticLogs,

            setDevMode: (val) => {
                updateUser({ devMode: val });
                window.dispatchEvent(new Event('dev_mode_changed'));
            },
            setUpdateSource: (val) => updateUser({ updateSource: val }),
            setServerUrl: (val) => updateUser({ serverUrl: val }),
            setLandingPage: (val) => updateUser({ landingPage: val }),
            setShowApiCounter: (val) => updateUser({ showApiCounter: val }),
            setShowDiagnosticLogs: (val) => updateUser({ showDiagnosticLogs: val }),

            appVersion
        }}>
            {children}
        </GlobalSettingsContext.Provider>
    );
};
