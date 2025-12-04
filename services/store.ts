import { User, ChatRoom, ChatMessage, MessageType, IcebreakerTemplate, ChatStats } from '../types';
import { MBTI_PROFILES } from '../constants';
import { auth, db, storage } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  Timestamp,
  addDoc,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  uploadString
} from 'firebase/storage';
import imageCompression from 'browser-image-compression';

// Helper to calculate age from birthdate
const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birthDateObj = new Date(birthDate);
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  return age;
};

// Convert Firestore document to User
const docToUser = (docData: any, id: string): User => {
  const data = docData;
  const user = {
    id,
    username: data.username || '',
    email: data.email || '',
    birthDate: data.birthDate || '2000-01-01',
    age: data.age || 0,
    gender: data.gender || 'Other',
    mbti: data.mbti || 'INTJ',
    isAdmin: data.isAdmin === true || data.isAdmin === 'true' || false, // Explicitly check for true
    role: data.role || (data.isAdmin ? 'admin' : 'user'),
    visibleToUsers: data.visibleToUsers !== false, // Default to true if not set
    avatarUrl: data.avatarUrl || '',
    bio: data.bio || '',
    isOnline: data.isOnline || false,
    lastSeen: data.lastSeen?.toMillis?.() || data.lastSeen || Date.now(),
    apiCallLimit: data.apiCallLimit ?? 10, // Default: 10
    apiCallsUsed: data.apiCallsUsed ?? 0, // Default: 0
    photos: data.photos || [],
    hobbies: data.hobbies || [],
    redFlags: data.redFlags || [],
    audioRecordings: data.audioRecordings || []
  };
  console.log('🔍 [Store] docToUser - Raw data:', data);
  console.log('🔍 [Store] docToUser - Parsed isAdmin:', user.isAdmin);
  console.log('🔍 [Store] docToUser - Parsed role:', user.role);
  console.log('🔍 [Store] docToUser - Parsed visibleToUsers:', user.visibleToUsers);
  return user;
};

// Convert User to Firestore document
const userToDoc = (user: Partial<User>): any => {
  const { id, password, ...userData } = user;
  return {
    ...userData,
    lastSeen: userData.lastSeen ? Timestamp.fromMillis(userData.lastSeen) : serverTimestamp()
  };
};

class FirebaseStore {
  private currentUser: User | null = null;
  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    this.restoreSession();
  }

  // --- Auth & Session ---
  
  private restoreSession() {
    this.authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Wrap entire callback in try-catch to prevent unhandled promise rejections
      try {
        console.log('🔍 [Store] Auth state changed:', firebaseUser?.email);
        if (firebaseUser) {
          try {
            // Special handling for admin user
            if (firebaseUser.email === 'lc@ne.ai') {
              try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  // Ensure admin privileges
                  if (!userData.isAdmin || userData.role !== 'admin') {
                    console.log('🔍 [Store] Updating admin privileges in restoreSession');
                    try {
                      await updateDoc(doc(db, 'users', firebaseUser.uid), {
                        isAdmin: true,
                        role: 'admin'
                      });
                    } catch (updateError: any) {
                      // Silently ignore update errors - not critical
                      console.warn('🔍 [Store] Could not update admin privileges (may need to login):', updateError?.code);
                    }
                  }
                  // Return with forced admin privileges
                  this.currentUser = {
                    ...docToUser(userData, firebaseUser.uid),
                    isAdmin: true,
                    role: 'admin'
                  };
                } else {
                  // Create admin document if it doesn't exist
                  const adminUser: User = {
                    id: firebaseUser.uid,
                    username: 'admin',
                    email: 'lc@ne.ai',
                    birthDate: '1980-01-01',
                    age: 44,
                    gender: 'Other',
                    mbti: 'ENTJ',
                    isAdmin: true,
                    role: 'admin',
                    bio: 'System Administrator',
                    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
                    isOnline: false,
                    lastSeen: Date.now()
                  };
                  try {
                    await setDoc(doc(db, 'users', firebaseUser.uid), userToDoc(adminUser));
                  } catch (createError: any) {
                    // Silently ignore create errors - user can create on login
                    console.warn('🔍 [Store] Could not create admin document (may need to login):', createError?.code);
                  }
                  this.currentUser = adminUser;
                }
                // Update presence (ignore errors silently)
                try {
                  await this.updatePresence(firebaseUser.uid, true);
                } catch (presenceError: any) {
                  // Silently ignore presence errors - not critical for app functionality
                  console.warn('🔍 [Store] Could not update presence (may need to login):', presenceError?.code);
                }
              } catch (adminError: any) {
                // If we can't restore admin session, clear user and let them login again
                console.warn('🔍 [Store] Could not restore admin session (may need to login):', adminError?.code);
                this.currentUser = null;
              }
            } else {
              try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                  this.currentUser = docToUser(userDoc.data(), firebaseUser.uid);
                  // Update presence (ignore errors silently)
                  try {
                    await this.updatePresence(firebaseUser.uid, true);
                  } catch (presenceError: any) {
                    // Silently ignore presence errors - not critical for app functionality
                    console.warn('🔍 [Store] Could not update presence (may need to login):', presenceError?.code);
                  }
                } else {
                  console.warn('🔍 [Store] User document not found for:', firebaseUser.email);
                  this.currentUser = null;
                }
              } catch (userError: any) {
                // If we can't restore user session, clear user and let them login again
                console.warn('🔍 [Store] Could not restore user session (may need to login):', userError?.code);
                this.currentUser = null;
              }
            }
          } catch (error: any) {
            // Catch any unexpected errors
            console.warn('🔍 [Store] Error restoring session (may need to login):', error?.code || error?.message);
            this.currentUser = null;
          }
        } else {
          console.log('🔍 [Store] No Firebase user, clearing currentUser');
          this.currentUser = null;
        }
      } catch (error: any) {
        // Final catch-all to prevent unhandled promise rejections
        console.warn('🔍 [Store] Unexpected error in auth state change (may need to login):', error?.code || error?.message);
        this.currentUser = null;
      }
    });
  }

  async login(usernameOrEmail: string, password: string): Promise<User | null> {
    try {
      // Try to find user by username first (for backward compatibility)
      let email = usernameOrEmail;
      
      // If it doesn't look like an email, try to find user by username
      if (!usernameOrEmail.includes('@')) {
        const usersQuery = query(collection(db, 'users'), where('username', '==', usernameOrEmail));
        const querySnapshot = await getDocs(usersQuery);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          email = userData.email || usernameOrEmail;
        } else {
          // If username not found, try as email anyway
          email = usernameOrEmail;
        }
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      // Special handling for admin user lc@ne.ai
      if (email === 'lc@ne.ai') {
        console.log('🔍 [Store] Admin user lc@ne.ai detected');
        
        // If document doesn't exist, create it
        if (!userDoc.exists()) {
          console.log('🔍 [Store] Creating admin user document for lc@ne.ai');
          const adminUser: User = {
            id: userId,
            username: 'admin',
            email: 'lc@ne.ai',
            birthDate: '1980-01-01',
            age: 44,
            gender: 'Other',
            mbti: 'ENTJ',
            isAdmin: true,
            role: 'admin',
            bio: 'System Administrator',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            isOnline: true,
            lastSeen: Date.now()
          };
          await setDoc(doc(db, 'users', userId), userToDoc(adminUser));
          console.log('🔍 [Store] Admin user document created:', adminUser);
          this.currentUser = adminUser;
          await this.updatePresence(userId, true);
          return adminUser;
        } else {
          // Document exists - ensure it has admin privileges
          const existingData = userDoc.data();
          console.log('🔍 [Store] Existing user document found:', existingData);
          console.log('🔍 [Store] Existing isAdmin:', existingData.isAdmin);
          
          // Update document if it doesn't have admin privileges
          if (!existingData.isAdmin || existingData.role !== 'admin') {
            console.log('🔍 [Store] Updating user document to admin privileges');
            await updateDoc(doc(db, 'users', userId), {
              isAdmin: true,
              role: 'admin',
              username: existingData.username || 'admin',
              email: 'lc@ne.ai'
            });
            console.log('🔍 [Store] User document updated with admin privileges');
          }
          
          // Return user with admin privileges
          const adminUser: User = {
            id: userId,
            username: existingData.username || 'admin',
            email: 'lc@ne.ai',
            birthDate: existingData.birthDate || '1980-01-01',
            age: existingData.age || 44,
            gender: existingData.gender || 'Other',
            mbti: existingData.mbti || 'ENTJ',
            isAdmin: true, // Force admin
            role: 'admin', // Force admin role
            bio: existingData.bio || 'System Administrator',
            avatarUrl: existingData.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            isOnline: true,
            lastSeen: Date.now()
          };
          console.log('🔍 [Store] Returning admin user:', adminUser);
          this.currentUser = adminUser;
          await this.updatePresence(userId, true);
          return adminUser;
        }
      }
      
      // For non-admin users
      if (!userDoc.exists()) {
        return null;
      }
      
      const user = docToUser(userDoc.data(), userId);
      console.log('🔍 [Store] Login successful - User:', user);
      console.log('🔍 [Store] User isAdmin:', user.isAdmin);
      console.log('🔍 [Store] User role:', user.role);
      console.log('🔍 [Store] User email:', user.email);
      this.currentUser = user;
      // Update presence (errors are handled inside updatePresence)
      await this.updatePresence(userId, true);
      return user;
    } catch (error: any) {
      console.error('Login error:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      // Update presence (errors are handled inside updatePresence)
      await this.updatePresence(this.currentUser.id, false);
    }
    await signOut(auth);
    this.currentUser = null;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('🔍 [Store] getCurrentUser called');
      console.log('🔍 [Store] auth.currentUser:', auth.currentUser?.email);
      
      // Wait a bit for auth state to be ready (Firebase Auth persistence)
      if (!auth.currentUser) {
        console.log('🔍 [Store] No auth.currentUser, waiting for auth state...');
        // Wait for auth state to be restored (Firebase persists auth automatically)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check again after waiting
        if (!auth.currentUser) {
          console.log('🔍 [Store] Still no auth.currentUser after wait');
          this.currentUser = null;
          return null;
        }
      }
      
      // If we already have currentUser loaded, return it
      if (this.currentUser && this.currentUser.id === auth.currentUser?.uid) {
        console.log('🔍 [Store] Returning cached currentUser');
        return this.currentUser;
      }
      
      const userId = auth.currentUser.uid;
      const userEmail = auth.currentUser.email;
      
      // Special handling for admin user
      if (userEmail === 'lc@ne.ai') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Ensure admin privileges
            if (!userData.isAdmin || userData.role !== 'admin') {
              console.log('🔍 [Store] Updating admin privileges in getCurrentUser');
              try {
                await updateDoc(doc(db, 'users', userId), {
                  isAdmin: true,
                  role: 'admin'
                });
              } catch (updateError: any) {
                console.error('🔍 [Store] Error updating admin privileges:', updateError);
                // Continue even if update fails
              }
            }
            // Return with forced admin privileges
            const adminUser: User = {
              ...docToUser(userData, userId),
              isAdmin: true,
              role: 'admin'
            };
            this.currentUser = adminUser;
            // Update presence when user is restored (ignore errors)
            try {
              await this.updatePresence(userId, true);
            } catch (presenceError) {
              console.error('🔍 [Store] Error updating presence:', presenceError);
            }
            console.log('🔍 [Store] Returning admin user:', adminUser);
            return adminUser;
          } else {
            // Create admin document if it doesn't exist
            const adminUser: User = {
              id: userId,
              username: 'admin',
              email: 'lc@ne.ai',
              birthDate: '1980-01-01',
              age: 44,
              gender: 'Other',
              mbti: 'ENTJ',
              isAdmin: true,
              role: 'admin',
              bio: 'System Administrator',
              avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
              isOnline: false,
              lastSeen: Date.now()
            };
            try {
              await setDoc(doc(db, 'users', userId), userToDoc(adminUser));
            } catch (createError: any) {
              console.error('🔍 [Store] Error creating admin document:', createError);
              // Return user object even if Firestore write fails
            }
            this.currentUser = adminUser;
            // Update presence when user is restored (ignore errors)
            try {
              await this.updatePresence(userId, true);
            } catch (presenceError) {
              console.error('🔍 [Store] Error updating presence:', presenceError);
            }
            console.log('🔍 [Store] Created and returning admin user:', adminUser);
            return adminUser;
          }
        } catch (adminError: any) {
          console.error('🔍 [Store] Error handling admin user:', adminError);
          // Return null if we can't load admin user
          this.currentUser = null;
          return null;
        }
      }
      
      // For non-admin users
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        console.log('🔍 [Store] User document exists:', userDoc.exists());
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('🔍 [Store] User document data:', userData);
          this.currentUser = docToUser(userData, userId);
          console.log('🔍 [Store] Parsed user:', this.currentUser);
          console.log('🔍 [Store] Parsed user isAdmin:', this.currentUser.isAdmin);
          console.log('🔍 [Store] Parsed user role:', this.currentUser.role);
          // Update presence when user is restored (ignore errors)
          try {
            await this.updatePresence(userId, true);
          } catch (presenceError) {
            console.error('🔍 [Store] Error updating presence:', presenceError);
          }
        } else {
          console.warn('🔍 [Store] User document not found');
          this.currentUser = null;
        }
      } catch (userError: any) {
        console.error('🔍 [Store] Error fetching user document:', userError);
        // If permission denied or other error, return null to allow login
        this.currentUser = null;
        return null;
      }
      
      console.log('🔍 [Store] Returning currentUser:', this.currentUser);
      return this.currentUser;
    } catch (error: any) {
      console.error('🔍 [Store] Unexpected error in getCurrentUser:', error);
      // Always return null on error to allow login screen to show
      this.currentUser = null;
      return null;
    }
  }

  private async updatePresence(userId: string, isOnline: boolean) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error: any) {
      // Silently fail - presence updates are not critical for app functionality
      console.error('🔍 [Store] Error updating presence:', error);
      // Don't throw - allow app to continue even if presence update fails
    }
  }

  // Subscribe to real-time user presence updates
  subscribeToUserPresence(userId: string, callback: (user: User | null) => void): () => void {
    const userRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const user = docToUser(snapshot.data(), snapshot.id);
        callback(user);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to user presence:', error);
      callback(null);
    });

    return unsubscribe;
  }

  // Subscribe to all users with real-time updates
  subscribeToAllUsers(callback: (users: User[]) => void): () => void {
    if (!auth.currentUser) {
      callback([]);
      return () => {};
    }

    const usersRef = collection(db, 'users');
    
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => {
        const userData = doc.data();
        return docToUser(userData, doc.id);
      });

      // Apply same filtering logic as getAllUsers
      const currentUser = this.currentUser;
      const isAdmin = currentUser?.isAdmin === true;

      if (isAdmin) {
        callback(allUsers);
      } else {
        const filteredUsers = allUsers.filter(user => {
          const isNotSelf = user.id !== currentUser?.id;
          const isNotAdmin = !user.isAdmin;
          const isVisible = user.visibleToUsers !== false;
          return isNotSelf && isNotAdmin && isVisible;
        });
        callback(filteredUsers);
      }
    }, (error) => {
      console.error('Error listening to users:', error);
      callback([]);
    });

    return unsubscribe;
  }

  // --- User Management ---

  async signup(userData: Omit<User, 'id' | 'lastSeen' | 'isOnline' | 'age'>): Promise<User> {
    try {
      // Use email if provided, otherwise use username@temp.com format
      const email = userData.email || `${userData.username}@temp.com`;
      const password = userData.password || 'password123';

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Calculate age
      const age = calculateAge(userData.birthDate);

      // Create user document in Firestore
    const newUser: User = { 
      ...userData, 
        id: userId,
        email,
        age,
        role: 'user', // Set role to 'user' for new signups
        apiCallLimit: 10, // Default API call limit
        apiCallsUsed: 0, // Start with 0 calls used
      isOnline: true,
      lastSeen: Date.now()
    };

      await setDoc(doc(db, 'users', userId), userToDoc(newUser));

    this.currentUser = newUser;
    return newUser;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async adminCreateUser(userData: Omit<User, 'id' | 'lastSeen' | 'isOnline' | 'age'>): Promise<User> {
    try {
      // Email is required for admin-created users (they need to link to Firebase Auth)
      if (!userData.email) {
        throw new Error('Email is required when creating users');
      }
      
      const email = userData.email;
      const password = userData.password || 'password123';

      // Create Firebase Auth user - this links the user to Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid; // Use Firebase Auth UID as the document ID

      // Calculate age
    const age = calculateAge(userData.birthDate);

      // Create user document in Firestore with role 'user'
      // The document ID matches the Firebase Auth UID, linking them together
    const newUser: User = {
      ...userData,
        id: userId, // Link to Firebase Auth UID
        email,
      age,
        role: 'user', // Set role to 'user' for admin-created users
        visibleToUsers: userData.visibleToUsers !== undefined ? userData.visibleToUsers : true, // Default to true if not specified
        apiCallLimit: userData.apiCallLimit ?? 10, // Default: 10, can be overridden by admin
        apiCallsUsed: 0, // Start with 0 calls used
      isOnline: false,
      lastSeen: Date.now()
    };
      
      console.log('🔍 [Store] Creating user with visibleToUsers:', newUser.visibleToUsers);

      // Create the Firestore document linked to the Firebase Auth user
      await setDoc(doc(db, 'users', userId), userToDoc(newUser));

    return newUser;
    } catch (error: any) {
      console.error('Admin create user error:', error);
      throw error;
    }
  }

  /**
   * Uploads avatar image to Firebase Storage
   * Compresses and renames the image
   * Returns the download URL
   */
  async uploadAvatar(userId: string, file: File | Blob, username?: string, mbti?: string): Promise<string> {
    try {
      let processedFile: File | Blob = file;
      
      // Compress image if it's a File
      if (file instanceof File) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        processedFile = await imageCompression(file, options);
      }
      
      // Generate filename: username-mbtitype-date.png
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const safeUsername = (username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const mbtiType = (mbti || 'UNKNOWN').toUpperCase();
      const filename = `${safeUsername}-${mbtiType}-${date}.png`;
      
      const avatarRef = ref(storage, `avatars/${userId}/${filename}`);
      
      // Upload file
      await uploadBytes(avatarRef, processedFile);
      
      // Get download URL
      const downloadURL = await getDownloadURL(avatarRef);
      return downloadURL;
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  /**
   * Uploads chat image to Firebase Storage
   * Returns the download URL
   */
  async uploadChatImage(chatId: string, file: File | Blob): Promise<string> {
    try {
      const imageRef = ref(storage, `chats/${chatId}/images/${Date.now()}_${file instanceof File ? file.name : 'image.jpg'}`);
      
      // Upload file
      await uploadBytes(imageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error: any) {
      console.error('Upload chat image error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: any = { ...updates };
      
      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      // Note: password is handled separately via updatePassword method

      // Handle avatar upload if it's a Base64 string (data URL)
      if (updates.avatarUrl && updates.avatarUrl.startsWith('data:')) {
        try {
          // Convert Base64 to Blob
          const response = await fetch(updates.avatarUrl);
          const blob = await response.blob();
          
          // Get user data for filename
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.data();
          const username = updates.username || userData?.username || 'user';
          const mbti = updates.mbti || userData?.mbti || 'UNKNOWN';
          
          // Upload to Storage with compression and renaming
          const downloadURL = await this.uploadAvatar(userId, blob, username, mbti);
          updateData.avatarUrl = downloadURL;
        } catch (error: any) {
          console.error('Error uploading avatar:', error);
          // If upload fails, remove avatarUrl from updates to keep existing one
          delete updateData.avatarUrl;
        }
      }

      if (updates.birthDate) {
        updateData.age = calculateAge(updates.birthDate);
      }

      // Convert lastSeen if it's a number
      if (updateData.lastSeen && typeof updateData.lastSeen === 'number') {
        updateData.lastSeen = Timestamp.fromMillis(updateData.lastSeen);
      }

      await updateDoc(userRef, updateData);

      // Fetch updated user
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const updatedUser = docToUser(userDoc.data(), userId);
        if (this.currentUser?.id === userId) {
          this.currentUser = updatedUser;
        }
        return updatedUser;
    }
    return null;
    } catch (error: any) {
      console.error('Update user error:', error);
      throw error; // Re-throw to allow UI to handle errors
    }
  }

  /**
   * Updates Firebase Auth password for the current user
   * Requires re-authentication for security
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No authenticated user found');
    }

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('Update password error:', error);
      if (error.code === 'auth/wrong-password') {
        throw new Error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('New password is too weak');
      }
      throw error;
    }
  }

  /**
   * Increments API call usage for a user
   * Returns true if user has remaining calls, false if limit reached
   */
  async incrementApiCalls(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const apiCallLimit = userData.apiCallLimit ?? 10;
      const apiCallsUsed = userData.apiCallsUsed ?? 0;

      if (apiCallsUsed >= apiCallLimit) {
        return false; // Limit reached
      }

      // Increment usage
      await updateDoc(userRef, {
        apiCallsUsed: (apiCallsUsed || 0) + 1
      });

      return true;
    } catch (error: any) {
      console.error('Increment API calls error:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      // Note: Firebase Auth user deletion requires admin SDK or user to be signed in
      // For now, we'll just delete the Firestore document
      // The Auth user can be cleaned up manually or via admin functions
      
      return true;
    } catch (error: any) {
      console.error('Delete user error:', error);
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      console.log('🔍 [Store] getAllUsers - Attempting to fetch all users');
      console.log('🔍 [Store] Current auth user:', auth.currentUser?.email);
      console.log('🔍 [Store] Current auth UID:', auth.currentUser?.uid);
      
      // First, ensure we have the current user loaded
      if (!this.currentUser && auth.currentUser) {
        console.log('🔍 [Store] Loading current user first...');
        await this.getCurrentUser();
      }
      
      const currentUser = this.currentUser;
      const isAdmin = currentUser?.isAdmin === true;
      
      console.log('🔍 [Store] Current user is admin:', isAdmin);
      console.log('🔍 [Store] Current user data:', currentUser);
      
      // Try to fetch all users
      // Firestore will automatically filter based on security rules
      // Regular users will only get documents they're allowed to read
      if (!auth.currentUser) {
        console.error('❌ [Store] No authenticated user!');
        return [];
      }
      
      console.log('🔍 [Store] Fetching users collection...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log('🔍 [Store] getAllUsers - Success! Found', usersSnapshot.docs.length, 'users');
      
      const allUsers = usersSnapshot.docs.map(doc => {
        const userData = doc.data();
        console.log('🔍 [Store] Processing user:', userData.username, 'isAdmin:', userData.isAdmin, 'visibleToUsers:', userData.visibleToUsers);
        return docToUser(userData, doc.id);
      });
      
      if (isAdmin) {
        // Admin can see all users
        console.log('🔍 [Store] Returning all users for admin');
        return allUsers;
      } else {
        // Regular users can only see:
        // 1. Other users (not themselves)
        // 2. Non-admin users
        // 3. Users with visibleToUsers !== false (defaults to true if undefined)
        const filteredUsers = allUsers.filter(user => {
          const isNotSelf = user.id !== currentUser?.id;
          const isNotAdmin = !user.isAdmin;
          // visibleToUsers defaults to true if not set, so check !== false
          const isVisible = user.visibleToUsers !== false;
          
          console.log(`🔍 [Store] User ${user.username}: isNotSelf=${isNotSelf}, isNotAdmin=${isNotAdmin}, isVisible=${isVisible}, visibleToUsers=${user.visibleToUsers}`);
          
          return isNotSelf && isNotAdmin && isVisible;
        });
        
        console.log('🔍 [Store] Total users fetched:', allUsers.length);
        console.log('🔍 [Store] Filtered users for regular user:', filteredUsers.length);
        console.log('🔍 [Store] Filtered user list:', filteredUsers.map(u => ({ username: u.username, visibleToUsers: u.visibleToUsers })));
        return filteredUsers;
      }
    } catch (error: any) {
      console.error('❌ [Store] Get all users error:', error);
      console.error('❌ [Store] Error code:', error.code);
      console.error('❌ [Store] Error message:', error.message);
      
      if (error.code === 'permission-denied') {
        const currentUser = this.currentUser;
        const isAdmin = currentUser?.isAdmin === true;
        
        if (isAdmin) {
          console.error('❌ [Store] PERMISSION DENIED for ADMIN user!');
          console.error('❌ [Store] This should not happen. Please check:');
          console.error('   1. Firestore rules are deployed correctly');
          console.error('   2. Admin user document has isAdmin: true (boolean)');
          console.error('   3. Admin user UID matches Firebase Auth UID');
          console.error('   4. Sign out and sign back in to refresh auth token');
        } else {
          console.error('❌ [Store] PERMISSION DENIED for regular user!');
          console.error('❌ [Store] This means Firestore rules are blocking the query.');
          console.error('❌ [Store] Please ensure:');
          console.error('   1. Firestore rules are deployed');
          console.error('   2. Rules allow regular users to read non-admin, visible users');
          console.error('   3. User documents have visibleToUsers: true (or field missing)');
        }
      }
      
      return [];
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        return docToUser(userDoc.data(), id);
      }
      return undefined;
    } catch (error: any) {
      console.error('Get user by id error:', error);
      return undefined;
    }
  }

  // --- Chats & Media ---
  // Real-time Firestore implementation

  // Helper to generate consistent chat ID from two user IDs
  private getChatId(user1Id: string, user2Id: string): string {
    const sorted = [user1Id, user2Id].sort();
    return `chat_${sorted[0]}_${sorted[1]}`;
  }

  async getChat(user1Id: string, user2Id: string): Promise<ChatRoom> {
    const chatId = this.getChatId(user1Id, user2Id);
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    if (chatDoc.exists()) {
      const data = chatDoc.data();
      return {
        id: chatId,
        participants: data.participants || [user1Id, user2Id],
        messages: [], // Messages are stored separately in subcollection
        lastMessage: data.lastMessage ? {
          id: data.lastMessage.id,
          senderId: data.lastMessage.senderId,
          text: data.lastMessage.text,
          type: data.lastMessage.type || 'text',
          timestamp: data.lastMessage.timestamp?.toMillis?.() || data.lastMessage.timestamp,
          readBy: data.lastMessage.readBy || []
        } : undefined
      };
    } else {
      // Create new chat
      const newChat = {
        participants: [user1Id, user2Id],
        createdAt: serverTimestamp(),
        lastMessage: null
      };
      await setDoc(chatRef, newChat);
      return {
        id: chatId,
        participants: [user1Id, user2Id],
        messages: []
      };
    }
  }

  // Get messages for a specific chat (for admin viewing)
  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(messagesQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          imageUrl: data.imageUrl,
          stickerUrl: data.stickerUrl,
          type: data.type || 'text',
          translatedText: data.translatedText,
          timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now(),
          readBy: data.readBy || [],
          isTranslating: data.isTranslating || false,
          eventId: data.eventId,
          privateDate: data.privateDate,
          reactions: data.reactions || {}
        } as ChatMessage;
      });
    } catch (error: any) {
      console.error('Get chat messages error:', error);
      return [];
    }
  }

  // Subscribe to real-time chat messages
  subscribeToChatMessages(
    chatId: string, 
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          imageUrl: data.imageUrl,
          stickerUrl: data.stickerUrl,
          type: data.type || 'text',
          translatedText: data.translatedText,
          timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now(),
          readBy: data.readBy || [],
          isTranslating: data.isTranslating || false,
          eventId: data.eventId,
          privateDate: data.privateDate,
          reactions: data.reactions || {}
        } as ChatMessage;
      });
      callback(messages);
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    return unsubscribe;
  }

  // Subscribe to typing status in a chat
  subscribeToTypingStatus(
    chatId: string,
    callback: (typingUsers: { [userId: string]: number }) => void
  ): () => void {
    const chatRef = doc(db, 'chats', chatId);
    
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const typingUsers = data.typingUsers || {};
        // Filter out typing status older than 3 seconds
        const now = Date.now();
        const activeTyping: { [userId: string]: number } = {};
        for (const [userId, timestamp] of Object.entries(typingUsers)) {
          const ts = (timestamp as any)?.toMillis?.() || timestamp;
          if (now - ts < 3000) {
            activeTyping[userId] = ts;
          }
        }
        callback(activeTyping);
      } else {
        callback({});
      }
    }, (error) => {
      console.error('Error listening to typing status:', error);
    });

    return unsubscribe;
  }

  async getAllChats(): Promise<ChatRoom[]> {
    try {
      if (!auth.currentUser) return [];
      
      // Check if current user is admin - admins can see all chats
      const currentUser = this.currentUser;
      const isAdmin = currentUser?.isAdmin === true;
      
      let chatsSnapshot;
      if (isAdmin) {
        // Admin: Get ALL chats without filtering
        chatsSnapshot = await getDocs(collection(db, 'chats'));
      } else {
        // Regular user: Get only chats where they are a participant
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', auth.currentUser.uid)
        );
        chatsSnapshot = await getDocs(chatsQuery);
      }
      
      return chatsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          participants: data.participants || [],
          messages: [], // Messages loaded separately
          lastMessage: data.lastMessage ? {
            id: data.lastMessage.id,
            senderId: data.lastMessage.senderId,
            text: data.lastMessage.text,
            type: data.lastMessage.type || 'text',
            timestamp: data.lastMessage.timestamp?.toMillis?.() || data.lastMessage.timestamp,
            readBy: data.lastMessage.readBy || []
          } : undefined
        };
      });
    } catch (error: any) {
      console.error('Get all chats error:', error);
      return [];
    }
  }

  async sendMessage(
    chatId: string, 
    senderId: string, 
    content: string, 
    type: MessageType = 'text', 
    extraUrl?: string
  ): Promise<ChatMessage> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      
      // Build message data - only include fields that have values (Firestore doesn't allow undefined)
      const messageData: any = {
        senderId,
        type,
        timestamp: serverTimestamp(),
        readBy: [senderId],
        isTranslating: false
      };
      
      // Handle image upload if it's a Base64 string (data URL)
      let imageUrl = extraUrl;
      if (type === 'image' && extraUrl && extraUrl.startsWith('data:')) {
        try {
          // Convert Base64 to Blob
          const response = await fetch(extraUrl);
          const blob = await response.blob();
          
          // Upload to Storage
          imageUrl = await this.uploadChatImage(chatId, blob);
        } catch (error: any) {
          console.error('Error uploading chat image:', error);
          throw new Error('Failed to upload image');
        }
      }
      
      // Only add fields that have values
      if (type === 'text') {
        messageData.text = content;
      } else if (type === 'image' && imageUrl) {
        messageData.imageUrl = imageUrl;
      } else if (type === 'sticker' && extraUrl) {
        messageData.stickerUrl = extraUrl;
      } else if (type === 'event' && extraUrl) {
        messageData.eventId = extraUrl;
        messageData.text = content;
      } else if (type === 'private_date') {
        // This will be handled by sendPrivateDateMessage
      }

      const docRef = await addDoc(messagesRef, messageData);
      
      // Update chat's lastMessage - only include fields that have values
      const chatRef = doc(db, 'chats', chatId);
      const lastMessageData: any = {
        id: docRef.id,
        senderId,
        type,
        timestamp: serverTimestamp(),
        readBy: [senderId]
      };
      
      if (type === 'text') {
        lastMessageData.text = content;
      } else if (type === 'image' && imageUrl) {
        lastMessageData.imageUrl = imageUrl;
      } else if (type === 'sticker' && extraUrl) {
        lastMessageData.stickerUrl = extraUrl;
      } else if (type === 'event' && extraUrl) {
        lastMessageData.eventId = extraUrl;
        lastMessageData.text = content;
      }
      
      await updateDoc(chatRef, {
        lastMessage: lastMessageData
      });

      const msg: ChatMessage = {
        id: docRef.id,
        senderId,
        text: type === 'text' ? content : undefined,
        imageUrl: type === 'image' ? imageUrl : undefined,
        stickerUrl: type === 'sticker' ? extraUrl : undefined,
        type,
        timestamp: Date.now(),
        readBy: [senderId]
      };

      // Update chat stats for milestones (do not compute on the fly)
      try {
        await this.updateChatStatsOnMessage(chatId);
      } catch (statsError: any) {
        console.warn('Update chat stats error (non-fatal):', statsError);
      }

      return msg;
    } catch (error: any) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Sends a private date message
   */
  async sendPrivateDateMessage(chatId: string, senderId: string, privateDate: any): Promise<ChatMessage> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      
      const messageData: any = {
        senderId,
        type: 'private_date',
        timestamp: serverTimestamp(),
        readBy: [senderId],
        isTranslating: false,
        privateDate: {
          category: privateDate.category,
          time: privateDate.time,
          place: privateDate.place,
          createdAt: privateDate.createdAt
        },
        text: `Private Date: ${privateDate.category} at ${privateDate.place}`
      };

      const docRef = await addDoc(messagesRef, messageData);
      
      // Update chat's lastMessage
      const chatRef = doc(db, 'chats', chatId);
      const lastMessageData: any = {
        id: docRef.id,
        senderId,
        type: 'private_date',
        timestamp: serverTimestamp(),
        readBy: [senderId],
        text: messageData.text,
        privateDate: messageData.privateDate
      };
      
      await updateDoc(chatRef, {
        lastMessage: lastMessageData
      });

      const msg: ChatMessage = {
        id: docRef.id,
        senderId,
        type: 'private_date',
        text: messageData.text,
        timestamp: Date.now(),
        readBy: [senderId],
        privateDate: privateDate
      };

      // Update chat stats for milestones
      try {
        await this.updateChatStatsOnMessage(chatId);
      } catch (statsError: any) {
        console.warn('Update chat stats error (non-fatal):', statsError);
      }

      return msg;
    } catch (error: any) {
      console.error('Send private date message error:', error);
      throw error;
    }
  }

  async markChatRead(chatId: string, userId: string): Promise<void> {
    try {
      // Mark all unread messages in this chat as read
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      const batch = snapshot.docs
        .filter(doc => {
          const readBy = doc.data().readBy || [];
          return !readBy.includes(userId);
        })
        .map(doc => {
          const currentReadBy = doc.data().readBy || [];
          return updateDoc(doc.ref, {
            readBy: [...currentReadBy, userId]
          });
        });

      await Promise.all(batch);
    } catch (error: any) {
      console.error('Mark chat read error:', error);
    }
  }

  async updateMessageTranslation(chatId: string, msgId: string, translation: string): Promise<void> {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', msgId);
      await updateDoc(messageRef, {
        translatedText: translation,
        isTranslating: false
      });
    } catch (error: any) {
      console.error('Update message translation error:', error);
    }
  }

  // --- Personality Phrases Management ---
  
  /**
   * Gets all phrases for a specific MBTI personality type
   */
  async getPersonalityPhrases(mbti: string): Promise<string[]> {
    try {
      const phrasesRef = doc(db, 'personality_phrases', mbti);
      const phrasesDoc = await getDoc(phrasesRef);
      
      if (phrasesDoc.exists()) {
        const data = phrasesDoc.data();
        return data.phrases || [];
      }
      return [];
    } catch (error: any) {
      console.error('Get personality phrases error:', error);
      return [];
    }
  }

  /**
   * Sets phrases for a specific MBTI personality type (admin only)
   */
  async setPersonalityPhrases(mbti: string, phrases: string[]): Promise<void> {
    try {
      const phrasesRef = doc(db, 'personality_phrases', mbti);
      await setDoc(phrasesRef, {
        mbti,
        phrases,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Set personality phrases error:', error);
      throw error;
    }
  }

  /**
   * Gets all personality phrases (for admin management)
   */
  async getAllPersonalityPhrases(): Promise<Record<string, string[]>> {
    try {
      const phrasesRef = collection(db, 'personality_phrases');
      const snapshot = await getDocs(phrasesRef);
      
      const result: Record<string, string[]> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        result[doc.id] = data.phrases || [];
      });
      
      return result;
    } catch (error: any) {
      console.error('Get all personality phrases error:', error);
      return {};
    }
  }

  /**
   * Uploads user photo to Firebase Storage
   * Compresses and renames the image
   * Returns the download URL
   */
  async uploadUserPhoto(userId: string, file: File | Blob, username?: string, mbti?: string): Promise<string> {
    try {
      let processedFile: File | Blob = file;
      
      // Compress image if it's a File
      if (file instanceof File) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        processedFile = await imageCompression(file, options);
      }
      
      // Generate filename: username-mbtitype-date.png
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const timestamp = Date.now();
      const safeUsername = (username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const mbtiType = (mbti || 'UNKNOWN').toUpperCase();
      const filename = `${safeUsername}-${mbtiType}-${date}-${timestamp}.png`;
      
      const photoRef = ref(storage, `users/${userId}/photos/${filename}`);
      await uploadBytes(photoRef, processedFile);
      const downloadURL = await getDownloadURL(photoRef);
      return downloadURL;
    } catch (error: any) {
      console.error('Upload user photo error:', error);
      throw error;
    }
  }

  /**
   * Uploads audio recording to Firebase Storage
   * Returns the download URL
   */
  async uploadAudioRecording(userId: string, file: File | Blob): Promise<string> {
    try {
      const audioRef = ref(storage, `users/${userId}/audio/${Date.now()}_${file instanceof File ? file.name : 'audio.webm'}`);
      await uploadBytes(audioRef, file);
      const downloadURL = await getDownloadURL(audioRef);
      return downloadURL;
    } catch (error: any) {
      console.error('Upload audio recording error:', error);
      throw error;
    }
  }

  // --- Audio Questions Management (Admin) ---
  
  /**
   * Gets all audio questions (for admin management)
   */
  async getAllAudioQuestions(): Promise<any[]> {
    try {
      const questionsRef = collection(db, 'audio_questions');
      const snapshot = await getDocs(questionsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error: any) {
      console.error('Get all audio questions error:', error);
      return [];
    }
  }

  /**
   * Creates a new audio question (admin only)
   */
  async createAudioQuestion(questionText: string): Promise<string> {
    try {
      const questionsRef = collection(db, 'audio_questions');
      const docRef = await addDoc(questionsRef, {
        questionText,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      console.error('Create audio question error:', error);
      throw error;
    }
  }

  /**
   * Deletes an audio question (admin only)
   */
  async deleteAudioQuestion(questionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'audio_questions', questionId));
    } catch (error: any) {
      console.error('Delete audio question error:', error);
      throw error;
    }
  }

  // --- Hobbies & Red Flags Management (Admin) ---
  
  /**
   * Gets all available hobbies (for admin management)
   */
  async getAllHobbies(): Promise<string[]> {
    try {
      const hobbiesRef = doc(db, 'system_data', 'hobbies');
      const hobbiesDoc = await getDoc(hobbiesRef);
      if (hobbiesDoc.exists()) {
        return hobbiesDoc.data().list || [];
      }
      return [];
    } catch (error: any) {
      console.error('Get all hobbies error:', error);
      return [];
    }
  }

  /**
   * Sets all available hobbies (admin only)
   */
  async setAllHobbies(hobbies: string[]): Promise<void> {
    try {
      const hobbiesRef = doc(db, 'system_data', 'hobbies');
      await setDoc(hobbiesRef, { list: hobbies }, { merge: true });
    } catch (error: any) {
      console.error('Set all hobbies error:', error);
      throw error;
    }
  }

  /**
   * Gets all available red flags (for admin management)
   */
  async getAllRedFlags(): Promise<string[]> {
    try {
      const redFlagsRef = doc(db, 'system_data', 'red_flags');
      const redFlagsDoc = await getDoc(redFlagsRef);
      if (redFlagsDoc.exists()) {
        return redFlagsDoc.data().list || [];
      }
      return [];
    } catch (error: any) {
      console.error('Get all red flags error:', error);
      return [];
    }
  }

  /**
   * Sets all available red flags (admin only)
   */
  async setAllRedFlags(redFlags: string[]): Promise<void> {
    try {
      const redFlagsRef = doc(db, 'system_data', 'red_flags');
      await setDoc(redFlagsRef, { list: redFlags }, { merge: true });
    } catch (error: any) {
      console.error('Set all red flags error:', error);
      throw error;
    }
  }

  // --- Events Management ---
  
  /**
   * Creates a new event
   */
  async createEvent(eventData: Omit<any, 'id' | 'createdAt'>): Promise<string> {
    try {
      const eventsRef = collection(db, 'events');
      const docRef = await addDoc(eventsRef, {
        ...eventData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      console.error('Create event error:', error);
      throw error;
    }
  }

  /**
   * Gets all events
   */
  async getAllEvents(): Promise<any[]> {
    try {
      const eventsRef = collection(db, 'events');
      const snapshot = await getDocs(eventsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis?.() || Date.now()
      }));
    } catch (error: any) {
      console.error('Get all events error:', error);
      return [];
    }
  }

  /**
   * Joins an event
   */
  async joinEvent(eventId: string, userId: string): Promise<void> {
    try {
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      if (eventDoc.exists()) {
        const participants = eventDoc.data().participants || [];
        if (!participants.includes(userId)) {
          await updateDoc(eventRef, {
            participants: [...participants, userId]
          });
        }
      }
    } catch (error: any) {
      console.error('Join event error:', error);
      throw error;
    }
  }

  // --- Dating Categories Management (Admin) ---
  
  /**
   * Gets all dating categories
   */
  async getAllDatingCategories(): Promise<any[]> {
    try {
      const categoriesRef = collection(db, 'dating_categories');
      const snapshot = await getDocs(categoriesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error: any) {
      console.error('Get all dating categories error:', error);
      return [];
    }
  }

  /**
   * Creates a new dating category (admin only)
   */
  async createDatingCategory(name: string): Promise<string> {
    try {
      const categoriesRef = collection(db, 'dating_categories');
      const docRef = await addDoc(categoriesRef, {
        name,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      console.error('Create dating category error:', error);
      throw error;
    }
  }

  /**
   * Deletes a dating category (admin only)
   */
  async deleteDatingCategory(categoryId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'dating_categories', categoryId));
    } catch (error: any) {
      console.error('Delete dating category error:', error);
      throw error;
    }
  }

  // --- User Action Logging ---
  
  /**
   * Logs a user action (super translate, AI suggestion, etc.)
   */
  async logUserAction(action: 'super_translate' | 'ai_suggestion' | 'smart_reply' | 'icebreaker_used', userId: string, metadata?: any): Promise<void> {
    try {
      const logsRef = collection(db, 'user_action_logs');
      await addDoc(logsRef, {
        userId,
        action,
        timestamp: serverTimestamp(),
        metadata: metadata || {}
      });
    } catch (error: any) {
      console.error('Log user action error:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  }

  // --- Icebreakers ---

  /**
   * Gets all active icebreaker templates
   */
  async getAllIcebreakers(): Promise<IcebreakerTemplate[]> {
    try {
      const templatesRef = collection(db, 'icebreaker_templates');
      const snapshot = await getDocs(templatesRef);
      return snapshot.docs
        .map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title,
            prompt: data.prompt,
            category: data.category || 'get_to_know',
            isActive: data.isActive !== false,
            createdAt: data.createdAt || Date.now()
          } as IcebreakerTemplate;
        })
        .filter(t => t.isActive);
    } catch (error: any) {
      console.error('Get all icebreakers error:', error);
      return [];
    }
  }

  /**
   * Creates a new icebreaker template (admin only)
   */
  async createIcebreakerTemplate(title: string, prompt: string, category: IcebreakerTemplate['category']): Promise<string> {
    try {
      const refCol = collection(db, 'icebreaker_templates');
      const docRef = await addDoc(refCol, {
        title,
        prompt,
        category,
        isActive: true,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      console.error('Create icebreaker template error:', error);
      throw error;
    }
  }

  /**
   * Updates an existing icebreaker template (admin only)
   */
  async updateIcebreakerTemplate(templateId: string, updates: Partial<IcebreakerTemplate>): Promise<void> {
    try {
      const refDoc = doc(db, 'icebreaker_templates', templateId);
      const data: any = { ...updates };
      delete data.id;
      await updateDoc(refDoc, data);
    } catch (error: any) {
      console.error('Update icebreaker template error:', error);
      throw error;
    }
  }

  /**
   * Deletes an icebreaker template (admin only)
   */
  async deleteIcebreakerTemplate(templateId: string): Promise<void> {
    try {
      const refDoc = doc(db, 'icebreaker_templates', templateId);
      await deleteDoc(refDoc);
    } catch (error: any) {
      console.error('Delete icebreaker template error:', error);
      throw error;
    }
  }

  /**
   * Sends an icebreaker message into the chat
   */
  async sendIcebreakerMessage(chatId: string, senderId: string, template: IcebreakerTemplate): Promise<ChatMessage> {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');

      const messageData: any = {
        senderId,
        type: 'icebreaker',
        timestamp: serverTimestamp(),
        readBy: [senderId],
        isTranslating: false,
        text: template.prompt,
        icebreakerTitle: template.title,
        icebreakerPrompt: template.prompt,
        icebreakerCategory: template.category
      };

      const docRef = await addDoc(messagesRef, messageData);

      // Update chat's lastMessage
      const chatRef = doc(db, 'chats', chatId);
      const lastMessageData: any = {
        id: docRef.id,
        senderId,
        type: 'icebreaker',
        timestamp: serverTimestamp(),
        readBy: [senderId],
        text: template.prompt,
        icebreakerTitle: template.title,
        icebreakerPrompt: template.prompt,
        icebreakerCategory: template.category
      };

      await updateDoc(chatRef, {
        lastMessage: lastMessageData
      });

      // Log action
      try {
        await this.logUserAction('icebreaker_used', senderId, {
          chatId,
          templateId: template.id
        });
      } catch (logError) {
        console.warn('Log icebreaker action error (non-fatal):', logError);
      }

      // Update chat stats
      try {
        await this.updateChatStatsOnMessage(chatId);
      } catch (statsError: any) {
        console.warn('Update chat stats error (non-fatal):', statsError);
      }

      const msg: ChatMessage = {
        id: docRef.id,
        senderId,
        type: 'icebreaker',
        text: template.prompt,
        timestamp: Date.now(),
        readBy: [senderId],
        icebreakerTitle: template.title,
        icebreakerPrompt: template.prompt,
        icebreakerCategory: template.category
      };

      return msg;
    } catch (error: any) {
      console.error('Send icebreaker message error:', error);
      throw error;
    }
  }

  // --- Chat Stats & Milestones ---

  /**
   * Updates chat_stats document when a new message is sent.
   * This keeps conversation milestones precomputed (no heavy on-the-fly work).
   */
  async updateChatStatsOnMessage(chatId: string): Promise<void> {
    try {
      const statsRef = doc(db, 'chat_stats', chatId);
      const snapshot = await getDoc(statsRef);

      const now = Date.now();
      const todayStr = new Date(now).toDateString();

      let messagesCount = 0;
      let consecutiveDays = 1;
      let lastMessageDate = now;
      let milestones: string[] = [];

      if (snapshot.exists()) {
        const data = snapshot.data() as any;
        messagesCount = (data.messagesCount || 0) + 1;
        milestones = data.milestones || [];
        const last = data.lastMessageDate || now;
        lastMessageDate = now;

        const lastDateStr = new Date(last).toDateString();
        const yesterdayStr = (() => {
          const d = new Date(now);
          d.setDate(d.getDate() - 1);
          return d.toDateString();
        })();

        if (lastDateStr === todayStr) {
          consecutiveDays = data.consecutiveDays || 1;
        } else if (lastDateStr === yesterdayStr) {
          consecutiveDays = (data.consecutiveDays || 1) + 1;
        } else {
          consecutiveDays = 1;
        }
      } else {
        messagesCount = 1;
        consecutiveDays = 1;
        lastMessageDate = now;
        milestones = [];
      }

      // Determine newly reached milestones
      const newMilestones: string[] = [];

      const messageThresholds = [20, 50, 100, 250, 500];
      for (const threshold of messageThresholds) {
        const id = `messages_${threshold}`;
        if (messagesCount >= threshold && !milestones.includes(id)) {
          newMilestones.push(id);
        }
      }

      const streakThresholds = [3, 7, 14];
      for (const threshold of streakThresholds) {
        const id = `streak_${threshold}`;
        if (consecutiveDays >= threshold && !milestones.includes(id)) {
          newMilestones.push(id);
        }
      }

      const updatedMilestones = [...milestones, ...newMilestones];

      const stats: Partial<ChatStats> = {
        chatId,
        messagesCount,
        consecutiveDays,
        lastMessageDate,
        milestones: updatedMilestones
      };

      await setDoc(statsRef, stats, { merge: true });
    } catch (error: any) {
      console.error('Update chat stats error:', error);
      // Non-fatal
    }
  }

  /**
   * Subscribe to chat stats for a given chat (for showing milestones in UI)
   */
  subscribeToChatStats(
    chatId: string,
    callback: (stats: ChatStats | null) => void
  ): () => void {
    const statsRef = doc(db, 'chat_stats', chatId);
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const data = snapshot.data() as any;
      const stats: ChatStats = {
        chatId,
        messagesCount: data.messagesCount || 0,
        consecutiveDays: data.consecutiveDays || 0,
        lastMessageDate: data.lastMessageDate || 0,
        milestones: data.milestones || []
      };
      callback(stats);
    }, (error) => {
      console.error('Error listening to chat stats:', error);
      callback(null);
    });

    return unsubscribe;
  }

  // --- Typing Indicators ---
  
  /**
   * Updates typing status for a user in a chat
   */
  async updateTypingStatus(chatId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const chatRef = doc(db, 'chats', chatId);
      if (isTyping) {
        await updateDoc(chatRef, {
          [`typingUsers.${userId}`]: serverTimestamp()
        });
      } else {
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          const typingUsers = data.typingUsers || {};
          delete typingUsers[userId];
          await updateDoc(chatRef, { typingUsers });
        }
      }
    } catch (error: any) {
      console.error('Update typing status error:', error);
    }
  }

  // --- Message Reactions ---
  
  /**
   * Adds or removes a reaction to a message
   */
  async toggleMessageReaction(chatId: string, messageId: string, userId: string, emoji: string): Promise<void> {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) return;
      
      const messageData = messageDoc.data();
      const reactions = messageData.reactions || {};
      const userReactions = reactions[emoji] || [];
      
      if (userReactions.includes(userId)) {
        // Remove reaction
        const updated = userReactions.filter((id: string) => id !== userId);
        if (updated.length === 0) {
          delete reactions[emoji];
        } else {
          reactions[emoji] = updated;
        }
      } else {
        // Add reaction
        reactions[emoji] = [...userReactions, userId];
      }
      
      await updateDoc(messageRef, { reactions });
    } catch (error: any) {
      console.error('Toggle message reaction error:', error);
    }
  }

  // --- Profile Views ---
  
  /**
   * Tracks a profile view
   */
  async trackProfileView(viewedUserId: string, viewerId: string): Promise<void> {
    try {
      if (viewedUserId === viewerId) return; // Don't track own views
      
      const userRef = doc(db, 'users', viewedUserId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      const profileViews = userData.profileViews || [];
      
      // Remove existing view from same viewer
      const filtered = profileViews.filter((v: any) => v.viewerId !== viewerId);
      
      // Add new view
      filtered.push({
        viewerId,
        timestamp: Date.now()
      });
      
      // Keep only last 100 views
      const recentViews = filtered.slice(-100);
      
      await updateDoc(userRef, { profileViews: recentViews });
    } catch (error: any) {
      console.error('Track profile view error:', error);
    }
  }

  /**
   * Gets profile views for a user
   */
  async getProfileViews(userId: string): Promise<{ viewerId: string; timestamp: number }[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().profileViews || [];
      }
      return [];
    } catch (error: any) {
      console.error('Get profile views error:', error);
      return [];
    }
  }

  // --- User Settings ---
  
  /**
   * Updates user privacy settings
   */
  async updateUserSettings(userId: string, settings: {
    readReceiptsEnabled?: boolean;
    showOnlineStatus?: boolean;
    showLastSeen?: boolean;
    appearOffline?: boolean;
  }): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, settings);
      
      // Update current user if it's the same user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = { ...this.currentUser, ...settings };
      }
    } catch (error: any) {
      console.error('Update user settings error:', error);
      throw error;
    }
  }

  // --- Profile Verification ---
  
  /**
   * Verifies a user profile (admin only)
   */
  async verifyUser(userId: string, badgeType: 'photo' | 'phone' | 'email'): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isVerified: true,
        verificationBadge: badgeType
      });
    } catch (error: any) {
      console.error('Verify user error:', error);
      throw error;
    }
  }

  /**
   * Unverifies a user profile (admin only)
   */
  async unverifyUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isVerified: false,
        verificationBadge: null
      });
    } catch (error: any) {
      console.error('Unverify user error:', error);
      throw error;
    }
  }

  // --- Match Suggestions ---
  
  /**
   * Gets match suggestions based on user profile
   */
  async getMatchSuggestions(userId: string, limit: number = 10): Promise<User[]> {
    try {
      const currentUser = await this.getUserById(userId);
      if (!currentUser) return [];
      
      const allUsers = await this.getAllUsers();
      const suggestions: { user: User; score: number }[] = [];
      
      for (const user of allUsers) {
        if (user.id === userId || user.isAdmin) continue;
        
        let score = 0;
        
        // MBTI compatibility (same group = higher score)
        const userProfile = MBTI_PROFILES.find(p => p.code === currentUser.mbti);
        const matchProfile = MBTI_PROFILES.find(p => p.code === user.mbti);
        if (userProfile && matchProfile && userProfile.group === matchProfile.group) {
          score += 30;
        }
        
        // Shared hobbies
        const sharedHobbies = (currentUser.hobbies || []).filter(h => (user.hobbies || []).includes(h));
        score += sharedHobbies.length * 10;
        
        // Age compatibility (within 5 years)
        const ageDiff = Math.abs(currentUser.age - user.age);
        if (ageDiff <= 5) score += 20;
        else if (ageDiff <= 10) score += 10;
        
        // No shared red flags
        const sharedRedFlags = (currentUser.redFlags || []).filter(r => (user.redFlags || []).includes(r));
        if (sharedRedFlags.length === 0) score += 15;
        
        // Has photos
        if (user.photos && user.photos.length > 0) score += 10;
        
        // Has bio
        if (user.bio && user.bio.length > 20) score += 5;
        
        if (score > 0) {
          suggestions.push({ user, score });
        }
      }
      
      // Sort by score and return top matches
      suggestions.sort((a, b) => b.score - a.score);
      return suggestions.slice(0, limit).map(s => s.user);
    } catch (error: any) {
      console.error('Get match suggestions error:', error);
      return [];
    }
  }

  // --- Conversation Starters ---
  
  /**
   * Gets conversation starter suggestions based on user profiles
   */
  async getConversationStarters(userId: string, partnerId: string): Promise<string[]> {
    try {
      const currentUser = await this.getUserById(userId);
      const partner = await this.getUserById(partnerId);
      
      if (!currentUser || !partner) return [];
      
      const starters: string[] = [];
      
      // Based on shared hobbies
      const sharedHobbies = (currentUser.hobbies || []).filter(h => (partner.hobbies || []).includes(h));
      if (sharedHobbies.length > 0) {
        starters.push(`I see you're into ${sharedHobbies[0]}! What got you into that?`);
        starters.push(`We both like ${sharedHobbies[0]}! Have you tried [related activity]?`);
      }
      
      // Based on MBTI
      starters.push(`As a ${partner.mbti}, what's your take on [topic]?`);
      starters.push(`I'm curious - as a ${partner.mbti}, how do you usually approach [situation]?`);
      
      // Based on bio
      if (partner.bio) {
        starters.push(`I loved reading your bio! Tell me more about [something from bio]`);
      }
      
      // Generic starters
      starters.push(`Hey! I noticed we have some things in common. How's your day going?`);
      starters.push(`Hi! I'd love to learn more about you. What are you passionate about?`);
      starters.push(`Hello! What's something that made you smile today?`);
      
      return starters.slice(0, 5); // Return top 5
    } catch (error: any) {
      console.error('Get conversation starters error:', error);
      return [];
    }
  }
}

export const store = new FirebaseStore();
