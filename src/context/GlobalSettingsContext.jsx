import { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '@/firebase';
import { doc, onSnapshot, setDoc, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { TransactionService } from '@/services/TransactionService';
import { translations } from '@/utils/translations';
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
    showDiagnosticLogs: false,
    showImageVerificationAlert: false,
    showRightPanel: false
};

export const GlobalSettingsProvider = ({ children }) => {
    // Firestore Global Settings (Functional)
    const [publicSettings, setPublicSettings] = useState({
        onlineTransactionsEnabled: true,
        minAppVersion: '3.0.0',
        digitalBookLanguages: [
            { id: 'tamil', name: 'Tamil', folderId: '1y0X_HByCzQbD-niqKODg-Nan9r70_dMs' },
            { id: 'english', name: 'English', folderId: '1_PpyDSaAyeBaZ6154-7BHM7oIqs4O0Gv' },
            { id: 'hindi', name: 'Hindi', folderId: '1th9WKd0K8OwMx-gC8B8_OZQkMaTpiar4' },
            { id: 'telugu', name: 'Telugu', folderId: '1z8X8QiAI8B9LjUeLUqhjgoWTMwuTSAq1' },
            { id: 'russian', name: 'Russian', folderId: '1NKWcCGzcWXYnJWj0nStaLHps3OVBXLXv' },
            { id: 'hebrew', name: 'Hebrew', folderId: '105YZMDLi5cGFZ7xL5PT8N_p7PZWfzPH7' },
            { id: 'spanish', name: 'Spanish', folderId: '1gbFJp3RoPpwRlwciDbxoemDOAZtjRWka' },
            { id: 'german', name: 'German', folderId: '1YAEZZeKhUhjr95yLGibcWsoRpcSsSjuc' },
            { id: 'italian', name: 'Italian', folderId: '1z8tKsPfVWMtEoCi-BL_utILcLC9yyEcq' }
        ],
        driveMagazineId: '152NrOoCD56T9hUK-KLGF7ULwlnDvoVY0',
        driveAudioBooksId: '1L65ifCQ_bAQauymMH5JyDgul7LIL3cnL',
        onlineRegistrationContact: '',
        offlineRegistrationContact: '',
        hiddenScreens: {
            public: [],
            admin: [],
            dev: []
        }
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
    const [globalServerUrl, setGlobalServerUrl] = useState('');

    // --- Localization ---
    const [language, setLanguage] = useState(localStorage.getItem('app_language') || 'ta');

    const t = (key) => {
        // Tamil translations apply only to the "Mobile" section.
        // The "Web" section (Website Replica and Admin/Backoffice) stays in English.
        const path = window.location.pathname;
        const isWebSection = path.startsWith('/web') || 
                            path.startsWith('/admin') || 
                            path.startsWith('/configuration') ||
                            path.startsWith('/manage-users') ||
                            (path === '/program' || path.startsWith('/program/')); // Fix: avoid matching '/programs'

        const lookupLanguage = isWebSection ? 'en' : language;

        if (!translations[lookupLanguage]) return key;
        return translations[lookupLanguage][key] || key;
    };

    const handleSetLanguage = (lang) => {
        setLanguage(lang);
        localStorage.setItem('app_language', lang);
    };

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

    // 1.1 Force Tamil Migration for existing users
    useEffect(() => {
        if (!localStorage.getItem('migrated_to_default_tamil_v1')) {
            handleSetLanguage('ta');
            localStorage.setItem('migrated_to_default_tamil_v1', 'true');
        }
    }, []);

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
        let unsubscribeUserSub = () => { };
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            // Unsubscribe previous user settings listener
            unsubscribeUserSub();

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

                unsubscribeUserSub = onSnapshot(userDocRef, (docSnap) => {
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
                            showDiagnosticLogs: false,
                            showImageVerificationAlert: false,
                            showRightPanel: false
                        };
                        setDoc(userDocRef, initData);
                        setUserSettings(initData);
                    }
                }, () => console.log("Preference listener restricted (Expected for anonymous)"));
            } else {
                setUserSettings(DEFAULT_USER_SETTINGS);
            }
        });
        return () => {
            unsubscribeAuth();
            unsubscribeUserSub();
        };
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

    // 3.5 Global utility settings sync
    useEffect(() => {
        const globalDocRef = doc(db, 'settings', 'global');

        const unsubscribeGlobal = onSnapshot(globalDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setGlobalServerUrl(docSnap.data().serverUrl || '');
            } else {
                setGlobalServerUrl('');
            }
        }, () => {
            setGlobalServerUrl('');
        });

        return () => unsubscribeGlobal();
    }, []);

    // Sync image verification setting to window object for non-React utilities
    useEffect(() => {
        window.showImageVerificationAlert = userSettings.showImageVerificationAlert ?? DEFAULT_USER_SETTINGS.showImageVerificationAlert;
    }, [userSettings.showImageVerificationAlert]);


    // 4. Admin Settings Sync (Private)
    useEffect(() => {
        if (!currentUser) {
            // eslint-disable-next-line
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
            digitalBookLanguages: publicSettings.digitalBookLanguages || [],
            driveMagazineId: publicSettings.driveMagazineId,
            driveAudioBooksId: publicSettings.driveAudioBooksId,
            onlineRegistrationContact: publicSettings.onlineRegistrationContact,
            offlineRegistrationContact: publicSettings.offlineRegistrationContact,
            hiddenScreens: publicSettings.hiddenScreens || { public: [], admin: [], dev: [] },

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
            setDigitalBookLanguages: (val) => updatePublic({ digitalBookLanguages: val }),
            setDriveMagazineId: (val) => updatePublic({ driveMagazineId: val }),
            setDriveAudioBooksId: (val) => updatePublic({ driveAudioBooksId: val }),
            setOnlineRegistrationContact: (val) => updatePublic({ onlineRegistrationContact: val }),
            setOfflineRegistrationContact: (val) => updatePublic({ offlineRegistrationContact: val }),
            setHiddenScreens: (val) => updatePublic({ hiddenScreens: val }),

            // Developer Settings (Per-User)
            devMode: userSettings.devMode ?? DEFAULT_USER_SETTINGS.devMode,
            updateSource: userSettings.updateSource ?? DEFAULT_USER_SETTINGS.updateSource,
            serverUrl: userSettings.serverUrl || globalServerUrl || DEFAULT_USER_SETTINGS.serverUrl,
            landingPage: userSettings.landingPage ?? DEFAULT_USER_SETTINGS.landingPage,
            showApiCounter: isDeviceAuthorized || (userSettings.showApiCounter ?? DEFAULT_USER_SETTINGS.showApiCounter),
            showDiagnosticLogs: isDeviceAuthorized || (userSettings.showDiagnosticLogs ?? DEFAULT_USER_SETTINGS.showDiagnosticLogs),
            showImageVerificationAlert: userSettings.showImageVerificationAlert ?? DEFAULT_USER_SETTINGS.showImageVerificationAlert,
            showRightPanel: userSettings.showRightPanel ?? DEFAULT_USER_SETTINGS.showRightPanel,
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
            setShowImageVerificationAlert: (val) => updateUser({ showImageVerificationAlert: val }),
            setShowRightPanel: (val) => updateUser({ showRightPanel: val }),
            toggleDeviceAuthorization,
            setPublicSettings,

            // Localization
            language,
            setLanguage: handleSetLanguage,
            t,

            appVersion
        }}>
            {children}
        </GlobalSettingsContext.Provider>
    );
};
