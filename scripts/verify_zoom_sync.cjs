const admin = require('firebase-admin');
const serviceAccount = require('/home/ganapathiraj/Code/Android/SriBagavath/secrets/service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function verifySync() {
    console.log("--- Zoom Sync Verification ---");

    // 1. Check sync_registry
    const registrySnap = await db.doc('app_settings/sync_registry').get();
    const registry = registrySnap.data() || {};
    console.log("Current daily_zoom_meetings version:", registry.daily_zoom_meetings);

    // 2. Check metadata
    const metadataSnap = await db.doc('system/metadata').get();
    const metadata = metadataSnap.data() || {};
    console.log("Last Daily Zoom update timestamp:", metadata.lastUpdated_daily_zoom);

    if (registry.daily_zoom_meetings && metadata.lastUpdated_daily_zoom) {
        console.log("\nSUCCESS: Sync infrastructure is correctly initialized in Firestore.");
    } else {
        console.log("\nWARNING: Some fields are missing. This is expected if no admin edits have been made yet.");
    }
}

verifySync().catch(console.error);
