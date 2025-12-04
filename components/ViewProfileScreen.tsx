import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { store } from '../services/store';
import { PhotoModal } from './PhotoModal';
import { MBTI_PROFILES, GROUP_COLORS } from '../constants';
import { useToast } from './Toast';

export const ViewProfileScreen: React.FC<{
  userId: string;
  currentUser: User;
  onBack: () => void;
  onStartChat: (user: User) => void;
}> = ({ userId, currentUser, onBack, onStartChat }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [profileViews, setProfileViews] = useState<{ viewerId: string; timestamp: number }[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const loadedUser = await store.getUserById(userId);
        setUser(loadedUser || null);
        
        // Track profile view
        if (loadedUser && userId !== currentUser.id) {
          await store.trackProfileView(userId, currentUser.id);
        }
        
        // Load profile views if viewing own profile
        if (userId === currentUser.id) {
          const views = await store.getProfileViews(userId);
          setProfileViews(views);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [userId, currentUser.id]);

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto min-h-screen text-white pb-20 md:pb-6">
        <div className="dating-card p-12 rounded-2xl text-center">
          <div className="animate-pulse">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto min-h-screen text-white pb-20 md:pb-6">
        <div className="dating-card p-12 rounded-2xl text-center">
          <p className="text-gray-400">User not found</p>
          <button
            onClick={onBack}
            className="mt-4 dating-button-primary px-6 py-2 rounded-xl text-white font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const profile = MBTI_PROFILES.find(p => p.code === user.mbti);
  const groupColor = profile ? GROUP_COLORS[profile.group] : 'text-gray-400 border-gray-500';

  const getLastSeenText = () => {
    if (user.isOnline) return 'Online';
    if (!user.lastSeen) return 'Offline';
    const minutes = Math.floor((Date.now() - user.lastSeen) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto min-h-screen text-white pb-20 md:pb-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
          {user.username}'s Profile
          {user.isVerified && (
            <span className="text-blue-400" title={`Verified ${user.verificationBadge || 'profile'}`}>
              ✓
            </span>
          )}
        </h2>
      </div>

      <div className="dating-card p-6 rounded-2xl space-y-6">
        {/* Avatar & Basic Info */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-500 border-4 border-pink-400/50 shadow-xl ring-4 ring-pink-500/20">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-500">?</div>
            )}
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-1">{user.username}, {user.age}</h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full border-2 text-xs font-bold shadow-lg ${groupColor} bg-white/10 backdrop-blur-sm`}>
                {user.mbti}
              </span>
              <span className="text-pink-300 text-sm">{user.gender}</span>
            </div>
            <div className="text-pink-200 text-sm flex items-center justify-center gap-1">
              <span className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
              {getLastSeenText()}
            </div>
          </div>
        </div>

        {/* Photos */}
        {user.photos && user.photos.length > 0 && (
          <div className="border-t border-pink-500/20 pt-6">
            <h3 className="text-lg font-bold text-pink-500 mb-4">Photos</h3>
            <div className="grid grid-cols-3 gap-4">
              {user.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedPhotoIndex(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <div className="border-t border-pink-500/20 pt-6">
            <h3 className="text-lg font-bold text-pink-500 mb-2">About</h3>
            <p className="text-gray-200 italic bg-white/5 p-4 rounded-lg border border-white/10">
              "{user.bio}"
            </p>
          </div>
        )}

        {/* Hobbies */}
        {user.hobbies && user.hobbies.length > 0 && (
          <div className="border-t border-pink-500/20 pt-6">
            <h3 className="text-lg font-bold text-pink-500 mb-3">Hobbies</h3>
            <div className="flex flex-wrap gap-2">
              {user.hobbies.map((hobby, idx) => (
                <span
                  key={idx}
                  className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 px-3 py-1 rounded-full text-sm text-pink-200 backdrop-blur-sm"
                >
                  {hobby}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {user.redFlags && user.redFlags.length > 0 && (
          <div className="border-t border-pink-500/20 pt-6">
            <h3 className="text-lg font-bold text-pink-500 mb-3">Red Flags</h3>
            <div className="flex flex-wrap gap-2">
              {user.redFlags.map((redFlag, idx) => (
                <span
                  key={idx}
                  className="bg-red-900/40 border border-red-500/50 px-3 py-1 rounded-full text-sm text-red-200 backdrop-blur-sm"
                >
                  {redFlag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Audio Recordings */}
        {user.audioRecordings && user.audioRecordings.length > 0 && (
          <div className="border-t border-pink-500/20 pt-6">
            <h3 className="text-lg font-bold text-pink-500 mb-4">Voice Responses</h3>
            <div className="space-y-4">
              {user.audioRecordings.map((recording, idx) => (
                recording.audioUrl && (
                  <div key={idx} className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-sm text-gray-300 mb-2 font-semibold">
                      {recording.questionText || `Question ${idx + 1}`}
                    </p>
                    <audio src={recording.audioUrl} controls className="w-full" />
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-pink-500/20 pt-6 flex gap-3">
          <button
            onClick={() => onStartChat(user)}
            className="flex-1 dating-button-primary py-3 rounded-xl text-white font-bold text-center"
          >
            💬 Message
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 glass-effect border border-white/20 rounded-xl text-white hover:bg-white/10 transition-all"
          >
            Back
          </button>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhotoIndex !== null && user.photos && (
        <PhotoModal
          photos={user.photos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onNavigate={(index) => setSelectedPhotoIndex(index)}
        />
      )}
    </div>
  );
};

