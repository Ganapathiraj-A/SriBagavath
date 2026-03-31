const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./src/firebase_config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  try {
    const docRef = doc(db, 'daily_zoom_teachers', '6w2e85dtdmcdwRkkRD0g');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      console.log('Legacy Rathy:', JSON.stringify(data, null, 2));
    } else {
      console.log('Rathy not found in legacy collection!');
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
