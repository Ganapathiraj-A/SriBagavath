const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testQuery(category, orderField) {
  console.log(`Testing query: category == "${category}" ORDER BY ${orderField} ASC`);
  try {
    const ref = db.collection('books');
    const q = ref.where('category', '==', category).orderBy(orderField, 'asc');
    const snapshot = await q.get();
    console.log(`Found ${snapshot.size} books for ${category} ordered by ${orderField}`);
  } catch (err) {
    console.error(`Query FAILED for ${category} ordered by ${orderField}:`, err.message);
  }
}

async function run() {
  await testQuery('Tamil Books', 'title');
  await testQuery('English Books', 'title');
  await testQuery('Tamil Books', 'order');
  await testQuery('English Books', 'order');
}

run().catch(console.error);
