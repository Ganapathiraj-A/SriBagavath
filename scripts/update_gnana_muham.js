import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAKduVLomDvJtkYJV_yK27h6-WgU76FSpE",
    authDomain: "antigravity-app-5c1ff.firebaseapp.com",
    projectId: "antigravity-app-5c1ff",
    storageBucket: "antigravity-app-5c1ff.firebasestorage.app",
    messagingSenderId: "358075696780",
    appId: "1:358075696780:web:c27e343cb4df4fa789dda9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function update() {
  console.log("Searching for 'Gnana Muham'...");
  const q = query(collection(db, 'programTypes'), where('name', '==', 'Gnana Muham'));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("Gnana Muham not found in programTypes.");
    // Try without space just in case
    const q2 = query(collection(db, 'programTypes'), where('name', '==', 'GnanaMuham'));
    const snap2 = await getDocs(q2);
    if (snap2.empty) {
        console.log("GnanaMuham also not found.");
        process.exit(1);
    }
    const docId = snap2.docs[0].id;
    await updateDoc(doc(db, 'programTypes', docId), {
        introYoutubeUrl: 'https://youtu.be/dwW2bfziwT8'
    });
    console.log("Updated GnanaMuham");
  } else {
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, 'programTypes', docId), {
        introYoutubeUrl: 'https://youtu.be/dwW2bfziwT8'
    });
    console.log("Updated Gnana Muham");
  }
}
update().then(() => {
    console.log("Done");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
