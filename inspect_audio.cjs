
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('secrets/service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
    const snaps = await db.collection('audio_books').limit(10).get();
    for (const snap of snaps.docs) {
        const data = snap.data();
        const img = data.image;
        console.log("-------------------");
        console.log("ID:", snap.id);
        console.log("Image Length:", img ? img.length : "null");
        if (img) {
            console.log("Value:", img.substring(0, 100));

            // Check for problematic characters
            const problematic = img.match(/[^A-Za-z0-9+/=:,;]/g);
            if (problematic) {
                console.log("Non-base64 characters found:", [...new Set(problematic)].join(' '));
            }
        }
    }
    process.exit(0);
}

main().catch(console.error);
