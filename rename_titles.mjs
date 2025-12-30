import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT_PATH = './service-account.json';
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const RENAME_MAPPING = {
    "Agamiya-Karma": "ஆகாமிய கர்மா",
    "Karma Vinai": "கர்ம வினை",
    "Aanmagna-Ragasiam": "ஆன்ம ஞான ரகசியம்",
    "Aanmavai-Thurundu-Aanmavaga-Iru": "ஆன்மாவைத் துறந்து ஆன்மாவாக இரு",
    "Dhyanathai-Vidu-Gnanathai-Peru": "தியானத்தை விடு ஞானத்தைப் பெறு",
    "Gnana-Viduthalai": "ஞான விடுதலை",
    "Gnana Malarvu": "ஞான மலர்வு",
    "Gnana Pattarai": "ஞான பட்டறை",
    "Kavalaigal Anaithirkum Theervu": "கவலைகள் அனைத்தும் தீர்வு",
    "Nammai Arivom": "நம்மை அறிவோம்",
    "Pathu Kattalai": "பத்து கட்டளைகள்",
    "Sath Dharisanam": "சத் தரிசனம்",
    "Summa-Iru": "சும்மா இரு",
    "Vedantham": "வேதாந்தம்",
    "Gnana Viduthalai-Kavalaigal Anaithirkum Theervu - Combo": "ஞான விடுதலை (காம்போ)",
    "Summa Iru-Anma Gnanam-Anmavai Thuranthu Anmavaka Iru - Combo": "சும்மா இரு (காம்போ)"
};

async function renameTitles() {
    // 1. Specific fix for the accidentally renamed Karma Vinai
    const specificId = "12q2kiiMYPIiWrWbea2k";
    console.log(`[SPECIFIC FIX] ID: ${specificId} -> "கர்ம வினை"`);
    await db.collection('books').doc(specificId).update({
        title: "கர்ம வினை",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const snapshot = await db.collection('books').where('category', '==', 'Tamil Books').get();

    console.log(`Found ${snapshot.size} Tamil books.`);

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const currentTitle = data.title;
        const newTitle = RENAME_MAPPING[currentTitle];

        if (newTitle && currentTitle !== newTitle) {
            console.log(`[RENAMING] "${currentTitle}" -> "${newTitle}"`);
            batch.update(doc.ref, {
                title: newTitle,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
        } else {
            console.log(`[SKIPPING] "${currentTitle}" (No mapping or already same)`);
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`\nSuccessfully renamed ${count} titles.`);
    } else {
        console.log('\nNo titles needed renaming.');
    }
}

renameTitles().catch(console.error);
