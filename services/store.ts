import { User, ChatRoom, ChatMessage, MessageType } from '../types';
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
    apiCallsUsed: data.apiCallsUsed ?? 0 // Default: 0
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
      console.log('🔍 [Store] Auth state changed:', firebaseUser?.email);
      if (firebaseUser) {
        try {
          // Special handling for admin user
          if (firebaseUser.email === 'lc@ne.ai') {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Ensure admin privileges
              if (!userData.isAdmin || userData.role !== 'admin') {
                console.log('🔍 [Store] Updating admin privileges in restoreSession');
                await updateDoc(doc(db, 'users', firebaseUser.uid), {
                  isAdmin: true,
                  role: 'admin'
                });
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
              await setDoc(doc(db, 'users', firebaseUser.uid), userToDoc(adminUser));
              this.currentUser = adminUser;
            }
            await this.updatePresence(firebaseUser.uid, true);
          } else {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              this.currentUser = docToUser(userDoc.data(), firebaseUser.uid);
              await this.updatePresence(firebaseUser.uid, true);
            } else {
              console.warn('🔍 [Store] User document not found for:', firebaseUser.email);
              this.currentUser = null;
            }
          }
        } catch (error) {
          console.error('🔍 [Store] Error restoring session:', error);
          this.currentUser = null;
        }
      } else {
        console.log('🔍 [Store] No Firebase user, clearing currentUser');
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
      await this.updatePresence(userId, true);
      return user;
    } catch (error: any) {
      console.error('Login error:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      await this.updatePresence(this.currentUser.id, false);
    }
    await signOut(auth);
    this.currentUser = null;
  }

  async getCurrentUser(): Promise<User | null> {
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
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Ensure admin privileges
        if (!userData.isAdmin || userData.role !== 'admin') {
          console.log('🔍 [Store] Updating admin privileges in getCurrentUser');
          await updateDoc(doc(db, 'users', userId), {
            isAdmin: true,
            role: 'admin'
          });
        }
        // Return with forced admin privileges
        const adminUser: User = {
          ...docToUser(userData, userId),
          isAdmin: true,
          role: 'admin'
        };
        this.currentUser = adminUser;
        // Update presence when user is restored
        await this.updatePresence(userId, true);
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
        await setDoc(doc(db, 'users', userId), userToDoc(adminUser));
        this.currentUser = adminUser;
        // Update presence when user is restored
        await this.updatePresence(userId, true);
        console.log('🔍 [Store] Created and returning admin user:', adminUser);
        return adminUser;
      }
    }
    
    // For non-admin users
    const userDoc = await getDoc(doc(db, 'users', userId));
    console.log('🔍 [Store] User document exists:', userDoc.exists());
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('🔍 [Store] User document data:', userData);
      this.currentUser = docToUser(userData, userId);
      console.log('🔍 [Store] Parsed user:', this.currentUser);
      console.log('🔍 [Store] Parsed user isAdmin:', this.currentUser.isAdmin);
      console.log('🔍 [Store] Parsed user role:', this.currentUser.role);
      // Update presence when user is restored
      await this.updatePresence(userId, true);
    } else {
      console.warn('🔍 [Store] User document not found');
      this.currentUser = null;
    }
    
    console.log('🔍 [Store] Returning currentUser:', this.currentUser);
    return this.currentUser;
  }

  private async updatePresence(userId: string, isOnline: boolean) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp()
    });
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
   * Returns the download URL
   */
  async uploadAvatar(userId: string, file: File | Blob): Promise<string> {
    try {
      const avatarRef = ref(storage, `avatars/${userId}/${Date.now()}_${file instanceof File ? file.name : 'avatar.jpg'}`);
      
      // Upload file
      await uploadBytes(avatarRef, file);
      
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
          
          // Upload to Storage
          const downloadURL = await this.uploadAvatar(userId, blob);
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
          isTranslating: data.isTranslating || false
        } as ChatMessage;
      });
      callback(messages);
    }, (error) => {
      console.error('Error listening to messages:', error);
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

      return msg;
    } catch (error: any) {
      console.error('Send message error:', error);
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
}

export const store = new FirebaseStore();
