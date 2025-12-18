import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase config
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: "AIzaSyCGd_7SY0q_8WjiJNfEL7N5XbKOtniH3Pw",
    authDomain: "antigravity-app-5c1ff.firebaseapp.com",
    projectId: "antigravity-app-5c1ff",
    storageBucket: "antigravity-app-5c1ff.firebasestorage.app",
    messagingSenderId: "358075696780",
    appId: "1:358075696780:web:c27e343cb4df4fa789dda9",
    measurementId: "G-6D7JC3KBF5"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

// Initialize Auth
import { getAuth } from 'firebase/auth';
export const auth = getAuth(app);
