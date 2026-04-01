const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function update() {
  console.log("Searching for 'Gnana Muham'...");
  const snap = await db.collection('programTypes').where('name', '==', 'Gnana Muham').get();
  if (snap.empty) {
    console.log("Gnana Muham not found in programTypes.");
    const snap2 = await db.collection('programTypes').where('name', '==', 'GnanaMuham').get();
    if (snap2.empty) {
        console.log("GnanaMuham also not found.");
        process.exit(1);
    }
    await snap2.docs[0].ref.update({
        introYoutubeUrl: 'https://youtu.be/dwW2bfziwT8'
    });
    console.log("Updated GnanaMuham");
  } else {
    await snap.docs[0].ref.update({
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
