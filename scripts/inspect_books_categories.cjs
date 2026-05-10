const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectBooks() {
  const booksRef = db.collection('books');
  const snapshot = await booksRef.get();

  const results = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    results.push({
        title: data.title,
        category: data.category,
        isActive: data.isActive !== false
    });
  });

  const englishBooks = results.filter(b => b.category === 'English Books');
  console.log('English Books:', englishBooks);
}

inspectBooks().catch(console.error);
