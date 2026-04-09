const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkPrograms() {
    const today = new Date().toLocaleDateString('en-CA');
    console.log('Today (en-CA):', today);

    const programsRef = db.collection('programs');
    const snapshot = await programsRef.where('programDate', '>=', today).orderBy('programDate', 'asc').get();

    console.log('Upcoming programs count:', snapshot.size);
    if (snapshot.size > 0) {
        snapshot.docs.forEach(doc => {
            console.log(`- ${doc.id}: ${doc.data().programName} at ${doc.data().programDate}`);
        });
    } else {
        console.log('No upcoming programs found in DB with query.');
        // Check if there are ANY programs
        const allSnap = await programsRef.limit(5).get();
        console.log('Total programs (limit 5):', allSnap.size);
        allSnap.docs.forEach(doc => {
            console.log(`- ${doc.id}: ${doc.data().programName} at ${doc.data().programDate}`);
        });
    }
}

checkPrograms().catch(console.error);
