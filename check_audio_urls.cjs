
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('secrets/service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUrls() {
    const snapshot = await db.collection('audio_books').limit(5).get();
    snapshot.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(`imageUrl: ${doc.data().imageUrl}`);
        console.log(`image: ${doc.data().image}`);
        console.log('---');
    });
}

checkUrls().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
