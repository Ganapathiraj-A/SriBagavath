import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

// Production Config
const prodConfig = {
    apiKey: "AIzaSyCGd_7SY0q_8WjiJNfEL7N5XbKOtniH3Pw",
    authDomain: "antigravity-app-5c1ff.firebaseapp.com",
    projectId: "antigravity-app-5c1ff",
    storageBucket: "antigravity-app-5c1ff.firebasestorage.app",
    messagingSenderId: "358075696780",
    appId: "1:358075696780:web:c27e343cb4df4fa789dda9"
};

// Dev Config
const devConfig = {
    apiKey: "AIzaSyDcWq4rwAmFznpm3KT-AqljZHy17w9Wj1Q",
    authDomain: "sri-bagavath-dev.firebaseapp.com",
    projectId: "sri-bagavath-dev",
    storageBucket: "sri-bagavath-dev.firebasestorage.app",
    messagingSenderId: "265576571338",
    appId: "1:265576571338:web:d03c5576d41e0c2a25ef33"
};

const prodApp = initializeApp(prodConfig, 'prod');
const devApp = initializeApp(devConfig, 'dev');

const prodDb = getFirestore(prodApp);
const devDb = getFirestore(devApp);

const collectionsToMigrate = [
    'programs',
    'program_banners',
    'consultants',
    'sathsangs',
    'online_meetings',
    'schedules',
    'programTypes'
];

async function migrateCollection(name) {
    console.log(`\n--- Migrating Collection: ${name} ---`);
    try {
        const prodRef = collection(prodDb, name);
        const snapshot = await getDocs(prodRef);
        console.log(`Found ${snapshot.size} documents in Production.`);

        let count = 0;
        for (const record of snapshot.docs) {
            const data = record.data();
            await setDoc(doc(devDb, name, record.id), data);
            count++;
            if (count % 10 === 0) console.log(`Migrated ${count} docs...`);
        }
        console.log(`Successfully migrated ${count} documents for ${name}.`);
    } catch (err) {
        console.error(`Error migrating ${name}:`, err.message);
    }
}

async function setupSuperAdmin() {
    console.log(`\n--- Setting up Super Admin ---`);
    const email = 'ganapathiraj@gmail.com';
    try {
        await setDoc(doc(devDb, 'admins', email), {
            email: email,
            role: 'SUPER_ADMIN',
            permissions: ['CONFIGURATION', 'PROGRAM_MANAGEMENT', 'PROGRAM_TYPES', 'MANAGE_USERS', 'PROGRAM_CONVERSATIONS', 'SCHEDULE_MANAGEMENT', 'CONSULTATION_MANAGEMENT', 'ADMIN_REVIEW'],
            timestamp: new Date()
        });
        console.log(`Successfully set ${email} as SUPER_ADMIN in dev database.`);
    } catch (err) {
        console.error(`Error setting Super Admin:`, err.message);
    }
}

async function runRegistration() {
    for (const coll of collectionsToMigrate) {
        await migrateCollection(coll);
    }
    await setupSuperAdmin();
    console.log('\nMigration Task Finished!');
    process.exit(0);
}

runRegistration();
