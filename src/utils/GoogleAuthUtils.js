import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

export const GET_GOOGLE_CLIENT_ID = () => {
    // 1. Try mode-specific server client ID from env
    const clientId = import.meta.env.VITE_GOOGLE_SERVER_CLIENT_ID;

    if (clientId) return clientId;

    // 2. Fallback to hardcoded IDs if env is missing (for safety)
    const DEV_ID = "265576571338-82ulk332k7gao9h5e8ihnrj85nkir22a.apps.googleusercontent.com";
    const PROD_ID = "358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com";

    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    return projectId === 'sri-bagavath-dev' ? DEV_ID : PROD_ID;
};

let isInitialized = false;

export const ensureGoogleAuthInitialized = async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (isInitialized) return;

    try {
        await GoogleAuth.initialize({
            clientId: GET_GOOGLE_CLIENT_ID(),
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
        });
        isInitialized = true;
    } catch (err) {
        console.warn("GoogleAuth already initialized or failed:", err);
        // We set to true anyway to avoid repeated fails if it was just "already initialized"
        isInitialized = true;
    }
};
