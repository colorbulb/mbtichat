/**
 * ProfileScreen Component
 * 
 * User profile editing interface for regular users.
 * 
 * Key Features:
 * - Standard edit flow: load data, modify, save
 * - Avatar upload with optimistic UI update (Base64 preview)
 * - Immutable fields: Birth Date and Gender cannot be changed (disabled with note)
 * - Editable fields: Username, MBTI, Bio, Avatar
 * 
 * Avatar Handling:
 * - Uses FileReader to convert image to Base64 for immediate preview
 * - Note: Base64 strings should be uploaded to Firebase Storage and URL saved
 * - Current implementation passes Base64 directly, which may hit document size limits
 * 
 * TODO:
 * - Implement Firebase Storage upload for avatars (store URL, not Base64)
 * - Add client-side validation (username/bio length limits)
 * - Consider adding logout button (common on profile/settings screens)
 */
import React, { useState, useRef } from 'react';
import { User, MBTIGroup, Gender } from '../types';
import { MBTI_PROFILES } from '../constants';
import { store } from '../services/store';

export const ProfileScreen: React.FC<{ 
  user: User; 
  onSave: () => void;
  onCancel: () => void;
}> = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    birthDate: user.birthDate || '2000-01-01',
    gender: user.gender,
    mbti: user.mbti,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || ''
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles avatar file selection and converts to Base64 for immediate preview
   * The Base64 string is stored temporarily for preview, then uploaded to Firebase Storage
   * when the user saves the profile
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        // Store Base64 string for immediate preview
        // Will be uploaded to Firebase Storage when user saves
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Saves profile changes to Firestore
   * Updates user document with new form data
   */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await store.updateUserProfile(user.id, {
        ...formData
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
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
    <div className="p-6 max-w-2xl mx-auto bg-gray-900 min-h-screen text-white">
      <h2 className="text-3xl font-bold mb-6 text-pink-500">Edit Profile</h2>
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 border-4 border-gray-600">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-500">?</div>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-full transition-colors"
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

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Username</label>
            <input 
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              className="w-full bg-gray-900 border border-gray-600 rounded p-2"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Birth Date</label>
            <input 
              type="date"
              value={formData.birthDate}
              onChange={e => setFormData({...formData, birthDate: e.target.value})}
              className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
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
              className="w-full bg-gray-900 border border-gray-600 rounded p-2"
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
              className="w-full bg-gray-900 border border-gray-600 rounded p-2"
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
            className="w-full bg-gray-900 border border-gray-600 rounded p-2 h-24"
          />
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

        {/* Password Change Section */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-pink-500 mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Current Password</label>
              <input 
                type="password"
                value={passwordData.currentPassword}
                onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">New Password</label>
              <input 
                type="password"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Confirm New Password</label>
              <input 
                type="password"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2"
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
    </div>
  );
};