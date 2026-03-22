const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function renameCategory() {
  const galleryRef = db.collection('gallery');
  const snapshot = await galleryRef.where('category', '==', 'recent').get();

  if (snapshot.empty) {
    console.log('No images with category "recent" found.');
    return;
  }

  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.update(doc.ref, { 
      category: 'events',
      updatedAt: admin.firestore.Timestamp.now()
    });
  });

  await batch.commit();
  console.log(`Successfully renamed ${snapshot.size} images from "recent" to "events".`);
}

renameCategory().catch(console.error);
