const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./src/firebase_config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  try {
    const ref = collection(db, 'teachers');
    const snap = await getDocs(ref);
    console.log('Total teachers:', snap.size);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | Name: ${data.name} | Image: ${data.image ? data.image.substring(0, 30) + '...' : 'NONE'}`);
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
