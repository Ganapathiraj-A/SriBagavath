import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '@/firebase';
import { doc, onSnapshot, setDoc, getDoc, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { TransactionService } from '@/services/TransactionService';
import { onAuthStateChanged } from 'firebase/auth';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const GlobalSettingsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalSettings = () => {
    return useContext(GlobalSettingsContext);
};

const DEFAULT_USER_SETTINGS = {
    devMode: false,
    updateSource: 'auto',
    serverUrl: '',
    landingPage: '/',
    showApiCounter: false,
    showDiagnosticLogs: false
};

export const GlobalSettingsProvider = ({ children }) => {
    // Firestore Global Settings (Functional)
    const [publicSettings, setPublicSettings] = useState({
        onlineTransactionsEnabled: true,
        minAppVersion: '3.0.0',
        driveTamilBooksId: '1y0X_HByCzQbD-niqKODg-Nan9r70_dMs',
        driveEnglishBooksId: '1_PpyDSaAyeBaZ6154-7BHM7oIqs4O0Gv',
        driveMagazineId: '152NrOoCD56T9hUK-KLGF7ULwlnDvoVY0',
        driveAudioBooksId: '1L65ifCQ_bAQauymMH5JyDgul7LIL3cnL',
        onlineRegistrationContact: '',
        offlineRegistrationContact: ''
    });

    const [adminSettings, setAdminSettings] = useState({
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
    const [deviceId] = useState(TransactionService.getDeviceId());
    const [isDeviceAuthorized, setIsDeviceAuthorized] = useState(false);

    const LATEST_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwceASoBU6CCZFOtNg5QSjsIXrA6fzK9kBvMbkCEBuh4FabjRNXU0P-7NRGwRNXCNzBHg/exec';

    // 1. Fetch App Version
    useEffect(() => {
        const fetchVersion = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const info = await CapacitorApp.getInfo();
                    setAppVersion(info.version);
                } catch (_err) {
                    console.error("Error fetching app info:", _err);
                    setAppVersion(APP_VERSION_TAG);
                }
            } else {
                setAppVersion(APP_VERSION_TAG);
            }
        };
        fetchVersion();
    }, [APP_VERSION_TAG]);
    // 1.5 Device Authorization Listener
    useEffect(() => {
        const deviceDocRef = doc(db, 'debug_devices', deviceId);
        const unsubscribe = onSnapshot(deviceDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setIsDeviceAuthorized(docSnap.data().isAuthorized || false);
            } else {
                setIsDeviceAuthorized(false);
            }
        }, () => {
            console.log("Device auth listener restricted (Expected for untrusted devices)");
            setIsDeviceAuthorized(false);
        });
        return () => unsubscribe();
    }, [deviceId]);

    // 2. Auth state Listener + User Settings Sync
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const userDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');

                // Cache-first initial fetch
                try {
                    const docSnap = await getDocCacheFirst(userDocRef);
                    if (docSnap.exists()) {
                        setUserSettings(docSnap.data());
                    } else if (user.isAnonymous) {
                        // Anonymous users just use defaults, no migration
                        setUserSettings(DEFAULT_USER_SETTINGS);
                    }
                } catch (_err) {
                    console.error("Initial preferences fetch failed:", _err);
                }

                const unsubscribeUserSub = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserSettings(docSnap.data());
                    } else if (!user.isAnonymous) {
                        // Migration from LocalStorage for Developer Options on first login (only for real users)
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
                }, () => console.log("Preference listener restricted (Expected for anonymous)"));

                return () => unsubscribeUserSub();
            } else {
                setUserSettings(DEFAULT_USER_SETTINGS);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 3. Global Settings Sync (Public)
    useEffect(() => {
        const publicDocRef = doc(db, 'settings', 'public');

        const unsubscribePublic = onSnapshot(publicDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setPublicSettings(prev => ({ ...prev, ...docSnap.data() }));
            }
        });

        return () => unsubscribePublic();
    }, [currentUser]);

    // 4. Admin Settings Sync (Private)
    useEffect(() => {
        if (!currentUser) {
            setAdminSettings(prev => {
                if (prev.bankPassword === '' && prev.sheetLink === '') return prev;
                return {
                    bankPassword: '',
                    sheetLink: '',
                    scriptUrl: '',
                    programImportUrl: '',
                    programExportUrl: '',
                    programUpdateUrl: '',
                    bookImportUrl: '',
                    bookExportUrl: '',
                    bookUpdateUrl: '',
                    donationImportUrl: '',
                    donationExportUrl: '',
                    donationUpdateUrl: '',
                };
            });
            return;
        }

        const adminDocRef = doc(db, 'settings', 'admin');

        const unsubscribeAdmin = onSnapshot(adminDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setAdminSettings(prev => ({ ...prev, ...docSnap.data() }));
            }
        }, () => console.log("Admin settings listener restricted"));

        return () => unsubscribeAdmin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // helper for Global Updates (Public)
    const updatePublic = async (updates) => {
        try {
            const docRef = doc(db, 'settings', 'public');
            await setDoc(docRef, updates, { merge: true });
        } catch (_err) {
            console.error("Error updating public settings:", _err);
            throw _err;
        }
    };

    // helper for Admin Updates (Private)
    const updateAdmin = async (updates) => {
        try {
            const docRef = doc(db, 'settings', 'admin');
            await setDoc(docRef, updates, { merge: true });
        } catch (_err) {
            console.error("Error updating admin settings:", _err);
            throw _err;
        }
    };

    // helper for User Updates
    const updateUser = async (updates) => {
        if (!currentUser) return;
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
            await setDoc(docRef, updates, { merge: true });
        } catch (_err) {
            console.error("Error updating user settings:", _err);
            throw _err;
        }
    };

    // helper for Device Authorization
    const toggleDeviceAuthorization = async (val) => {
        if (!currentUser) return; // Only logged in admins can set this (Rules will enforce)
        try {
            const docRef = doc(db, 'debug_devices', deviceId);
            await setDoc(docRef, {
                isAuthorized: val,
                authorizedBy: currentUser.email,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (_err) {
            console.error("Error toggling device authorization:", _err);
            throw _err;
        }
    };

    return (
        <GlobalSettingsContext.Provider value={{
            // Functional Settings (Global)
            onlineTransactionsEnabled: publicSettings.onlineTransactionsEnabled,
            minAppVersion: publicSettings.minAppVersion,
            bankPassword: adminSettings.bankPassword,
            sheetLink: adminSettings.sheetLink,
            scriptUrl: adminSettings.scriptUrl,
            programImportUrl: adminSettings.programImportUrl,
            programExportUrl: adminSettings.programExportUrl,
            programUpdateUrl: adminSettings.programUpdateUrl,
            bookImportUrl: adminSettings.bookImportUrl,
            bookExportUrl: adminSettings.bookExportUrl,
            bookUpdateUrl: adminSettings.bookUpdateUrl,
            donationImportUrl: adminSettings.donationImportUrl,
            donationExportUrl: adminSettings.donationExportUrl,
            donationUpdateUrl: adminSettings.donationUpdateUrl,
            driveTamilBooksId: publicSettings.driveTamilBooksId,
            driveEnglishBooksId: publicSettings.driveEnglishBooksId,
            driveMagazineId: publicSettings.driveMagazineId,
            driveAudioBooksId: publicSettings.driveAudioBooksId,
            onlineRegistrationContact: publicSettings.onlineRegistrationContact,
            offlineRegistrationContact: publicSettings.offlineRegistrationContact,

            toggleOnlineTransactions: (val) => updatePublic({ onlineTransactionsEnabled: val }),
            setMinAppVersion: (val) => updatePublic({ minAppVersion: val }),
            setBankPassword: (val) => updateAdmin({ bankPassword: val }),
            setSheetLink: (val) => updateAdmin({ sheetLink: val }),
            setScriptUrl: (val) => updateAdmin({ scriptUrl: val }),
            setProgramImportUrl: (val) => updateAdmin({ programImportUrl: val }),
            setProgramExportUrl: (val) => updateAdmin({ programExportUrl: val }),
            setProgramUpdateUrl: (val) => updateAdmin({ programUpdateUrl: val }),
            setBookImportUrl: (val) => updateAdmin({ bookImportUrl: val }),
            setBookExportUrl: (val) => updateAdmin({ bookExportUrl: val }),
            setBookUpdateUrl: (val) => updateAdmin({ bookUpdateUrl: val }),
            setDonationImportUrl: (val) => updateAdmin({ donationImportUrl: val }),
            setDonationExportUrl: (val) => updateAdmin({ donationExportUrl: val }),
            setDonationUpdateUrl: (val) => updateAdmin({ donationUpdateUrl: val }),
            setDriveTamilBooksId: (val) => updatePublic({ driveTamilBooksId: val }),
            setDriveEnglishBooksId: (val) => updatePublic({ driveEnglishBooksId: val }),
            setDriveMagazineId: (val) => updatePublic({ driveMagazineId: val }),
            setDriveAudioBooksId: (val) => updatePublic({ driveAudioBooksId: val }),
            setOnlineRegistrationContact: (val) => updatePublic({ onlineRegistrationContact: val }),
            setOfflineRegistrationContact: (val) => updatePublic({ offlineRegistrationContact: val }),

            // Developer Settings (Per-User)
            devMode: userSettings.devMode ?? DEFAULT_USER_SETTINGS.devMode,
            updateSource: userSettings.updateSource ?? DEFAULT_USER_SETTINGS.updateSource,
            serverUrl: userSettings.serverUrl ?? DEFAULT_USER_SETTINGS.serverUrl,
            landingPage: userSettings.landingPage ?? DEFAULT_USER_SETTINGS.landingPage,
            showApiCounter: isDeviceAuthorized || (userSettings.showApiCounter ?? DEFAULT_USER_SETTINGS.showApiCounter),
            showDiagnosticLogs: isDeviceAuthorized || (userSettings.showDiagnosticLogs ?? DEFAULT_USER_SETTINGS.showDiagnosticLogs),
            isDeviceAuthorized,
            deviceId,

            setDevMode: (val) => {
                updateUser({ devMode: val });
                window.dispatchEvent(new Event('dev_mode_changed'));
            },
            setUpdateSource: (val) => updateUser({ updateSource: val }),
            setServerUrl: (val) => updateUser({ serverUrl: val }),
            setLandingPage: (val) => updateUser({ landingPage: val }),
            setShowApiCounter: (val) => updateUser({ showApiCounter: val }),
            setShowDiagnosticLogs: (val) => updateUser({ showDiagnosticLogs: val }),
            toggleDeviceAuthorization,
            setPublicSettings,

            appVersion
        }}>
            {children}
        </GlobalSettingsContext.Provider>
    );
};
