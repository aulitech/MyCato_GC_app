import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configure Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyANo1eESWXTEumIdvcvOV2cat1ZGbyrhvg",
  authDomain: "sk-exp.firebaseapp.com",
  projectId: "sk-exp",
  storageBucket: "sk-exp.firebasestorage.app",
  messagingSenderId: "772476640334",
  appId: "1:772476640334:web:44f8a8bd36dc93f66b371f",
  measurementId: "G-S2D53Z2B6Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firestore functions for use in other files
export { app, auth, db, storage, collection, addDoc, setDoc, doc };