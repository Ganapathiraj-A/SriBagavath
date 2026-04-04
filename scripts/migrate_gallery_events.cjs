const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateGalleryEvents() {
  console.log('--- Starting Gallery Events Migration ---');

  // 1. Create the first event folder: "Coimbatore Event"
  const eventRef = db.collection('gallery_events').doc();
  const eventId = eventRef.id;

  await eventRef.set({
    name: 'Coimbatore Event',
    order: 0,
    category: 'events', // Extra metadata to link to top-level tab if needed
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  });

  console.log(`✅ Created folder: Coimbatore Event (${eventId})`);

  // 2. Find all images currently under "Recent Events"
  const galleryRef = db.collection('gallery');
  const snapshot = await galleryRef.where('category', '==', 'events').get();

  if (snapshot.empty) {
    console.log('⚠️ No images with category "events" found to migrate.');
  } else {
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { 
        eventId: eventId,
        updatedAt: admin.firestore.Timestamp.now()
      });
    });

    await batch.commit();
    console.log(`✅ Successfully moved ${snapshot.size} images into "Coimbatore Event".`);
  }

  console.log('--- Migration Finished! ---');
  process.exit(0);
}

migrateGalleryEvents().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
