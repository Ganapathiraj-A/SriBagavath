const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  console.log('--- Starting Teacher Migration ---');
  
  const teachersRef = db.collection('teachers');
  const zoomTeachersRef = db.collection('daily_zoom_teachers');
  const consultantsRef = db.collection('consultants');

  // 1. Fetch existing data
  const zoomSnap = await zoomTeachersRef.get();
  const consSnap = await consultantsRef.get();

  console.log(`Found ${zoomSnap.size} Zoom Teachers`);
  console.log(`Found ${consSnap.size} Consultants`);

  const teachersMap = new Map(); // Key: normalized name

  // 2. Process Zoom Teachers
  zoomSnap.forEach(doc => {
    const data = doc.data();
    const name = data.name || 'Unknown';
    const key = name.toLowerCase().trim();
    
    teachersMap.set(key, {
      name: name,
      image: data.image || '',
      googleId: data.googleId || '',
      phoneNumber: data.phoneNumber || '',
      showInConsultation: false,
      consultationOrder: 999,
      createdAt: data.createdAt || new Date().toISOString()
    });
  });

  // 3. Process Consultants (and merge)
  consSnap.forEach(doc => {
    const data = doc.data();
    const name = data.name || 'Unknown';
    const key = name.toLowerCase().trim();

    if (teachersMap.has(key)) {
      // Merge
      const existing = teachersMap.get(key);
      teachersMap.set(key, {
        ...existing,
        phoneNumber: existing.phoneNumber || data.number || '',
        showInConsultation: true,
        consultationOrder: data.order !== undefined ? data.order : existing.consultationOrder
      });
      console.log(`Merged: ${name}`);
    } else {
      // Add new
      teachersMap.set(key, {
        name: name,
        image: '',
        googleId: '',
        phoneNumber: data.number || '',
        showInConsultation: true,
        consultationOrder: data.order !== undefined ? data.order : 999,
        createdAt: new Date().toISOString()
      });
      console.log(`Added Consultant as Teacher: ${name}`);
    }
  });

  // 4. Write to 'teachers' collection
  console.log(`Writing ${teachersMap.size} unique teachers...`);
  const batch = db.batch();
  
  for (const [key, teacherData] of teachersMap.entries()) {
    const newDocRef = teachersRef.doc(); // Auto-ID
    batch.set(newDocRef, teacherData);
  }

  await batch.commit();
  console.log('--- Migration Complete! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
