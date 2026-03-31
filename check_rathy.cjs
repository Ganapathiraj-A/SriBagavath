const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./src/firebase_config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  try {
    const ref = collection(db, 'teachers');
    const q = query(ref, where('name', '>=', 'Rathy'), where('name', '<=', 'Rathy\uf8ff'));
    const snap = await getDocs(q);
    console.log('Matches:', snap.size);
    snap.forEach(doc => {
      const data = doc.data();
      console.log('ID:', doc.id, 'Name:', data.name, 'Image:', data.image ? data.image.substring(0, 50) + '...' : 'NONE');
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
