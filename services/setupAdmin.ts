// Setup script to create admin user
// Run this once to initialize the admin user in Firebase
// You can call this from the browser console or create a one-time setup page

import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const setupAdminUser = async () => {
  try {
    const email = 'lc@ne.ai';
    const password = '123123';
    const username = 'admin';

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Create user document in Firestore
    // The document ID (userId) links to the Firebase Auth UID
    await setDoc(doc(db, 'users', userId), {
      username,
      email,
      birthDate: '1980-01-01',
      age: 44,
      gender: 'Other',
      mbti: 'ENTJ',
      isAdmin: true,
      role: 'admin',
      bio: 'System Administrator',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      isOnline: false,
      lastSeen: serverTimestamp()
    });

    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', userId);
    
    return { success: true, userId };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists');
      return { success: false, error: 'User already exists' };
    }
    console.error('Error creating admin user:', error);
    throw error;
  }
};

// To use this script:
// 1. Import it in your app: import { setupAdminUser } from './services/setupAdmin';
// 2. Call it once: await setupAdminUser();
// Or run in browser console after importing

