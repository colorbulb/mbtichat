import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeNWoXGlC_cjXXATuauAmjBom-sVYjMEQ",
  authDomain: "intjchat.firebaseapp.com",
  projectId: "intjchat",
  storageBucket: "intjchat.firebasestorage.app",
  messagingSenderId: "993280462756",
  appId: "1:993280462756:web:1348268d9e3cd5b843fb31",
  measurementId: "G-T90XD8M1G9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Enable persistence - this ensures auth state persists across page refreshes
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);
const functions = getFunctions(app);

// Initialize messaging only if supported
let messaging: ReturnType<typeof getMessaging> | null = null;
isMessagingSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch((error) => {
  console.error('Error checking messaging support:', error);
});

export { auth, db, storage, analytics, functions, messaging };