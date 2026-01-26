import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const GlobalSettingsContext = createContext();

export const useGlobalSettings = () => {
    return useContext(GlobalSettingsContext);
};

export const GlobalSettingsProvider = ({ children }) => {
    // Firestore Settings (Truly Global across devices)
    const [settings, setSettings] = useState({
        onlineTransactionsEnabled: true
    });

    // Local Settings (Device specific, but Global to App Context)
    const [bankPassword, setBankPasswordState] = useState(localStorage.getItem('bank_statement_password') || '');
    const [devMode, setDevModeState] = useState(localStorage.getItem('settings_devMode') === 'true');
    const [updateSource, setUpdateSourceState] = useState(localStorage.getItem('settings_updateSource') || 'auto');
    const [serverUrl, setServerUrlState] = useState(localStorage.getItem('settings_serverUrl') || 'http://192.168.1.2:8080');

    // Import/Export URLs (Managed by Super Admin)
    const LATEST_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwceASoBU6CCZFOtNg5QSjsIXrA6fzK9kBvMbkCEBuh4FabjRNXU0P-7NRGwRNXCNzBHg/exec';

    const [sheetLink, setSheetLinkState] = useState(localStorage.getItem('admin_import_export_sheet_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit');
    const [programImportUrl, setProgramImportUrlState] = useState(localStorage.getItem('admin_program_import_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=0');
    const [programExportUrl, setProgramExportUrlState] = useState(localStorage.getItem('admin_program_export_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=186682100');
    const [programUpdateUrl, setProgramUpdateUrlState] = useState(localStorage.getItem('admin_program_update_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=464998222');

    const [bookImportUrl, setBookImportUrlState] = useState(localStorage.getItem('admin_book_import_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=106820319');
    const [bookExportUrl, setBookExportUrlState] = useState(localStorage.getItem('admin_book_export_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=918205091');
    const [bookUpdateUrl, setBookUpdateUrlState] = useState(localStorage.getItem('admin_book_update_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=1377614208');

    const [donationImportUrl, setDonationImportUrlState] = useState(localStorage.getItem('admin_donation_import_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=314638099');
    const [donationExportUrl, setDonationExportUrlState] = useState(localStorage.getItem('admin_donation_export_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=1623097087');
    const [donationUpdateUrl, setDonationUpdateUrlState] = useState(localStorage.getItem('admin_donation_update_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit?gid=227329141');
    const [scriptUrl, setScriptUrlState] = useState(localStorage.getItem('admin_import_export_script_url') || LATEST_SCRIPT_URL);

    const [loading, setLoading] = useState(true);

    // Auto-sync script URL if it's outdated
    useEffect(() => {
        const savedUrl = localStorage.getItem('admin_import_export_script_url');
        if (savedUrl && savedUrl !== LATEST_SCRIPT_URL) {
            setScriptUrlState(LATEST_SCRIPT_URL);
            localStorage.setItem('admin_import_export_script_url', LATEST_SCRIPT_URL);
            console.log("Auto-updated Apps Script URL to latest version");
        }
    }, []);

    // Sync Firestore
    useEffect(() => {
        const docRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data());
            } else {
                setDoc(docRef, { onlineTransactionsEnabled: true });
            }
            setLoading(false); // Only wait for Firestore to consider "loading" done? Or doesn't matter for local prefs.
        }, (error) => {
            console.error("Error fetching global settings:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Setters that sync with LocalStorage
    const setBankPassword = (val) => {
        setBankPasswordState(val);
        localStorage.setItem('bank_statement_password', val);
    };

    const setDevMode = (val) => {
        setDevModeState(val);
        localStorage.setItem('settings_devMode', val);
        // Dispatch event for legacy listeners (if any remain) - UpdateIcon might still use it until refactored
        // But we are refactoring UpdateIcon too hopefully. 
        // dispatchEvent is 'dev_mode_changed'.
        // Keep it for safety during transition or remove if we update UpdateIcon now.
        // The user didn't ask to refactor UpdateIcon but it's good practice.
        // I will update UpdateIcon to use Context if permitted, otherwise dispatch event.
        // Current task is "store... in global context". UpdateIcon consuming context is the logical next step.
        window.dispatchEvent(new Event('dev_mode_changed'));
    };

    const setUpdateSource = (val) => {
        setUpdateSourceState(val);
        localStorage.setItem('settings_updateSource', val);
    };

    const setServerUrl = (val) => {
        setServerUrlState(val);
        localStorage.setItem('settings_serverUrl', val);
    };

    const setSheetLink = (val) => {
        setSheetLinkState(val);
        localStorage.setItem('admin_import_export_sheet_url', val);
    };

    const setScriptUrl = (val) => {
        setScriptUrlState(val);
        localStorage.setItem('admin_import_export_script_url', val);
    };

    const setProgramExportUrl = (val) => {
        setProgramExportUrlState(val);
        localStorage.setItem('admin_program_export_url', val);
    };

    const setProgramUpdateUrl = (val) => {
        setProgramUpdateUrlState(val);
        localStorage.setItem('admin_program_update_url', val);
    };

    const setBookExportUrl = (val) => {
        setBookExportUrlState(val);
        localStorage.setItem('admin_book_export_url', val);
    };

    const setBookUpdateUrl = (val) => {
        setBookUpdateUrlState(val);
        localStorage.setItem('admin_book_update_url', val);
    };

    const setDonationExportUrl = (val) => {
        setDonationExportUrlState(val);
        localStorage.setItem('admin_donation_export_url', val);
    };

    const setDonationUpdateUrl = (val) => {
        setDonationUpdateUrlState(val);
        localStorage.setItem('admin_donation_update_url', val);
    };

    const setProgramImportUrl = (val) => {
        setProgramImportUrlState(val);
        localStorage.setItem('admin_program_import_url', val);
    };

    const setBookImportUrl = (val) => {
        setBookImportUrlState(val);
        localStorage.setItem('admin_book_import_url', val);
    };

    const setDonationImportUrl = (val) => {
        setDonationImportUrlState(val);
        localStorage.setItem('admin_donation_import_url', val);
    };

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
            // Firestore
            onlineTransactionsEnabled: settings.onlineTransactionsEnabled,
            toggleOnlineTransactions,

            // Local
            bankPassword, setBankPassword,
            devMode, setDevMode,
            updateSource, setUpdateSource,
            serverUrl, setServerUrl,

            sheetLink, setSheetLink,
            programImportUrl, setProgramImportUrl,
            programExportUrl, setProgramExportUrl,
            programUpdateUrl, setProgramUpdateUrl,
            bookImportUrl, setBookImportUrl,
            bookExportUrl, setBookExportUrl,
            bookUpdateUrl, setBookUpdateUrl,
            donationImportUrl, setDonationImportUrl,
            donationExportUrl, setDonationExportUrl,
            donationUpdateUrl, setDonationUpdateUrl,
            scriptUrl, setScriptUrl,

            loading
        }}>
            {!loading && children}
        </GlobalSettingsContext.Provider>
    );
};
