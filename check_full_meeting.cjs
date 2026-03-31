const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./src/firebase_config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  try {
    const ref = collection(db, 'daily_zoom_meetings');
    const q = query(ref, orderBy('date', 'desc'), limit(5));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      console.log('ID:', doc.id);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
