const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function repair() {
  console.log('--- Starting ID-Corrected Teacher Migration ---');
  
  const teachersRef = db.collection('teachers');
  const zoomTeachersRef = db.collection('daily_zoom_teachers');
  const consultantsRef = db.collection('consultants');

  // 1. Clear the 'teachers' collection first to avoid duplicates with different IDs
  console.log('Clearing current teachers collection...');
  const existingTeachers = await teachersRef.get();
  const deleteBatch = db.batch();
  existingTeachers.forEach(doc => deleteBatch.delete(doc.ref));
  await deleteBatch.commit();

  // 2. Fetch legacy data
  const zoomSnap = await zoomTeachersRef.get();
  const consSnap = await consultantsRef.get();

  const teachersMap = new Map(); // Key: normalized name

  // 3. Process Zoom Teachers (preserving their IDs)
  zoomSnap.forEach(doc => {
    const data = doc.data();
    const name = data.name || 'Unknown';
    const key = name.toLowerCase().trim();
    
    teachersMap.set(key, {
      id: doc.id, // KEEP ORIGINAL ID
      data: {
        name: name,
        image: data.image || '',
        googleId: data.googleId || '',
        phoneNumber: data.phoneNumber || '',
        showInConsultation: false,
        consultationOrder: 999,
        createdAt: data.createdAt || new Date().toISOString()
      }
    });
  });

  // 4. Process Consultants (and merge)
  consSnap.forEach(doc => {
    const data = doc.data();
    const name = data.name || 'Unknown';
    const key = name.toLowerCase().trim();

    if (teachersMap.has(key)) {
      const existing = teachersMap.get(key);
      existing.data.phoneNumber = existing.data.phoneNumber || data.number || '';
      existing.data.showInConsultation = true;
      existing.data.consultationOrder = data.order !== undefined ? data.order : existing.data.consultationOrder;
      console.log(`Merged: ${name} (using Zoom ID: ${existing.id})`);
    } else {
      teachersMap.set(key, {
        id: doc.id, // KEEP ORIGINAL ID
        data: {
          name: name,
          image: '',
          googleId: '',
          phoneNumber: data.number || '',
          showInConsultation: true,
          consultationOrder: data.order !== undefined ? data.order : 999,
          createdAt: new Date().toISOString()
        }
      });
      console.log(`Added Consultant as Teacher: ${name} (using Consultant ID: ${doc.id})`);
    }
  });

  // 5. Write to 'teachers' collection with CORRECT IDs
  console.log(`Writing ${teachersMap.size} ID-corrected teachers...`);
  const batch = db.batch();
  
  for (const entry of teachersMap.values()) {
    batch.set(teachersRef.doc(entry.id), entry.data);
  }

  await batch.commit();
  console.log('--- Repair Migration Complete! ---');
  process.exit(0);
}

repair().catch(err => {
  console.error('Repair failed:', err);
  process.exit(1);
});
