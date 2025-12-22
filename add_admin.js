
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCGd_7SY0q_8WjiJNfEL7N5XbKOtniH3Pw",
    authDomain: "antigravity-app-5c1ff.firebaseapp.com",
    projectId: "antigravity-app-5c1ff",
    storageBucket: "antigravity-app-5c1ff.firebasestorage.app",
    messagingSenderId: "358075696780",
    appId: "1:358075696780:web:c27e343cb4df4fa789dda9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const adminUid = "aJU4taNo52faHry49mvBoRMI74i2";
const adminEmail = "ganapathy.angappan@gmail.com";

async function addAdmin() {
    try {
        await setDoc(doc(db, 'admins', adminUid), {
            email: adminEmail,
            displayName: "Ganapathy Angappan",
            grantedAt: Timestamp.now(),
            grantedBy: 'AI Agent'
        });
        console.log(`Successfully added ${adminEmail} as admin.`);
    } catch (e) {
        console.error("Error adding admin:", e);
    }
}

addAdmin();
