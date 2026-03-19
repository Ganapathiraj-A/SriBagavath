const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('/home/ganapathiraj/Code/Android/SriBagavath/secrets/service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function verifyMediaSync() {
  console.log('--- Verifying Media Sync Signaling ---');
  
  const metadataRef = db.collection('system').doc('metadata');
  const initialSnap = await metadataRef.get();
  const initialData = initialSnap.data();
  
  console.log('Initial metadata:', {
    lastUpdated_audio_books: initialData?.lastUpdated_audio_books?.toDate() || 'N/A',
    lastUpdated_videos: initialData?.lastUpdated_videos?.toDate() || 'N/A',
    lastUpdated_books: initialData?.lastUpdated_books?.toDate() || 'N/A'
  });

  // We won't actually trigger the Admin UI here, but we can verify the keys exist 
  // or manually update one to see if listeners would catch it.
  
  const registryRef = db.collection('sync_registry').doc('audio_books');
  const regSnap = await registryRef.get();
  console.log('Sync Registry (audio_books) version:', regSnap.data()?.version || 'N/A');

  console.log('--- Verification Complete ---');
  process.exit(0);
}

verifyMediaSync().catch(console.error);
