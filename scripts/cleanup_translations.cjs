const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function cleanupTranslations() {
    console.log('--- Starting Translation Cleanup ---');
    const docRef = db.collection('learned_translations').doc('cities');
    const snap = await docRef.get();
    
    if (!snap.exists) {
        console.log('No translations document found.');
        return;
    }

    const data = snap.data();
    const newData = {};
    let changes = 0;

    for (const [key, value] of Object.entries(data)) {
        const cleanKey = key.trim().toLowerCase();
        if (key !== cleanKey) {
            console.log(`Cleaning key: [${key}] -> [${cleanKey}]`);
            changes++;
        }
        // If multiple dirty keys map to same clean key, last one wins (fine for this use case)
        newData[cleanKey] = value.trim();
    }

    if (changes > 0) {
        console.log(`Applying changes to ${changes} keys...`);
        await docRef.set(newData); // Overwrite with clean data
        console.log('Cleanup complete!');
    } else {
        console.log('No keys needed cleaning.');
    }
    console.log('--- Ending Translation Cleanup ---');
}

cleanupTranslations().catch(console.error);
