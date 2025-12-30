import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT_PATH = './service-account.json';
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verify() {
    const ids = ["12q2kiiMYPIiWrWbea2k", "ujJ5gfyiZGozrERjyoff"];
    for (const id of ids) {
        const doc = await db.collection('books').doc(id).get();
        if (doc.exists) {
            console.log(`[DATA] ID: ${id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
            console.log('---');
        }
    }
}

verify().catch(console.error);
