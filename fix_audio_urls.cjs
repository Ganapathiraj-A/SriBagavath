
const admin = require('firebase-admin');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const serviceAccount = JSON.parse(fs.readFileSync('secrets/service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'antigravity-app-5c1ff.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function fixAudioUrls() {
    console.log("Starting URL fix...");
    const snapshot = await db.collection('audio_books').where('storage_migrated', '==', true).get();
    console.log(`Found ${snapshot.size} migrated audio books to fix.`);

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const imageUrl = data.imageUrl;

        if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com') && !imageUrl.includes('&token=')) {
            // Extract the path from the URL
            const encodedPath = imageUrl.split('/o/')[1].split('?')[0];
            const filePath = decodeURIComponent(encodedPath);
            const file = bucket.file(filePath);

            try {
                // 1. Get existing token from metadata or generate a new one
                const [metadata] = await file.getMetadata();
                let token = metadata.metadata ? metadata.metadata.firebaseStorageDownloadTokens : null;

                if (!token) {
                    token = uuidv4();
                    await file.setMetadata({
                        metadata: {
                            firebaseStorageDownloadTokens: token
                        }
                    });
                }

                // 2. Construct final URL with token
                const finalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

                // 3. Update Firestore
                await doc.ref.update({
                    imageUrl: finalUrl,
                    image: finalUrl
                });

                console.log(`Updated ${doc.id} with tokenized URL.`);
            } catch (err) {
                console.error(`Failed to update ${doc.id}:`, err.message);
            }
        }
    }
}

fixAudioUrls().then(() => {
    console.log("Fix complete.");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
