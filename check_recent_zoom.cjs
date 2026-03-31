const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./src/firebase_config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  try {
    const ref = collection(db, 'daily_zoom_meetings');
    const q = query(ref, orderBy('date', 'desc'), limit(10));
    const snap = await getDocs(q);
    console.log('Recent Daily Zoom Meetings:', snap.size);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | Date: ${data.date} | Name: ${data.name} | Image: ${data.image ? data.image.substring(0, 30) + '...' : 'NONE'}`);
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
