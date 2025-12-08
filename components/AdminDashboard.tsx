/**
 * AdminDashboard Component
 * 
 * Comprehensive admin interface for managing users and monitoring chat activity.
 * Features include:
 * - User creation, editing, deletion, and visibility management
 * - Real-time user and chat room monitoring
 * - Bootstrap-based UI (reactstrap) for professional admin interface
 * 
 * State Management:
 * - Uses separate states for data (users, chats), loading/saving status, and form data
 * - Global loading state for data refresh, specific states (creating, saving) for actions
 * 
 * Note: Error/success messages are managed at component level. For larger apps,
 * consider a dedicated Toast/notification system to handle multiple messages.
 */
import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import { User, ChatRoom, Gender, IcebreakerTemplate, BadgeTemplate, DailyQuestion, ChatGameTemplate, GameType, BadgeType } from '../types';
import { MBTI_PROFILES } from '../constants';
import DevTools from './DevTools';
import * as XLSX from 'xlsx';
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert,
  Table,
  Badge,
  Spinner,
  Input as SwitchInput,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane
} from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

export const AdminDashboard: React.FC = () => {
  console.log('🔍 [AdminDashboard] Component rendered');
  const [activeTab, setActiveTab] = useState<string>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // User Creation State
  const [newUser, setNewUser] = useState({
    username: '', email: '', password: 'password', birthDate: '2000-01-01', gender: 'Male' as Gender, mbti: 'INTJ'
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // User Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    mbti: 'INTJ',
    gender: 'Male' as Gender,
    birthDate: '2000-01-01',
    apiCallLimit: 10,
    readReceiptsEnabled: true,
    showOnlineStatus: true,
    showLastSeen: true,
    appearOffline: false
  });
  const [saving, setSaving] = useState(false);

  // Personality Phrases State
  const [showPhrasesModal, setShowPhrasesModal] = useState(false);
  const [selectedMBTI, setSelectedMBTI] = useState<string>('INTJ');
  const [phrases, setPhrases] = useState<Record<string, string[]>>({});
  const [newPhrase, setNewPhrase] = useState<string>('');

  // Hobbies & Red Flags State
  const [showHobbiesModal, setShowHobbiesModal] = useState(false);
  const [showRedFlagsModal, setShowRedFlagsModal] = useState(false);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState<string>('');
  const [newRedFlag, setNewRedFlag] = useState<string>('');

  // Audio Questions State
  const [showAudioQuestionsModal, setShowAudioQuestionsModal] = useState(false);
  const [audioQuestions, setAudioQuestions] = useState<any[]>([]);
  const [newAudioQuestion, setNewAudioQuestion] = useState<string>('');

  // Excel Import State
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Dating Categories State
  const [showDatingCategoriesModal, setShowDatingCategoriesModal] = useState(false);
  const [datingCategories, setDatingCategories] = useState<any[]>([]);
  const [newDatingCategory, setNewDatingCategory] = useState<string>('');

  // Icebreakers State
  const [showIcebreakersModal, setShowIcebreakersModal] = useState(false);
  const [icebreakers, setIcebreakers] = useState<IcebreakerTemplate[]>([]);
  const [newIcebreakerTitle, setNewIcebreakerTitle] = useState<string>('');
  const [newIcebreakerPrompt, setNewIcebreakerPrompt] = useState<string>('');
  const [newIcebreakerCategory, setNewIcebreakerCategory] = useState<IcebreakerTemplate['category']>('get_to_know');

  // Gamification States
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [badges, setBadges] = useState<BadgeTemplate[]>([]);
  const [newBadge, setNewBadge] = useState({ name: '', icon: '🏆', description: '', type: 'all_star' as BadgeType, requiredXP: 100 });

  // Daily Questions State
  const [showDailyQuestionsModal, setShowDailyQuestionsModal] = useState(false);
  const [dailyQuestions, setDailyQuestions] = useState<DailyQuestion[]>([]);
  const [newDailyQuestion, setNewDailyQuestion] = useState({ question: '', options: '', activeDate: '' });

  // Chat Games State
  const [showChatGamesModal, setShowChatGamesModal] = useState(false);
  const [chatGames, setChatGames] = useState<ChatGameTemplate[]>([]);
  const [newChatGame, setNewChatGame] = useState({ type: 'would_you_rather' as GameType, title: '', questions: '' });

  /**
   * Refreshes user and chat data from Firestore
   * Called on component mount and after user operations
   */
  const refreshData = async () => {
    console.log('🔍 [AdminDashboard] Refreshing data...');
    setLoading(true);
    try {
    const u = await store.getAllUsers();
    const c = await store.getAllChats();
      console.log('🔍 [AdminDashboard] Users loaded:', u.length);
    setUsers(u);
    setChats(c);
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setErrorMsg(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 [AdminDashboard] useEffect - Initial load');
    refreshData();
  }, []);

  /**
   * Handles user creation by admin
   * Creates both Firebase Auth user and Firestore user document
   * Includes delay before refresh to ensure Firestore consistency
   * 
   * TODO: Consider using useCallback for performance optimization
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCreating(true);
    
    try {
      console.log('🔍 [AdminDashboard] Creating user:', newUser);
      const createdUser = await store.adminCreateUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        birthDate: newUser.birthDate,
        gender: newUser.gender,
        mbti: newUser.mbti,
      bio: 'Created by Admin',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.username}`
    });
      
      console.log('🔍 [AdminDashboard] User created successfully:', createdUser);
      setSuccessMsg(`User ${newUser.username} created with email ${newUser.email}!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      
      // Reset form
      setNewUser({ username: '', email: '', password: 'password', birthDate: '2000-01-01', gender: 'Male', mbti: 'INTJ' });
      
      // Refresh data after a short delay to ensure Firestore has updated
      setTimeout(() => {
        console.log('🔍 [AdminDashboard] Refreshing after user creation...');
        refreshData();
      }, 500);
    } catch (error: any) {
      console.error('🔍 [AdminDashboard] Error creating user:', error);
      setErrorMsg(`Error creating user: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) {
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const success = await store.deleteUser(userId);
      if (success) {
        setSuccessMsg(`User ${username} deleted!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        await refreshData();
      } else {
        setErrorMsg(`Failed to delete user ${username}`);
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } catch (error: any) {
      setErrorMsg(`Error deleting user: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Admin function to reset a user's password directly
   */
  const handleResetPassword = async (userId: string, username: string, email: string) => {
    const newPassword = prompt(`Enter new password for ${username}:\n(Minimum 6 characters)`);
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }
    
    setErrorMsg('');
    setLoading(true);
    try {
      await store.adminResetPassword(userId, newPassword);
      setSuccessMsg(`Password reset successfully for ${username}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error resetting password: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Admin function to send password reset email
   */
  const handleSendPasswordResetEmail = async (email: string, username: string) => {
    if (!email) {
      setErrorMsg('User has no email address');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }
    
    if (!confirm(`Send password reset email to ${email}?`)) {
      return;
    }
    
    setErrorMsg('');
    setLoading(true);
    try {
      const resetLink = await store.adminSendPasswordResetEmail(email);
      setSuccessMsg(`Password reset email sent to ${email}!`);
      console.log('Reset link:', resetLink); // Admin can see the link in console
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error sending reset email: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens edit modal and populates form with user data
   * Admin can edit: username, MBTI, gender, birthdate, API call limit
   */
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      mbti: user.mbti,
      gender: user.gender,
      birthDate: user.birthDate,
      apiCallLimit: user.apiCallLimit ?? 10,
      readReceiptsEnabled: user.readReceiptsEnabled !== false,
      showOnlineStatus: user.showOnlineStatus !== false,
      showLastSeen: user.showLastSeen !== false,
      appearOffline: user.appearOffline || false
    });
  };

  /**
   * Saves edited user profile
   * Updates user document in Firestore with new values
   */
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    setErrorMsg('');
    try {
      // Update privacy settings
      await store.updateUserSettings(editingUser.id, {
        readReceiptsEnabled: editFormData.readReceiptsEnabled,
        showOnlineStatus: editFormData.showOnlineStatus,
        showLastSeen: editFormData.showLastSeen,
        appearOffline: editFormData.appearOffline
      });
      
      const updated = await store.updateUserProfile(editingUser.id, {
        username: editFormData.username,
        mbti: editFormData.mbti,
        gender: editFormData.gender,
        birthDate: editFormData.birthDate,
        apiCallLimit: editFormData.apiCallLimit
      });
      
      if (updated) {
        setSuccessMsg(`User ${editFormData.username} updated successfully!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        setEditingUser(null);
        await refreshData();
      } else {
        setErrorMsg('Failed to update user');
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } catch (error: any) {
      setErrorMsg(`Error updating user: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Loads personality phrases for management
   */
  const loadPhrases = async () => {
    try {
      const allPhrases = await store.getAllPersonalityPhrases();
      setPhrases(allPhrases);
    } catch (error: any) {
      setErrorMsg(`Error loading phrases: ${error.message}`);
    }
  };

  /**
   * Opens phrases management modal
   */
  const handleOpenPhrasesModal = async () => {
    await loadPhrases();
    setShowPhrasesModal(true);
  };

  /**
   * Adds a new phrase for selected MBTI
   */
  const handleAddPhrase = async () => {
    if (!newPhrase.trim()) return;
    
    try {
      const currentPhrases = phrases[selectedMBTI] || [];
      const updatedPhrases = [...currentPhrases, newPhrase.trim()];
      await store.setPersonalityPhrases(selectedMBTI, updatedPhrases);
      setPhrases({ ...phrases, [selectedMBTI]: updatedPhrases });
      setNewPhrase('');
      setSuccessMsg(`Phrase added for ${selectedMBTI}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding phrase: ${error.message}`);
    }
  };

  /**
   * Removes a phrase for selected MBTI
   */
  const handleRemovePhrase = async (phrase: string) => {
    try {
      const currentPhrases = phrases[selectedMBTI] || [];
      const updatedPhrases = currentPhrases.filter(p => p !== phrase);
      await store.setPersonalityPhrases(selectedMBTI, updatedPhrases);
      setPhrases({ ...phrases, [selectedMBTI]: updatedPhrases });
      setSuccessMsg(`Phrase removed!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error removing phrase: ${error.message}`);
    }
  };

  /**
   * Loads hobbies and red flags for management
   */
  const loadHobbiesAndRedFlags = async () => {
    try {
      const h = await store.getAllHobbies();
      const rf = await store.getAllRedFlags();
      setHobbies(h);
      setRedFlags(rf);
    } catch (error: any) {
      setErrorMsg(`Error loading data: ${error.message}`);
    }
  };

  /**
   * Opens hobbies management modal
   */
  const handleOpenHobbiesModal = async () => {
    await loadHobbiesAndRedFlags();
    setShowHobbiesModal(true);
  };

  /**
   * Opens red flags management modal
   */
  const handleOpenRedFlagsModal = async () => {
    await loadHobbiesAndRedFlags();
    setShowRedFlagsModal(true);
  };

  /**
   * Adds a new hobby
   */
  const handleAddHobby = async () => {
    if (!newHobby.trim() || hobbies.includes(newHobby.trim())) return;
    try {
      const updated = [...hobbies, newHobby.trim()];
      await store.setAllHobbies(updated);
      setHobbies(updated);
      setNewHobby('');
      setSuccessMsg('Hobby added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding hobby: ${error.message}`);
    }
  };

  /**
   * Removes a hobby
   */
  const handleRemoveHobby = async (hobby: string) => {
    try {
      const updated = hobbies.filter(h => h !== hobby);
      await store.setAllHobbies(updated);
      setHobbies(updated);
      setSuccessMsg('Hobby removed!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error removing hobby: ${error.message}`);
    }
  };

  /**
   * Adds a new red flag
   */
  const handleAddRedFlag = async () => {
    if (!newRedFlag.trim() || redFlags.includes(newRedFlag.trim())) return;
    try {
      const updated = [...redFlags, newRedFlag.trim()];
      await store.setAllRedFlags(updated);
      setRedFlags(updated);
      setNewRedFlag('');
      setSuccessMsg('Red flag added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding red flag: ${error.message}`);
    }
  };

  /**
   * Removes a red flag
   */
  const handleRemoveRedFlag = async (redFlag: string) => {
    try {
      const updated = redFlags.filter(r => r !== redFlag);
      await store.setAllRedFlags(updated);
      setRedFlags(updated);
      setSuccessMsg('Red flag removed!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error removing red flag: ${error.message}`);
    }
  };

  /**
   * Loads audio questions
   */
  const loadAudioQuestions = async () => {
    try {
      const questions = await store.getAllAudioQuestions();
      setAudioQuestions(questions);
    } catch (error: any) {
      setErrorMsg(`Error loading questions: ${error.message}`);
    }
  };

  /**
   * Opens audio questions management modal
   */
  const handleOpenAudioQuestionsModal = async () => {
    await loadAudioQuestions();
    setShowAudioQuestionsModal(true);
  };

  /**
   * Adds a new audio question
   */
  const handleAddAudioQuestion = async () => {
    if (!newAudioQuestion.trim()) return;
    try {
      await store.createAudioQuestion(newAudioQuestion.trim());
      setNewAudioQuestion('');
      await loadAudioQuestions();
      setSuccessMsg('Question added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding question: ${error.message}`);
    }
  };

  /**
   * Deletes an audio question
   */
  const handleDeleteAudioQuestion = async (questionId: string) => {
    try {
      await store.deleteAudioQuestion(questionId);
      await loadAudioQuestions();
      setSuccessMsg('Question deleted!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error deleting question: ${error.message}`);
    }
  };

  /**
   * Imports phrases from Excel file
   * Expected format: Column 1 = MBTI type, Column 2 = Phrases (can be numbered like "1. phrase", "2. phrase")
   */
  const handleImportExcel = async () => {
    if (!excelFile) return;
    
    try {
      setErrorMsg('');
      setSuccessMsg('');
      
      // Verify admin status before proceeding
      const currentUser = await store.getCurrentUser();
      if (!currentUser || !currentUser.isAdmin || currentUser.role !== 'admin') {
        setErrorMsg('Permission denied: Admin access required. Please ensure your user has role: "admin" in Firestore.');
        console.error('❌ [AdminDashboard] User is not admin:', {
          isAdmin: currentUser?.isAdmin,
          role: currentUser?.role,
          userId: currentUser?.id
        });
        return;
      }
      
      console.log('✅ [AdminDashboard] Admin verified, proceeding with Excel import');
      
      // Read Excel file
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      console.log('📊 [AdminDashboard] Excel data rows:', data.length);
      
      const importedPhrases: Record<string, string[]> = {};
      
      // Process rows (skip first row as header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length < 2) continue;
        
        const type = String(row[0] || '').trim().toUpperCase();
        const phraseText = String(row[1] || '').trim();
        
        if (!type || !phraseText) continue;
        
        // Extract phrases from 「」 brackets
        // Match all text between 「 and 」
        const bracketRegex = /「([^」]+)」/g;
        const extractedPhrases: string[] = [];
        let match;
        
        while ((match = bracketRegex.exec(phraseText)) !== null) {
          const phrase = match[1].trim();
          if (phrase.length > 0) {
            extractedPhrases.push(phrase);
          }
        }
        
        // If no brackets found, try to split by newlines and clean
        if (extractedPhrases.length === 0) {
          const phraseLines = phraseText.split(/\n|\r\n?/).map(line => line.trim()).filter(line => line);
          
          // Remove number prefixes and brackets if present
          const cleanedPhrases = phraseLines.map(line => {
            // Remove leading numbers and periods (e.g., "1. ", "2. ", "10. ")
            let cleaned = line.replace(/^\d+\.\s*/, '').trim();
            // Remove 「 and 」 if present
            cleaned = cleaned.replace(/^「|」$/g, '').trim();
            return cleaned;
          }).filter(phrase => phrase.length > 0);
          
          extractedPhrases.push(...cleanedPhrases);
        }
        
        if (extractedPhrases.length === 0) continue;
        
        // Add all extracted phrases
        if (!importedPhrases[type]) {
          importedPhrases[type] = [];
        }
        
        importedPhrases[type].push(...extractedPhrases);
      }

      if (Object.keys(importedPhrases).length === 0) {
        setErrorMsg('No valid phrases found in Excel file. Please check the format. Expected: Column 1 = MBTI type, Column 2 = Phrases');
        return;
      }

      console.log('📝 [AdminDashboard] Imported phrases by type:', Object.keys(importedPhrases));

      // Save all imported phrases
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      for (const [mbti, phraseList] of Object.entries(importedPhrases)) {
        try {
          const existing = phrases[mbti] || [];
          // Merge and remove duplicates
          const combined = [...new Set([...existing, ...phraseList])];
          console.log(`💾 [AdminDashboard] Saving ${phraseList.length} phrases for ${mbti} (total: ${combined.length})`);
          await store.setPersonalityPhrases(mbti, combined);
          successCount++;
        } catch (error: any) {
          console.error(`❌ [AdminDashboard] Error importing phrases for ${mbti}:`, error);
          errors.push(`${mbti}: ${error.message || 'Unknown error'}`);
          errorCount++;
        }
      }

      await loadPhrases();
      setExcelFile(null);
      setShowExcelImportModal(false);
      
      if (errorCount > 0) {
        const errorDetails = errors.join('; ');
        setErrorMsg(`Imported ${successCount} types successfully, but ${errorCount} types failed: ${errorDetails}`);
        console.error('❌ [AdminDashboard] Import errors:', errors);
      } else {
        setSuccessMsg(`Successfully imported phrases for ${successCount} MBTI type(s)!`);
      }
      setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
    } catch (error: any) {
      console.error('❌ [AdminDashboard] Excel import error:', error);
      setErrorMsg(`Error importing Excel: ${error.message || 'Unknown error'}. Check console for details.`);
    }
  };

  /**
   * Loads dating categories
   */
  const loadDatingCategories = async () => {
    try {
      const categories = await store.getAllDatingCategories();
      setDatingCategories(categories);
    } catch (error: any) {
      setErrorMsg(`Error loading categories: ${error.message}`);
    }
  };

  /**
   * Opens dating categories management modal
   */
  const handleOpenDatingCategoriesModal = async () => {
    await loadDatingCategories();
    setShowDatingCategoriesModal(true);
  };

  /**
   * Adds a new dating category
   */
  const handleAddDatingCategory = async () => {
    if (!newDatingCategory.trim()) return;
    try {
      await store.createDatingCategory(newDatingCategory.trim());
      setNewDatingCategory('');
      await loadDatingCategories();
      setSuccessMsg('Category added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding category: ${error.message}`);
    }
  };

  /**
   * Deletes a dating category
   */
  const handleDeleteDatingCategory = async (categoryId: string) => {
    try {
      await store.deleteDatingCategory(categoryId);
      await loadDatingCategories();
      setSuccessMsg('Category deleted!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error deleting category: ${error.message}`);
    }
  };

  const handleToggleVisibility = async (userId: string, username: string, currentVisibility: boolean) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const updated = await store.updateUserProfile(userId, {
        visibleToUsers: !currentVisibility
      });
      if (updated) {
        setSuccessMsg(`User ${username} visibility ${!currentVisibility ? 'enabled' : 'disabled'}!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        await refreshData();
      } else {
        setErrorMsg(`Failed to update visibility for ${username}`);
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } catch (error: any) {
      setErrorMsg(`Error updating visibility: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // --- Icebreakers Management ---

  const loadIcebreakers = async () => {
    try {
      const templates = await store.getAllIcebreakers();
      setIcebreakers(templates);
    } catch (error: any) {
      setErrorMsg(`Error loading icebreakers: ${error.message}`);
    }
  };

  const handleOpenIcebreakersModal = async () => {
    await loadIcebreakers();
    setShowIcebreakersModal(true);
  };

  const handleAddIcebreaker = async () => {
    if (!newIcebreakerTitle.trim() || !newIcebreakerPrompt.trim()) return;
    try {
      await store.createIcebreakerTemplate(
        newIcebreakerTitle.trim(),
        newIcebreakerPrompt.trim(),
        newIcebreakerCategory
      );
      setNewIcebreakerTitle('');
      setNewIcebreakerPrompt('');
      await loadIcebreakers();
      setSuccessMsg('Icebreaker added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding icebreaker: ${error.message}`);
    }
  };

  const handleToggleIcebreakerActive = async (template: IcebreakerTemplate) => {
    try {
      await store.updateIcebreakerTemplate(template.id, { isActive: !template.isActive });
      await loadIcebreakers();
    } catch (error: any) {
      setErrorMsg(`Error updating icebreaker: ${error.message}`);
    }
  };

  const handleDeleteIcebreaker = async (templateId: string) => {
    try {
      await store.deleteIcebreakerTemplate(templateId);
      await loadIcebreakers();
    } catch (error: any) {
      setErrorMsg(`Error deleting icebreaker: ${error.message}`);
    }
  };

  // --- Badges Management ---

  const loadBadges = async () => {
    try {
      const allBadges = await store.getAllBadgeTemplates();
      setBadges(allBadges);
    } catch (error: any) {
      setErrorMsg(`Error loading badges: ${error.message}`);
    }
  };

  const handleOpenBadgesModal = async () => {
    await loadBadges();
    setShowBadgesModal(true);
  };

  const handleAddBadge = async () => {
    if (!newBadge.name.trim() || !newBadge.description.trim()) return;
    try {
      await store.createBadgeTemplate({
        name: newBadge.name.trim(),
        icon: newBadge.icon,
        description: newBadge.description.trim(),
        type: newBadge.type,
        requiredXP: newBadge.requiredXP,
        isActive: true
      });
      setNewBadge({ name: '', icon: '🏆', description: '', type: 'all_star', requiredXP: 100 });
      await loadBadges();
      setSuccessMsg('Badge added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding badge: ${error.message}`);
    }
  };

  const handleToggleBadgeActive = async (badge: BadgeTemplate) => {
    try {
      await store.updateBadgeTemplate(badge.id, { isActive: !badge.isActive });
      await loadBadges();
    } catch (error: any) {
      setErrorMsg(`Error updating badge: ${error.message}`);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    try {
      await store.deleteBadgeTemplate(badgeId);
      await loadBadges();
      setSuccessMsg('Badge deleted!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error deleting badge: ${error.message}`);
    }
  };

  // --- Daily Questions Management ---

  const loadDailyQuestions = async () => {
    try {
      const allQuestions = await store.getAllDailyQuestions();
      setDailyQuestions(allQuestions);
    } catch (error: any) {
      setErrorMsg(`Error loading daily questions: ${error.message}`);
    }
  };

  const handleOpenDailyQuestionsModal = async () => {
    await loadDailyQuestions();
    setShowDailyQuestionsModal(true);
  };

  const handleAddDailyQuestion = async () => {
    if (!newDailyQuestion.question.trim()) return;
    try {
      const options = newDailyQuestion.options.trim() 
        ? newDailyQuestion.options.split(',').map(o => o.trim()).filter(o => o)
        : undefined;
      await store.createDailyQuestion({
        question: newDailyQuestion.question.trim(),
        options,
        isActive: true,
        activeDate: newDailyQuestion.activeDate || undefined
      });
      setNewDailyQuestion({ question: '', options: '', activeDate: '' });
      await loadDailyQuestions();
      setSuccessMsg('Daily question added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding daily question: ${error.message}`);
    }
  };

  const handleToggleDailyQuestionActive = async (question: DailyQuestion) => {
    try {
      await store.updateDailyQuestion(question.id, { isActive: !question.isActive });
      await loadDailyQuestions();
    } catch (error: any) {
      setErrorMsg(`Error updating daily question: ${error.message}`);
    }
  };

  const handleDeleteDailyQuestion = async (questionId: string) => {
    try {
      await store.deleteDailyQuestion(questionId);
      await loadDailyQuestions();
      setSuccessMsg('Daily question deleted!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error deleting daily question: ${error.message}`);
    }
  };

  // --- Chat Games Management ---

  const loadChatGames = async () => {
    try {
      const allGames = await store.getAllChatGameTemplates();
      setChatGames(allGames);
    } catch (error: any) {
      setErrorMsg(`Error loading chat games: ${error.message}`);
    }
  };

  const handleOpenChatGamesModal = async () => {
    await loadChatGames();
    setShowChatGamesModal(true);
  };

  const handleAddChatGame = async () => {
    if (!newChatGame.title.trim() || !newChatGame.questions.trim()) return;
    try {
      // Parse questions - each line is a question, optionally with options after |
      const questions = newChatGame.questions.split('\n').map(line => {
        const parts = line.split('|');
        const question = parts[0].trim();
        const options = parts[1] ? parts[1].split(',').map(o => o.trim()).filter(o => o) : undefined;
        return { question, options };
      }).filter(q => q.question);

      await store.createChatGameTemplate({
        type: newChatGame.type,
        title: newChatGame.title.trim(),
        questions,
        isActive: true
      });
      setNewChatGame({ type: 'would_you_rather', title: '', questions: '' });
      await loadChatGames();
      setSuccessMsg('Chat game added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding chat game: ${error.message}`);
    }
  };

  const handleToggleChatGameActive = async (game: ChatGameTemplate) => {
    try {
      await store.updateChatGameTemplate(game.id, { isActive: !game.isActive });
      await loadChatGames();
    } catch (error: any) {
      setErrorMsg(`Error updating chat game: ${error.message}`);
    }
  };

  const handleDeleteChatGame = async (gameId: string) => {
    try {
      await store.deleteChatGameTemplate(gameId);
      await loadChatGames();
      setSuccessMsg('Chat game deleted!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error deleting chat game: ${error.message}`);
    }
  };

  // --- Award Badge to User ---

  const handleAwardBadge = async (userId: string, badgeId: string) => {
    try {
      await store.awardBadge(userId, badgeId);
      await refreshData();
      setSuccessMsg('Badge awarded!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error awarding badge: ${error.message}`);
    }
  };

  return (
    <>
      <DevTools />
      <Container fluid className="py-4" style={{ backgroundColor: '#111827', minHeight: '100vh', color: 'white' }}>
        <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="text-danger mb-0">Master Admin Dashboard</h1>
            <div className="d-flex gap-2 flex-wrap">
              <Button color="info" size="sm" onClick={handleOpenPhrasesModal}>
                Personality Phrases
              </Button>
              <Button color="success" size="sm" onClick={handleOpenHobbiesModal}>
                Hobbies
              </Button>
              <Button color="warning" size="sm" onClick={handleOpenRedFlagsModal}>
                Red Flags
              </Button>
              <Button color="secondary" size="sm" onClick={handleOpenAudioQuestionsModal}>
                Audio Questions
              </Button>
              <Button color="primary" size="sm" onClick={() => setShowExcelImportModal(true)}>
                Import Excel
              </Button>
              <Button color="info" size="sm" onClick={handleOpenDatingCategoriesModal}>
                Dating Categories
              </Button>
              <Button color="danger" size="sm" onClick={handleOpenIcebreakersModal}>
                Icebreakers
              </Button>
              <Button color="warning" size="sm" onClick={handleOpenBadgesModal}>
                🏆 Badges
              </Button>
              <Button color="success" size="sm" onClick={handleOpenDailyQuestionsModal}>
                📅 Daily Questions
              </Button>
              <Button color="primary" size="sm" onClick={handleOpenChatGamesModal}>
                🎮 Chat Games
              </Button>
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Create User Section */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <CardHeader className="bg-dark border-secondary">
              <h3 className="text-info mb-0">Create New User</h3>
            </CardHeader>
            <CardBody>
              {successMsg && (
                <Alert color="success" className="mb-3">
                  {successMsg}
                </Alert>
              )}
              {errorMsg && (
                <Alert color="danger" className="mb-3">
                  {errorMsg}
                </Alert>
              )}
              
              <Form onSubmit={handleCreateUser}>
                <Row>
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Username *</Label>
                      <Input
                        type="text"
              value={newUser.username} 
              onChange={e => setNewUser({...newUser, username: e.target.value})} 
              required
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Email *</Label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                        required
                        placeholder="user@example.com"
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                      <small className="text-muted">Required - links to Firebase Auth</small>
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Password *</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        required
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Date of Birth</Label>
                      <Input
              type="date"
              value={newUser.birthDate} 
              onChange={e => setNewUser({...newUser, birthDate: e.target.value})} 
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Gender</Label>
                      <Input
                        type="select"
              value={newUser.gender}
              onChange={e => setNewUser({...newUser, gender: e.target.value as Gender})}
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">MBTI</Label>
                      <Input
                        type="select"
              value={newUser.mbti}
              onChange={e => setNewUser({...newUser, mbti: e.target.value})}
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      >
                        {MBTI_PROFILES.map(p => (
                          <option key={p.code} value={p.code}>{p.code}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  
                  <Col md={12} className="mb-3">
                    <Button 
                      type="submit" 
                      color="primary" 
                      disabled={creating}
                      className="w-100"
                    >
                      {creating ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* User List */}
        <Col lg={6} className="mb-4">
          <Card className="bg-dark border-secondary">
            <CardHeader className="bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h4 className="mb-0 text-white">Registered Users</h4>
              <div className="d-flex align-items-center gap-2">
                <Button
                  size="sm"
                  color="secondary"
                  onClick={refreshData}
                  disabled={loading}
                  outline
                >
                  {loading ? <Spinner size="sm" /> : '↻ Refresh'}
                </Button>
                {loading ? (
                  <Spinner size="sm" color="light" />
                ) : (
                  <Badge color="info">{users.length}</Badge>
                )}
                  </div>
            </CardHeader>
            <CardBody>
              {loading && users.length === 0 ? (
                <div className="text-center py-4">
                  <Spinner color="light" />
                  <p className="text-muted mt-2">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted text-center py-4">No users found</p>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <Table dark hover responsive>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Details</th>
                        <th>Visible</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img
                                src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                                alt={u.username}
                                className="rounded-circle me-2"
                                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                              />
                              <div>
                                <div className="fw-bold text-white">
                                  {u.username || 'N/A'}
                                  {u.isAdmin && (
                                    <Badge color="danger" className="ms-2">ADMIN</Badge>
                                  )}
                                  <span className={`ms-2 badge ${u.isOnline ? 'bg-success' : 'bg-secondary'}`}>
                                    {u.isOnline ? '●' : '○'}
                                  </span>
                                </div>
                                <small className="text-white">{u.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <small className="text-white">
                              {u.mbti} • {u.gender} • {u.age} y/o
                              {u.role && ` • ${u.role} (API: ${u.apiCallsUsed ?? 0})`}
                              {!u.role && ` • API: ${u.apiCallsUsed ?? 0}`}
                            </small>
                          </td>
                          <td>
                            {!u.isAdmin ? (
                              <div className="form-check form-switch">
                                <Input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={u.visibleToUsers !== false}
                                  onChange={() => handleToggleVisibility(u.id, u.username, u.visibleToUsers !== false)}
                                  disabled={loading}
                                  style={{ cursor: 'pointer' }}
                                />
                                <Label className="form-check-label text-white ms-2" style={{ fontSize: '0.875rem' }}>
                                  {u.visibleToUsers !== false ? 'Yes' : 'No'}
                                </Label>
                              </div>
                            ) : (
                              <Badge color="secondary">N/A</Badge>
                            )}
                          </td>
                          <td>
                            {!u.isAdmin && (
                              <div className="d-flex gap-2">
                                <Button
                                  size="sm"
                                  color="primary"
                                  onClick={() => handleEditUser(u)}
                                  disabled={loading}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  color="warning"
                                  onClick={() => handleResetPassword(u.id, u.username, u.email)}
                                  disabled={loading}
                                  title="Reset password directly"
                                >
                                  Reset PW
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  disabled={loading}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Chat Rooms */}
        <Col lg={6} className="mb-4">
          <Card className="bg-dark border-secondary">
            <CardHeader className="bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h4 className="mb-0 text-white">Active Chat Rooms</h4>
              {loading ? (
                <Spinner size="sm" color="light" />
              ) : (
                <Badge color="info">{chats.length}</Badge>
              )}
            </CardHeader>
            <CardBody>
              {loading && chats.length === 0 ? (
                <div className="text-center py-4">
                  <Spinner color="light" />
                  <p className="text-muted mt-2">Loading chats...</p>
                </div>
              ) : chats.length === 0 ? (
                <p className="text-muted text-center py-4">No active chats</p>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {chats.map(chat => {
              const u1 = users.find(u => u.id === chat.participants[0]);
              const u2 = users.find(u => u.id === chat.participants[1]);
              // Count API calls (messages with translations) in this chat
              const totalApiCalls = chat.messages.filter(msg => msg.translatedText).length;
              return (
                <div 
                  key={chat.id} 
                  onClick={async () => {
                    setSelectedChat(chat);
                    setLoadingMessages(true);
                    try {
                      // Load messages for the selected chat
                      const messages = await store.getChatMessages(chat.id);
                      setSelectedChat({
                        ...chat,
                        messages: messages
                      });
                    } catch (error: any) {
                      console.error('Error loading messages:', error);
                      setErrorMsg(`Error loading messages: ${error.message}`);
                    } finally {
                      setLoadingMessages(false);
                    }
                  }}
                        className={`p-3 mb-2 rounded border cursor-pointer ${
                          selectedChat?.id === chat.id
                            ? 'bg-primary bg-opacity-25 border-primary'
                            : 'bg-secondary bg-opacity-10 border-secondary'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold text-info">
                              {u1?.username || chat.participants[0]} & {u2?.username || chat.participants[1]}
                            </span>
                            {totalApiCalls > 0 && (
                              <Badge color="warning" className="ms-2">API: {totalApiCalls}</Badge>
                            )}
                          </div>
                          {chat.lastMessage ? (
                            <Badge color="success">Active</Badge>
                          ) : (
                            <Badge color="secondary">No messages</Badge>
                          )}
                  </div>
                </div>
              );
            })}
          </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Admin Chat Viewer */}
      {selectedChat && (() => {
        // Calculate total API calls (messages with translations)
        const totalApiCalls = selectedChat.messages.filter(msg => msg.translatedText).length;
        const u1 = users.find(u => u.id === selectedChat.participants[0]);
        const u2 = users.find(u => u.id === selectedChat.participants[1]);
        const u1ApiCalls = selectedChat.messages.filter(msg => 
          msg.senderId === selectedChat.participants[0] && msg.translatedText
        ).length;
        const u2ApiCalls = selectedChat.messages.filter(msg => 
          msg.senderId === selectedChat.participants[1] && msg.translatedText
        ).length;
        
        return (
          <Row>
            <Col>
              <Card className="bg-dark border-secondary">
                <CardHeader className="bg-dark border-secondary">
                  <div className="d-flex justify-content-between align-items-center">
                    <h4 className="mb-0 text-white">Chat Log: {selectedChat.id}</h4>
                    <div className="text-end">
                      <Badge color="info" className="me-2">
                        Total API Calls: {totalApiCalls}
                      </Badge>
                      {u1 && (
                        <Badge color="secondary" className="me-2">
                          {u1.username}: {u1ApiCalls}
                        </Badge>
                      )}
                      {u2 && (
                        <Badge color="secondary">
                          {u2.username}: {u2ApiCalls}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="bg-black bg-opacity-50 p-3 rounded">
                    {loadingMessages ? (
                      <div className="text-center py-4">
                        <Spinner color="light" size="sm" />
                        <p className="text-muted mt-2">Loading messages...</p>
                      </div>
                    ) : selectedChat.messages.length === 0 ? (
                      <p className="text-muted text-center">No messages in this chat</p>
                    ) : (
                      selectedChat.messages.map(msg => {
                        const sender = users.find(u => u.id === msg.senderId);
                        return (
                          <div key={msg.id} className="mb-3 pb-3 border-bottom border-secondary">
                            <span className="fw-bold text-info">{sender?.username || msg.senderId}: </span>
                            {msg.type === 'text' && <span className="text-white">{msg.text}</span>}
                            {msg.type === 'image' && <Badge color="primary">[Image]</Badge>}
                            {msg.type === 'sticker' && <Badge color="warning">[Sticker]</Badge>}
                            {msg.translatedText && (
                              <div className="ms-4 mt-1">
                                <small className="text-success fst-italic">Translated: {msg.translatedText}</small>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        );
      })()}

      {/* Edit User Modal */}
      <Modal isOpen={editingUser !== null} toggle={() => setEditingUser(null)}>
        <ModalHeader toggle={() => setEditingUser(null)}>
          Edit User: {editingUser?.username}
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label>Username</Label>
              <Input
                type="text"
                value={editFormData.username}
                onChange={e => setEditFormData({...editFormData, username: e.target.value})}
                placeholder="Username"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>MBTI</Label>
              <Input
                type="select"
                value={editFormData.mbti}
                onChange={e => setEditFormData({...editFormData, mbti: e.target.value})}
              >
                {MBTI_PROFILES.map(p => (
                  <option key={p.code} value={p.code}>{p.code}</option>
                ))}
              </Input>
            </FormGroup>
            
            <FormGroup>
              <Label>Gender</Label>
              <Input
                type="select"
                value={editFormData.gender}
                onChange={e => setEditFormData({...editFormData, gender: e.target.value as Gender})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </Input>
            </FormGroup>
            
            <FormGroup>
              <Label>Birth Date</Label>
              <Input
                type="date"
                value={editFormData.birthDate}
                onChange={e => setEditFormData({...editFormData, birthDate: e.target.value})}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>API Call Limit</Label>
              <Input
                type="number"
                min="0"
                value={editFormData.apiCallLimit}
                onChange={e => setEditFormData({...editFormData, apiCallLimit: parseInt(e.target.value) || 10})}
                placeholder="10"
              />
              <small className="text-muted">Default: 10. Set to 0 for unlimited.</small>
            </FormGroup>
            
            <hr />
            <h5>Privacy Settings</h5>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={editFormData.readReceiptsEnabled}
                  onChange={e => setEditFormData({...editFormData, readReceiptsEnabled: e.target.checked})}
                />
                {' '}Read Receipts Enabled
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={editFormData.showOnlineStatus}
                  onChange={e => setEditFormData({...editFormData, showOnlineStatus: e.target.checked})}
                />
                {' '}Show Online Status
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={editFormData.showLastSeen}
                  onChange={e => setEditFormData({...editFormData, showLastSeen: e.target.checked})}
                />
                {' '}Show Last Seen
              </Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={editFormData.appearOffline}
                  onChange={e => setEditFormData({...editFormData, appearOffline: e.target.checked})}
                />
                {' '}Appear Offline
              </Label>
            </FormGroup>
            
            <hr />
            <h5>Verification</h5>
            <FormGroup>
              <div className="d-flex gap-2 align-items-center">
                <Button 
                  color={editingUser?.isVerified ? "warning" : "success"}
                  onClick={async () => {
                    if (editingUser) {
                      if (editingUser.isVerified) {
                        await store.unverifyUser(editingUser.id);
                      } else {
                        await store.verifyUser(editingUser.id, 'photo');
                      }
                      await refreshData();
                    }
                  }}
                >
                  {editingUser?.isVerified ? 'Unverify User' : 'Verify User'}
                </Button>
                {editingUser?.isVerified && (
                  <Badge color="success">Verified {editingUser.verificationBadge || 'profile'}</Badge>
                )}
              </div>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setEditingUser(null)}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSaveEdit} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Personality Phrases Management Modal */}
      <Modal isOpen={showPhrasesModal} toggle={() => setShowPhrasesModal(false)} size="lg">
        <ModalHeader toggle={() => setShowPhrasesModal(false)}>
          Manage Personality Phrases
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Select MBTI Type</Label>
            <Input
              type="select"
              value={selectedMBTI}
              onChange={e => setSelectedMBTI(e.target.value)}
            >
              {MBTI_PROFILES.map(p => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </Input>
          </FormGroup>

          <FormGroup>
            <Label>Add New Phrase for {selectedMBTI}</Label>
            <div className="d-flex gap-2">
              <Input
                type="text"
                value={newPhrase}
                onChange={e => setNewPhrase(e.target.value)}
                placeholder="e.g., then...?"
                onKeyPress={e => e.key === 'Enter' && handleAddPhrase()}
              />
              <Button color="primary" onClick={handleAddPhrase} disabled={!newPhrase.trim()}>
                Add
              </Button>
            </div>
          </FormGroup>

          <div className="mt-4">
            <Label>Current Phrases for {selectedMBTI}</Label>
            {phrases[selectedMBTI] && phrases[selectedMBTI].length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {phrases[selectedMBTI].map((phrase, idx) => (
                  <Badge
                    key={idx}
                    color="info"
                    className="p-2 d-flex align-items-center gap-2"
                    style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                  >
                    {phrase}
                    <span
                      onClick={() => handleRemovePhrase(phrase)}
                      style={{ cursor: 'pointer', marginLeft: '4px' }}
                    >
                      ×
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2">No phrases added yet for {selectedMBTI}</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowPhrasesModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Hobbies Management Modal */}
      <Modal isOpen={showHobbiesModal} toggle={() => setShowHobbiesModal(false)} size="lg">
        <ModalHeader toggle={() => setShowHobbiesModal(false)}>
          Manage Hobbies
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Add New Hobby</Label>
            <div className="d-flex gap-2">
              <Input
                type="text"
                value={newHobby}
                onChange={e => setNewHobby(e.target.value)}
                placeholder="e.g., Reading"
                onKeyPress={e => e.key === 'Enter' && handleAddHobby()}
              />
              <Button color="primary" onClick={handleAddHobby} disabled={!newHobby.trim()}>
                Add
              </Button>
            </div>
          </FormGroup>
          <div className="mt-4">
            <Label>Current Hobbies</Label>
            {hobbies.length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {hobbies.map((hobby, idx) => (
                  <Badge key={idx} color="info" className="p-2 d-flex align-items-center gap-2" style={{ fontSize: '0.9rem' }}>
                    {hobby}
                    <span onClick={() => handleRemoveHobby(hobby)} style={{ cursor: 'pointer' }}>×</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2">No hobbies added yet</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowHobbiesModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Red Flags Management Modal */}
      <Modal isOpen={showRedFlagsModal} toggle={() => setShowRedFlagsModal(false)} size="lg">
        <ModalHeader toggle={() => setShowRedFlagsModal(false)}>
          Manage Red Flags
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Add New Red Flag</Label>
            <div className="d-flex gap-2">
              <Input
                type="text"
                value={newRedFlag}
                onChange={e => setNewRedFlag(e.target.value)}
                placeholder="e.g., Smoking"
                onKeyPress={e => e.key === 'Enter' && handleAddRedFlag()}
              />
              <Button color="primary" onClick={handleAddRedFlag} disabled={!newRedFlag.trim()}>
                Add
              </Button>
            </div>
          </FormGroup>
          <div className="mt-4">
            <Label>Current Red Flags</Label>
            {redFlags.length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {redFlags.map((redFlag, idx) => (
                  <Badge key={idx} color="danger" className="p-2 d-flex align-items-center gap-2" style={{ fontSize: '0.9rem' }}>
                    {redFlag}
                    <span onClick={() => handleRemoveRedFlag(redFlag)} style={{ cursor: 'pointer' }}>×</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2">No red flags added yet</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowRedFlagsModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Audio Questions Management Modal */}
      <Modal isOpen={showAudioQuestionsModal} toggle={() => setShowAudioQuestionsModal(false)} size="lg">
        <ModalHeader toggle={() => setShowAudioQuestionsModal(false)}>
          Manage Audio Questions
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Add New Question</Label>
            <div className="d-flex gap-2">
              <Input
                type="text"
                value={newAudioQuestion}
                onChange={e => setNewAudioQuestion(e.target.value)}
                placeholder="e.g., What's your favorite hobby?"
                onKeyPress={e => e.key === 'Enter' && handleAddAudioQuestion()}
              />
              <Button color="primary" onClick={handleAddAudioQuestion} disabled={!newAudioQuestion.trim()}>
                Add
              </Button>
            </div>
          </FormGroup>
          <div className="mt-4">
            <Label>Current Questions</Label>
            {audioQuestions.length > 0 ? (
              <div className="mt-2">
                {audioQuestions.map((q) => (
                  <div key={q.id} className="d-flex justify-content-between align-items-center p-2 mb-2 bg-secondary bg-opacity-25 rounded">
                    <span>{q.questionText}</span>
                    <Button size="sm" color="danger" onClick={() => handleDeleteAudioQuestion(q.id)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2">No questions added yet</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowAudioQuestionsModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Excel Import Modal */}
      <Modal isOpen={showExcelImportModal} toggle={() => setShowExcelImportModal(false)} size="lg">
        <ModalHeader toggle={() => setShowExcelImportModal(false)}>
          Import Phrases from Excel
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Select Excel File (2 columns: type, phrases)</Label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setExcelFile(file);
              }}
            />
            <small className="text-muted">Expected format: Column 1 = MBTI type, Column 2 = Phrase</small>
          </FormGroup>
          {excelFile && (
            <Alert color="info">
              Selected: {excelFile.name}
              <Button color="primary" size="sm" className="ms-2" onClick={handleImportExcel}>
                Import
              </Button>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowExcelImportModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Dating Categories Management Modal */}
      <Modal isOpen={showDatingCategoriesModal} toggle={() => setShowDatingCategoriesModal(false)} size="lg">
        <ModalHeader toggle={() => setShowDatingCategoriesModal(false)}>
          Manage Dating Categories
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Add New Category</Label>
            <div className="d-flex gap-2">
              <Input
                type="text"
                value={newDatingCategory}
                onChange={e => setNewDatingCategory(e.target.value)}
                placeholder="e.g., Coffee Date, Dinner, Movie"
                onKeyPress={e => e.key === 'Enter' && handleAddDatingCategory()}
              />
              <Button color="primary" onClick={handleAddDatingCategory} disabled={!newDatingCategory.trim()}>
                Add
              </Button>
            </div>
          </FormGroup>
          <div className="mt-4">
            <Label>Current Categories</Label>
            {datingCategories.length > 0 ? (
              <div className="mt-2">
                {datingCategories.map((cat) => (
                  <div key={cat.id} className="d-flex justify-content-between align-items-center p-2 mb-2 bg-secondary bg-opacity-25 rounded">
                    <span>{cat.name}</span>
                    <Button size="sm" color="danger" onClick={() => handleDeleteDatingCategory(cat.id)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2">No categories added yet</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowDatingCategoriesModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Icebreakers Management Modal */}
      <Modal isOpen={showIcebreakersModal} toggle={() => setShowIcebreakersModal(false)} size="lg">
        <ModalHeader toggle={() => setShowIcebreakersModal(false)}>
          Manage Icebreakers & Quick Games
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Title</Label>
            <Input
              type="text"
              value={newIcebreakerTitle}
              onChange={e => setNewIcebreakerTitle(e.target.value)}
              placeholder="e.g., 2 Truths & 1 Lie"
            />
          </FormGroup>
          <FormGroup>
            <Label>Prompt</Label>
            <Input
              type="textarea"
              rows={3}
              value={newIcebreakerPrompt}
              onChange={e => setNewIcebreakerPrompt(e.target.value)}
              placeholder="e.g., Share 2 truths and 1 lie about yourself..."
            />
          </FormGroup>
          <FormGroup>
            <Label>Category</Label>
            <Input
              type="select"
              value={newIcebreakerCategory}
              onChange={e => setNewIcebreakerCategory(e.target.value as IcebreakerTemplate['category'])}
            >
              <option value="get_to_know">Get to know</option>
              <option value="flirty">Flirty</option>
              <option value="deep_talk">Deep talk</option>
              <option value="fun">Fun</option>
            </Input>
          </FormGroup>
          <Button
            color="primary"
            className="mt-2"
            onClick={handleAddIcebreaker}
            disabled={!newIcebreakerTitle.trim() || !newIcebreakerPrompt.trim()}
          >
            Add Icebreaker
          </Button>

          <hr className="my-4" />

          <Label>Existing Icebreakers</Label>
          {icebreakers.length === 0 ? (
            <p className="text-muted mt-2">No icebreakers added yet.</p>
          ) : (
            <Table striped bordered hover responsive className="mt-2">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {icebreakers.map(template => (
                  <tr key={template.id}>
                    <td>{template.title}</td>
                    <td>{template.category}</td>
                    <td>
                      <SwitchInput
                        type="switch"
                        checked={template.isActive}
                        onChange={() => handleToggleIcebreakerActive(template)}
                      />
                    </td>
                    <td>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleDeleteIcebreaker(template.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowIcebreakersModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Badges Management Modal */}
      <Modal isOpen={showBadgesModal} toggle={() => setShowBadgesModal(false)} size="lg">
        <ModalHeader toggle={() => setShowBadgesModal(false)}>
          🏆 Manage Badges
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Badge Name</Label>
            <Input
              type="text"
              value={newBadge.name}
              onChange={e => setNewBadge({...newBadge, name: e.target.value})}
              placeholder="e.g., Ice Breaker"
            />
          </FormGroup>
          <FormGroup>
            <Label>Icon (emoji)</Label>
            <Input
              type="text"
              value={newBadge.icon}
              onChange={e => setNewBadge({...newBadge, icon: e.target.value})}
              placeholder="e.g., 🏆"
            />
          </FormGroup>
          <FormGroup>
            <Label>Description</Label>
            <Input
              type="textarea"
              value={newBadge.description}
              onChange={e => setNewBadge({...newBadge, description: e.target.value})}
              placeholder="e.g., Sent your first message"
            />
          </FormGroup>
          <FormGroup>
            <Label>Type</Label>
            <Input
              type="select"
              value={newBadge.type}
              onChange={e => setNewBadge({...newBadge, type: e.target.value as BadgeType})}
            >
              <option value="ice_breaker">Ice Breaker</option>
              <option value="all_star">All Star</option>
              <option value="on_fire">On Fire</option>
              <option value="party_starter">Party Starter</option>
              <option value="verified">Verified</option>
              <option value="popular">Popular</option>
              <option value="super_liker">Super Liker</option>
              <option value="chatterbox">Chatterbox</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Required XP (optional)</Label>
            <Input
              type="number"
              value={newBadge.requiredXP}
              onChange={e => setNewBadge({...newBadge, requiredXP: parseInt(e.target.value) || 0})}
            />
          </FormGroup>
          <Button
            color="primary"
            className="mt-2"
            onClick={handleAddBadge}
            disabled={!newBadge.name.trim() || !newBadge.description.trim()}
          >
            Add Badge
          </Button>

          <hr className="my-4" />

          <Label>Existing Badges</Label>
          {badges.length === 0 ? (
            <p className="text-muted mt-2">No badges added yet.</p>
          ) : (
            <Table striped bordered hover responsive className="mt-2">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {badges.map(badge => (
                  <tr key={badge.id}>
                    <td>{badge.icon}</td>
                    <td>{badge.name}</td>
                    <td>{badge.type}</td>
                    <td>
                      <SwitchInput
                        type="switch"
                        checked={badge.isActive}
                        onChange={() => handleToggleBadgeActive(badge)}
                      />
                    </td>
                    <td>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleDeleteBadge(badge.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowBadgesModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Daily Questions Management Modal */}
      <Modal isOpen={showDailyQuestionsModal} toggle={() => setShowDailyQuestionsModal(false)} size="lg">
        <ModalHeader toggle={() => setShowDailyQuestionsModal(false)}>
          📅 Manage Daily Questions
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Question</Label>
            <Input
              type="textarea"
              value={newDailyQuestion.question}
              onChange={e => setNewDailyQuestion({...newDailyQuestion, question: e.target.value})}
              placeholder="e.g., What's your love language?"
            />
          </FormGroup>
          <FormGroup>
            <Label>Options (comma-separated, optional)</Label>
            <Input
              type="text"
              value={newDailyQuestion.options}
              onChange={e => setNewDailyQuestion({...newDailyQuestion, options: e.target.value})}
              placeholder="e.g., Words of Affirmation, Quality Time, Acts of Service"
            />
          </FormGroup>
          <FormGroup>
            <Label>Active Date (optional - leave empty for random rotation)</Label>
            <Input
              type="date"
              value={newDailyQuestion.activeDate}
              onChange={e => setNewDailyQuestion({...newDailyQuestion, activeDate: e.target.value})}
            />
          </FormGroup>
          <Button
            color="primary"
            className="mt-2"
            onClick={handleAddDailyQuestion}
            disabled={!newDailyQuestion.question.trim()}
          >
            Add Daily Question
          </Button>

          <hr className="my-4" />

          <Label>Existing Daily Questions</Label>
          {dailyQuestions.length === 0 ? (
            <p className="text-muted mt-2">No daily questions added yet.</p>
          ) : (
            <div className="mt-2">
              {dailyQuestions.map(question => (
                <div key={question.id} className="d-flex justify-content-between align-items-center p-2 mb-2 bg-secondary bg-opacity-25 rounded">
                  <div>
                    <div>{question.question}</div>
                    {question.options && question.options.length > 0 && (
                      <small className="text-muted">Options: {question.options.join(', ')}</small>
                    )}
                    {question.activeDate && (
                      <small className="text-info ms-2">📅 {question.activeDate}</small>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <SwitchInput
                      type="switch"
                      checked={question.isActive}
                      onChange={() => handleToggleDailyQuestionActive(question)}
                    />
                    <Button size="sm" color="danger" onClick={() => handleDeleteDailyQuestion(question.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowDailyQuestionsModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Chat Games Management Modal */}
      <Modal isOpen={showChatGamesModal} toggle={() => setShowChatGamesModal(false)} size="lg">
        <ModalHeader toggle={() => setShowChatGamesModal(false)}>
          🎮 Manage Chat Games
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Game Type</Label>
            <Input
              type="select"
              value={newChatGame.type}
              onChange={e => setNewChatGame({...newChatGame, type: e.target.value as GameType})}
            >
              <option value="truth_or_dare">Truth or Dare</option>
              <option value="would_you_rather">Would You Rather</option>
              <option value="compatibility_quiz">Compatibility Quiz</option>
              <option value="this_or_that">This or That</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Title</Label>
            <Input
              type="text"
              value={newChatGame.title}
              onChange={e => setNewChatGame({...newChatGame, title: e.target.value})}
              placeholder="e.g., Fun Would You Rather"
            />
          </FormGroup>
          <FormGroup>
            <Label>Questions (one per line, use | for options)</Label>
            <Input
              type="textarea"
              rows={5}
              value={newChatGame.questions}
              onChange={e => setNewChatGame({...newChatGame, questions: e.target.value})}
              placeholder={`Example:\nWould you rather travel to the past or future?|Past,Future\nWould you rather have super strength or super speed?|Strength,Speed`}
            />
          </FormGroup>
          <Button
            color="primary"
            className="mt-2"
            onClick={handleAddChatGame}
            disabled={!newChatGame.title.trim() || !newChatGame.questions.trim()}
          >
            Add Chat Game
          </Button>

          <hr className="my-4" />

          <Label>Existing Chat Games</Label>
          {chatGames.length === 0 ? (
            <p className="text-muted mt-2">No chat games added yet.</p>
          ) : (
            <Table striped bordered hover responsive className="mt-2">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {chatGames.map(game => (
                  <tr key={game.id}>
                    <td>{game.title}</td>
                    <td>{game.type.replace(/_/g, ' ')}</td>
                    <td>{game.questions.length} questions</td>
                    <td>
                      <SwitchInput
                        type="switch"
                        checked={game.isActive}
                        onChange={() => handleToggleChatGameActive(game)}
                      />
                    </td>
                    <td>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => handleDeleteChatGame(game.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowChatGamesModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
      </Container>
    </>
  );
};
