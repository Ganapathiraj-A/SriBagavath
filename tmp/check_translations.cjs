const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkTranslations() {
    const doc = await db.collection('learned_translations').doc('cities').get();
    if (doc.exists) {
        const data = doc.data();
        const keys = Object.keys(data);
        const spacedKeys = keys.filter(k => k !== k.trim());
        console.log('Total translations:', keys.length);
        console.log('Keys with spaces:', spacedKeys.length);
        if (spacedKeys.length > 0) {
            console.log('Example spaced keys:', spacedKeys.slice(0, 5).map(k => `[${k}]`));
        }
    } else {
        console.log('Translations document NOT FOUND in Firestore');
    }
}

checkTranslations().catch(console.error);
