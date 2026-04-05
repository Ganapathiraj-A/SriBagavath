import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

// Load service account (relative to project root)
const serviceAccountPath = path.resolve('secrets/service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const IMAGES = [
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/B1A-2.jpg", caption: "Sri Bagavath Ayya" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/B6-1.jpg", caption: "Spiritual Gathering" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/B13-1.jpg", caption: "Satsang Moments" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/B3-1.jpg", caption: "Inner Peace" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/B7.jpg", caption: "Mission Vision" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/B14.jpg", caption: "Sri Bagavath Mission" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/B15.jpg", caption: "Wisdom Sharing" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/Bagavath-Ayya-Birth-Day-rotated.jpg", caption: "Ayya's Birthday Celebration" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/Bagavath-Ayya-Birth-Day-Cake.jpg", caption: "Birthday Cake Cutting" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/Sri-Bagavath-Ayya-Birth-Day-.jpg", caption: "Ayya's Birthday" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/Bagavath-Ayya-with-Sarvanan-Ayya-Jeevamani-Ayya.jpg", caption: "Ayya with Sarvanan & Jeevamani Ayya" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/Bagavath-Ayya-Birthday11-scaled.jpg", caption: "Ayya Birthday 2023" },
    { url: "https://sribagavath.com/wp-content/uploads/2023/09/Bagavath-Ayya-with-Jeevamani-Ayya-Anbukarasi-Amma.jpg", caption: "Ayya with Family" }
];

async function initializeGallery() {
  try {
    const galleryColl = db.collection('gallery');
    
    // Clear existing (optional, but good for clean init)
    const snapshot = await galleryColl.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('Cleared existing gallery items.');

    for (let i = 0; i < IMAGES.length; i++) {
        const item = IMAGES[i];
        await galleryColl.add({
            ...item,
            order: i,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        });
        console.log(`Added: ${item.caption}`);
    }

    console.log('\nGallery initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
}

initializeGallery();
