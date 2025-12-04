/**
 * ProfileScreen Component
 * 
 * User profile editing interface for regular users.
 * 
 * Key Features:
 * - Standard edit flow: load data, modify, save
 * - Avatar upload with optimistic UI update (Base64 preview)
 * - Photo upload (max 5 photos)
 * - Hobbies and Red Flags management
 * - Audio recordings (max 3, 10 seconds each)
 * - Immutable fields: Birth Date and Gender cannot be changed (disabled with note)
 * - Editable fields: Username, MBTI, Bio, Avatar, Photos, Hobbies, Red Flags, Audio
 */
import React, { useState, useRef, useEffect } from 'react';
import { User, MBTIGroup, Gender, AudioQuestion } from '../types';
import { MBTI_PROFILES } from '../constants';
import { store } from '../services/store';
import { PhotoModal } from './PhotoModal';
import { useToast } from './Toast';
import { CheckmarkAnimation, Confetti } from './Celebration';

export const ProfileScreen: React.FC<{ 
  user: User; 
  onSave: () => void;
  onCancel: () => void;
}> = ({ user, onSave, onCancel }) => {
  const { showToast } = useToast();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    birthDate: user.birthDate || '2000-01-01',
    gender: user.gender,
    mbti: user.mbti,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    photos: user.photos || [],
    hobbies: user.hobbies || [],
    redFlags: user.redFlags || [],
    audioRecordings: user.audioRecordings || [],
    readReceiptsEnabled: user.readReceiptsEnabled !== false, // Default true
    showOnlineStatus: user.showOnlineStatus !== false, // Default true
    showLastSeen: user.showLastSeen !== false, // Default true
    appearOffline: user.appearOffline || false
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);
  const [availableRedFlags, setAvailableRedFlags] = useState<string[]>([]);
  const [audioQuestions, setAudioQuestions] = useState<AudioQuestion[]>([]);
  const [recordingStates, setRecordingStates] = useState<{ [key: number]: { isRecording: boolean; mediaRecorder: MediaRecorder | null; audioBlob: Blob | null; countdown: number } }>({});
  const [newHobby, setNewHobby] = useState('');
  const [newRedFlag, setNewRedFlag] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load available hobbies and red flags
    const loadData = async () => {
      try {
        const hobbies = await store.getAllHobbies();
        const redFlags = await store.getAllRedFlags();
        const questions = await store.getAllAudioQuestions();
        setAvailableHobbies(hobbies);
        setAvailableRedFlags(redFlags);
        setAudioQuestions(questions);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  /**
   * Handles avatar file selection and converts to Base64 for immediate preview
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Handles photo upload (max 5 photos)
   */
  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (formData.photos.length + files.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert('Please select image files only');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        continue;
      }

      try {
        // Upload to Firebase Storage with compression and renaming
        const photoUrl = await store.uploadUserPhoto(user.id, file, formData.username, formData.mbti);
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, photoUrl]
        }));
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        alert('Failed to upload photo');
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  /**
   * Handles audio recording
   */
  const startRecording = async (index: number, questionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const duration = await getAudioDuration(audioBlob);
        
        if (duration > 10) {
          showToast('Recording must be 10 seconds or less', 'error');
          setRecordingStates(prev => ({
            ...prev,
            [index]: { isRecording: false, mediaRecorder: null, audioBlob: null, countdown: 10 }
          }));
          return;
        }

        try {
          const audioUrl = await store.uploadAudioRecording(user.id, audioBlob);
          const question = audioQuestions.find(q => q.id === questionId);
          const updatedRecordings = [...formData.audioRecordings];
          updatedRecordings[index] = {
            questionId,
            questionText: question?.questionText || '',
            audioUrl
          };
          setFormData(prev => ({
            ...prev,
            audioRecordings: updatedRecordings
          }));
        } catch (error) {
          console.error('Error uploading audio:', error);
          alert('Failed to upload audio recording');
        }

        setRecordingStates(prev => ({
          ...prev,
          [index]: { isRecording: false, mediaRecorder: null, audioBlob: null, countdown: 10 }
        }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      let countdown = 10;
      setRecordingStates(prev => ({
        ...prev,
        [index]: { isRecording: true, mediaRecorder, audioBlob: null, countdown }
      }));

      // Countdown timer
      const countdownInterval = setInterval(() => {
        countdown--;
        setRecordingStates(prev => ({
          ...prev,
          [index]: { ...prev[index], countdown }
        }));
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        clearInterval(countdownInterval);
      }, 10000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone');
    }
  };

  const stopRecording = (index: number) => {
    const state = recordingStates[index];
    if (state?.mediaRecorder && state.isRecording) {
      state.mediaRecorder.stop();
    }
  };

  const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      };
    });
  };

  const handleAddHobby = () => {
    if (newHobby.trim() && !formData.hobbies.includes(newHobby.trim())) {
      setFormData(prev => ({
        ...prev,
        hobbies: [...prev.hobbies, newHobby.trim()]
      }));
      setNewHobby('');
    }
  };

  const handleRemoveHobby = (hobby: string) => {
    setFormData(prev => ({
      ...prev,
      hobbies: prev.hobbies.filter(h => h !== hobby)
    }));
  };

  const handleAddRedFlag = () => {
    if (newRedFlag.trim() && !formData.redFlags.includes(newRedFlag.trim())) {
      setFormData(prev => ({
        ...prev,
        redFlags: [...prev.redFlags, newRedFlag.trim()]
      }));
      setNewRedFlag('');
    }
  };

  const handleRemoveRedFlag = (redFlag: string) => {
    setFormData(prev => ({
      ...prev,
      redFlags: prev.redFlags.filter(r => r !== redFlag)
    }));
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = (): number => {
    let score = 0;
    const maxScore = 100;
    
    if (formData.username) score += 10;
    if (formData.avatarUrl) score += 15;
    if (formData.bio && formData.bio.length > 20) score += 15;
    if (formData.photos && formData.photos.length > 0) score += 20;
    if (formData.hobbies && formData.hobbies.length > 0) score += 15;
    if (formData.audioRecordings && formData.audioRecordings.length > 0) score += 15;
    if (formData.redFlags && formData.redFlags.length > 0) score += 10;
    
    return Math.min(score, maxScore);
  };

  const profileCompletion = calculateProfileCompletion();
  const isProfileComplete = profileCompletion === 100;

  /**
   * Saves profile changes to Firestore
   */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Update privacy settings separately
      await store.updateUserSettings(user.id, {
        readReceiptsEnabled: formData.readReceiptsEnabled,
        showOnlineStatus: formData.showOnlineStatus,
        showLastSeen: formData.showLastSeen,
        appearOffline: formData.appearOffline
      });
      
      await store.updateUserProfile(user.id, {
        ...formData,
        audioRecordings: formData.audioRecordings.filter(r => r.audioUrl) // Only save recordings with URLs
      });
      setSuccess('Profile updated successfully!');
      showToast('Profile saved successfully!', 'success');
      
      // Show celebration if profile is now complete
      if (isProfileComplete) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      } else {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 1500);
      }
      
      setTimeout(() => {
        onSave();
      }, isProfileComplete ? 3000 : 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handles password change
   */
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    setError('');
    setSuccess('');
    try {
      await store.updatePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto min-h-screen text-white pb-20 md:pb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          {showPreview ? 'Profile Preview' : 'Edit Profile'}
        </h2>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 glass-effect border border-pink-500/30 rounded-lg text-pink-300 hover:bg-pink-500/10 transition-all"
        >
          {showPreview ? '✏️ Edit' : '👁️ Preview'}
        </button>
      </div>

      {/* Profile Completion Indicator */}
      <div className="dating-card p-4 rounded-2xl mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-300">Profile Completion</span>
          <span className="text-lg font-bold text-pink-400">{profileCompletion}%</span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${profileCompletion}%` }}
          ></div>
        </div>
        {profileCompletion < 100 && (
          <p className="text-xs text-gray-400 mt-2">
            {profileCompletion < 50 && 'Add more info to get more matches!'}
            {profileCompletion >= 50 && profileCompletion < 100 && 'Almost there! Complete your profile for better matches.'}
          </p>
        )}
        {isProfileComplete && (
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <span>✓</span> Your profile is complete!
          </p>
        )}
      </div>

      {showCelebration && (
        isProfileComplete ? <Confetti onComplete={() => setShowCelebration(false)} /> : <CheckmarkAnimation onComplete={() => setShowCelebration(false)} />
      )}
      
      <div className="dating-card p-6 rounded-2xl space-y-6">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-500 border-4 border-pink-400/50 shadow-xl ring-4 ring-pink-500/20">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-500">?</div>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-sm dating-button-primary px-4 py-2 rounded-full text-white font-semibold"
          >
            Change Photo
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Photos Section (Max 5) */}
        <div className="border-t border-pink-500/20 pt-6">
          <h3 className="text-lg font-bold text-pink-500 mb-4">Photos ({formData.photos.length}/5)</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {formData.photos.map((photo, index) => (
              <div key={index} className="relative">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                  onClick={() => setSelectedPhotoIndex(index)}
                />
                <button
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            {formData.photos.length < 5 && (
              <button
                onClick={() => photosInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-pink-500/50 rounded-lg flex items-center justify-center text-pink-300 hover:border-pink-400 hover:bg-pink-500/10 transition-all"
              >
                + Add Photo
              </button>
            )}
          </div>
          <input
            type="file"
            ref={photosInputRef}
            onChange={handlePhotosChange}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Username</label>
            <input 
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Birth Date</label>
            <input 
              type="date"
              value={formData.birthDate}
              onChange={e => setFormData({...formData, birthDate: e.target.value})}
              className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
              disabled
              title="Birth date cannot be changed"
            />
            <small className="text-gray-500 text-xs">Cannot be changed</small>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Gender</label>
            <select 
              value={formData.gender}
              onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
              className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
              disabled
              title="Gender cannot be changed"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
            <small className="text-gray-500 text-xs">Cannot be changed</small>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">MBTI</label>
            <select 
              value={formData.mbti}
              onChange={e => setFormData({...formData, mbti: e.target.value})}
              className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
            >
              {MBTI_PROFILES.map(p => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Bio</label>
          <textarea 
            value={formData.bio}
            onChange={e => setFormData({...formData, bio: e.target.value})}
              className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 h-24 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all resize-none"
          />
        </div>

        {/* Hobbies Section */}
        <div className="border-t border-pink-500/20 pt-6">
          <h3 className="text-lg font-bold text-pink-500 mb-4">Hobbies</h3>
          {availableHobbies.length > 0 ? (
            <>
              <p className="text-sm text-gray-400 mb-3">Select from available hobbies:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {availableHobbies.map((hobby) => {
                  const isSelected = formData.hobbies.includes(hobby);
                  return (
                    <button
                      key={hobby}
                      onClick={() => {
                        if (isSelected) {
                          handleRemoveHobby(hobby);
                        } else {
                          if (!formData.hobbies.includes(hobby)) {
                            setFormData(prev => ({
                              ...prev,
                              hobbies: [...prev.hobbies, hobby]
                            }));
                          }
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/50'
                          : 'bg-white/10 backdrop-blur-sm border border-pink-500/30 text-gray-300 hover:bg-pink-500/30'
                      }`}
                    >
                      {hobby} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No hobbies available. Admin needs to add hobbies first.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {formData.hobbies.map((hobby, index) => (
              <span
                key={index}
                className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 px-3 py-1 rounded-full text-sm flex items-center gap-2 text-pink-200 backdrop-blur-sm"
              >
                {hobby}
                <button
                  onClick={() => handleRemoveHobby(hobby)}
                  className="text-red-400 hover:text-red-300 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Red Flags Section */}
        <div className="border-t border-pink-500/20 pt-6">
          <h3 className="text-lg font-bold text-pink-500 mb-4">Red Flags</h3>
          {availableRedFlags.length > 0 ? (
            <>
              <p className="text-sm text-gray-400 mb-3">Select from available red flags:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {availableRedFlags.map((redFlag) => {
                  const isSelected = formData.redFlags.includes(redFlag);
                  return (
                    <button
                      key={redFlag}
                      onClick={() => {
                        if (isSelected) {
                          handleRemoveRedFlag(redFlag);
                        } else {
                          if (!formData.redFlags.includes(redFlag)) {
                            setFormData(prev => ({
                              ...prev,
                              redFlags: [...prev.redFlags, redFlag]
                            }));
                          }
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50'
                          : 'bg-white/10 backdrop-blur-sm border border-red-500/30 text-gray-300 hover:bg-red-500/30'
                      }`}
                    >
                      {redFlag} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No red flags available. Admin needs to add red flags first.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {formData.redFlags.map((redFlag, index) => (
              <span
                key={index}
                className="bg-red-900/40 border border-red-500/50 px-3 py-1 rounded-full text-sm flex items-center gap-2 text-red-200 backdrop-blur-sm"
              >
                {redFlag}
                <button
                  onClick={() => handleRemoveRedFlag(redFlag)}
                  className="text-red-400 hover:text-red-300 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Audio Recordings Section */}
        <div className="border-t border-pink-500/20 pt-6">
          <h3 className="text-lg font-bold text-pink-500 mb-4">Audio Recordings (Max 3, 10 seconds each)</h3>
          {[0, 1, 2].map((index) => {
            const recording = formData.audioRecordings[index];
            const recordingState = recordingStates[index];
            const isRecording = recordingState?.isRecording || false;
            
            return (
              <div key={index} className="mb-4 p-4 bg-gray-900 rounded-lg">
                <label className="block text-gray-400 text-sm mb-2">
                  Recording {index + 1}
                </label>
                {audioQuestions.length > 0 ? (
                  <select
                    value={recording?.questionId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const question = audioQuestions.find(q => q.id === e.target.value);
                        const updated = [...formData.audioRecordings];
                        updated[index] = {
                          questionId: e.target.value,
                          questionText: question?.questionText || '',
                          audioUrl: recording?.audioUrl || ''
                        };
                        setFormData(prev => ({ ...prev, audioRecordings: updated }));
                      }
                    }}
                    className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all mb-2"
                  >
                    <option value="">Select a question</option>
                    {audioQuestions.map(q => (
                      <option key={q.id} value={q.id}>{q.questionText}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-400 mb-2">No audio questions available. Admin needs to add questions first.</p>
                )}
                {recording?.questionText && (
                  <p className="text-sm text-gray-400 mb-2 italic">"{recording.questionText}"</p>
                )}
                <div className="flex gap-2">
                  {!isRecording && !recording?.audioUrl && (
                    <button
                      onClick={() => {
                        if (recording?.questionId) {
                          startRecording(index, recording.questionId);
                          showToast('Recording started. You have 10 seconds.', 'info');
                        }
                      }}
                      disabled={!recording?.questionId || isRecording}
                      className="px-4 py-2 dating-button-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold"
                    >
                      🎤 Record (10s max)
                    </button>
                  )}
                  {isRecording && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500 rounded-lg">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-300 font-bold text-lg">
                          {recordingStates[index]?.countdown || 10}s
                        </span>
                      </div>
                      <button
                        onClick={() => stopRecording(index)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-semibold"
                      >
                        ⏹ Stop
                      </button>
                    </div>
                  )}
                  {recording?.audioUrl && (
                    <>
                      <audio src={recording.audioUrl} controls className="flex-1" />
                      <button
                        onClick={() => {
                          const updated = [...formData.audioRecordings];
                          updated[index] = { ...updated[index], audioUrl: '' };
                          setFormData(prev => ({ ...prev, audioRecordings: updated }));
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-2 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900 bg-opacity-50 border border-green-500 text-green-200 px-4 py-2 rounded">
            {success}
          </div>
        )}

        {/* Privacy Settings Section */}
        <div className="border-t border-pink-500/20 pt-6">
          <h3 className="text-lg font-bold text-pink-500 mb-4">Privacy Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <div className="font-semibold text-white">Read Receipts</div>
                <div className="text-xs text-gray-400">Let others see when you've read their messages</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.readReceiptsEnabled}
                  onChange={(e) => setFormData({...formData, readReceiptsEnabled: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <div className="font-semibold text-white">Show Online Status</div>
                <div className="text-xs text-gray-400">Let others see when you're online</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showOnlineStatus}
                  onChange={(e) => setFormData({...formData, showOnlineStatus: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <div className="font-semibold text-white">Show Last Seen</div>
                <div className="text-xs text-gray-400">Let others see when you were last active</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showLastSeen}
                  onChange={(e) => setFormData({...formData, showLastSeen: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <div className="font-semibold text-white">Appear Offline</div>
                <div className="text-xs text-gray-400">Hide your online status from others</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.appearOffline}
                  onChange={(e) => setFormData({...formData, appearOffline: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="border-t border-pink-500/20 pt-6">
          <h3 className="text-lg font-bold text-pink-500 mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Current Password</label>
              <input 
                type="password"
                value={passwordData.currentPassword}
                onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">New Password</label>
              <input 
                type="password"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Confirm New Password</label>
              <input 
                type="password"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                className="w-full bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
                placeholder="Confirm new password"
              />
            </div>
            <button 
              onClick={handleChangePassword} 
              disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded font-bold text-sm"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-800 rounded font-bold"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhotoIndex !== null && formData.photos[selectedPhotoIndex] && (
        <PhotoModal
          photos={formData.photos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onNavigate={(index) => setSelectedPhotoIndex(index)}
        />
      )}
    </div>
  );
};
