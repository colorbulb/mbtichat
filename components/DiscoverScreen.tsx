/**
 * DiscoverScreen Component
 * 
 * Main discovery/browsing interface for finding potential matches.
 * 
 * Key Features:
 * - Real-time user list updates via Firestore subscription
 * - Multiple filters: MBTI Group, Gender, Age Range
 * - Visual user cards with MBTI, age, online status, and bio
 * - Empty state handling when no users match filters
 * - Compatibility scores based on MBTI types
 * - Super Like functionality
 * - Daily Question display
 * 
 * Real-time Data:
 * - Uses `store.subscribeToAllUsers` for live updates
 * - Filters applied client-side after receiving all users
 * 
 * Performance Considerations:
 * - Currently fetches ALL users and filters client-side
 * - For scale, should move filtering to backend (Firestore queries with indexed fields)
 * - Consider pagination or infinite scroll for large user bases
 */
import React, { useState, useEffect } from 'react';
import { User, MBTIGroup, Gender, DailyQuestion, CompatibilityResult } from '../types';
import { MBTI_PROFILES, GROUP_COLORS } from '../constants';
import { store } from '../services/store';
import { PhotoModal } from './PhotoModal';
import { UserCardSkeleton } from './LoadingSkeleton';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

export const DiscoverScreen: React.FC<{
  currentUser: User;
  onStartChat: (user: User) => void;
}> = ({ currentUser, onStartChat }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [photoIndices, setPhotoIndices] = useState<Map<string, number>>(new Map());
  const [touchStart, setTouchStart] = useState<{ userId: string; x: number } | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState<MBTIGroup | 'All'>('All');
  const [filterGender, setFilterGender] = useState<Gender | 'All'>('All');
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(99);
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);
  const [availableRedFlags, setAvailableRedFlags] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<{ userId: string; index: number } | null>(null);
  
  // Gamification states
  const [dailyQuestion, setDailyQuestion] = useState<DailyQuestion | null>(null);
  const [dailyAnswer, setDailyAnswer] = useState<string>('');
  const [superLikedUsers, setSuperLikedUsers] = useState<Set<string>>(new Set());
  const [compatibilityCache, setCompatibilityCache] = useState<Map<string, CompatibilityResult>>(new Map());

  /**
   * Subscribes to real-time user updates from Firestore
   * Filters out current user and admins from the list
   * 
   * Note: This fetches ALL users and filters client-side.
   * For better performance at scale, consider backend filtering.
   */
  useEffect(() => {
    setLoading(true);
    
    // Load available hobbies and red flags
    const loadData = async () => {
      try {
        const hobbies = await store.getAllHobbies();
        const redFlags = await store.getAllRedFlags();
        setAvailableHobbies(hobbies);
        setAvailableRedFlags(redFlags);
        
        // Load match suggestions
        const suggestions = await store.getMatchSuggestions(currentUser.id, 5);
        setMatchSuggestions(suggestions);
        
        // Load daily question
        const question = await store.getTodaysDailyQuestion();
        setDailyQuestion(question);
        
        // Update login streak
        await store.updateLoginStreak(currentUser.id);
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };
    loadData();
    
    // Subscribe to real-time user updates
    const unsubscribe = store.subscribeToAllUsers((allUsers) => {
      // Filter out current user and admins
      const filtered = allUsers.filter(u => u.id !== currentUser.id && !u.isAdmin);
      setUsers(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  /**
   * Applies client-side filters to the user list
   * Filters by: MBTI Group, Gender, Age Range, Hobbies, Red Flags
   * 
   * TODO: Move this filtering to backend (Firestore queries) for better performance
   */
  const filteredUsers = users.filter(user => {
    const profile = MBTI_PROFILES.find(p => p.code === user.mbti);
    const matchesGroup = filterGroup === 'All' || profile?.group === filterGroup;
    const matchesGender = filterGender === 'All' || user.gender === filterGender;
    const matchesAge = user.age >= minAge && user.age <= maxAge;
    const matchesHobbies = selectedHobbies.length === 0 || selectedHobbies.some(h => user.hobbies?.includes(h));
    const matchesRedFlags = selectedRedFlags.length === 0 || selectedRedFlags.some(r => user.redFlags?.includes(r));
    return matchesGroup && matchesGender && matchesAge && matchesHobbies && matchesRedFlags;
  });

  const getLastSeenText = (user: User) => {
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

  // Get compatibility score with caching
  const getCompatibility = (userMbti: string): CompatibilityResult => {
    const cached = compatibilityCache.get(userMbti);
    if (cached) {
      return cached;
    }
    const result = store.calculateCompatibility(currentUser.mbti, userMbti);
    // Update cache with a new Map copy for proper React state updates
    setCompatibilityCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.set(userMbti, result);
      return newCache;
    });
    return result;
  };

  // Handle super like
  const handleSuperLike = async (userId: string, username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (superLikedUsers.has(userId)) {
      showToast(`You already super liked ${username} today`, 'info');
      return;
    }
    try {
      const success = await store.sendSuperLike(currentUser.id, userId);
      if (success) {
        setSuperLikedUsers(new Set(superLikedUsers.add(userId)));
        showToast(`⭐ Super liked ${username}!`, 'success');
      } else {
        showToast(`You already super liked ${username} today`, 'info');
      }
    } catch (error) {
      console.error('Super like error:', error);
      showToast('Failed to send super like', 'error');
    }
  };

  // Handle daily question answer
  const handleAnswerDailyQuestion = async () => {
    if (!dailyQuestion || !dailyAnswer.trim()) return;
    try {
      await store.answerDailyQuestion(currentUser.id, dailyQuestion.id, dailyAnswer.trim());
      showToast('Thanks for answering! +15 XP 🎉', 'success');
      setDailyQuestion(null);
    } catch (error) {
      console.error('Answer daily question error:', error);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Daily Question */}
      {dailyQuestion && (
        <div className="dating-card p-4 rounded-2xl mb-6 border-2 border-pink-500/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💭</span>
            <h3 className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Question of the Day
            </h3>
          </div>
          <p className="text-white text-lg mb-4">{dailyQuestion.question}</p>
          {dailyQuestion.options && dailyQuestion.options.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {dailyQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setDailyAnswer(option)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    dailyAnswer === option
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={dailyAnswer}
              onChange={(e) => setDailyAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full bg-white/10 border border-pink-500/30 rounded-xl p-3 text-white mb-4"
            />
          )}
          <button
            onClick={handleAnswerDailyQuestion}
            disabled={!dailyAnswer.trim()}
            className="dating-button-primary px-6 py-2 rounded-xl text-white font-semibold disabled:opacity-50"
          >
            Submit Answer (+15 XP)
          </button>
        </div>
      )}

      {/* User Stats */}
      <div className="dating-card p-4 rounded-2xl mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl">🔥</div>
            <div className="text-xs text-gray-400">Streak</div>
            <div className="text-white font-bold">{currentUser.streak || 0} days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">⭐</div>
            <div className="text-xs text-gray-400">Level</div>
            <div className="text-white font-bold">{currentUser.level || 1}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">💕</div>
            <div className="text-xs text-gray-400">Super Likes</div>
            <div className="text-white font-bold">{currentUser.superLikesReceived || 0}</div>
          </div>
        </div>
        {currentUser.badges && currentUser.badges.length > 0 && (
          <div className="flex gap-1">
            {currentUser.badges.slice(0, 3).map((badgeId, idx) => (
              <span key={idx} className="text-xl" title={badgeId}>🏆</span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="dating-card p-4 rounded-2xl mb-8">
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">MBTI Group</label>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value as MBTIGroup | 'All')}
              className="bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
            >
              <option value="All">All Groups</option>
              <option value="Analysts">Analysts</option>
              <option value="Diplomats">Diplomats</option>
              <option value="Sentinels">Sentinels</option>
              <option value="Explorers">Explorers</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gender</label>
            <select
               value={filterGender}
               onChange={(e) => setFilterGender(e.target.value as Gender | 'All')}
               className="bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex gap-2">
             <div>
              <label className="block text-xs text-gray-400 mb-1">Min Age</label>
              <input
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="w-20 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
              />
             </div>
             <div>
              <label className="block text-xs text-gray-400 mb-1">Max Age</label>
              <input
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="w-20 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
              />
             </div>
          </div>
        </div>
        
        {/* Hobbies Filter */}
        {availableHobbies.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Hobbies</label>
            <div className="flex flex-wrap gap-2">
              {availableHobbies.map(hobby => (
                <button
                  key={hobby}
                  onClick={() => {
                    if (selectedHobbies.includes(hobby)) {
                      setSelectedHobbies(selectedHobbies.filter(h => h !== hobby));
                    } else {
                      setSelectedHobbies([...selectedHobbies, hobby]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    selectedHobbies.includes(hobby)
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/50'
                      : 'bg-white/10 backdrop-blur-sm text-gray-300 hover:bg-pink-500/30 border border-white/20'
                  }`}
                >
                  {hobby}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags Filter */}
        {availableRedFlags.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Red Flags</label>
            <div className="flex flex-wrap gap-2">
              {availableRedFlags.map(redFlag => (
                <button
                  key={redFlag}
                  onClick={() => {
                    if (selectedRedFlags.includes(redFlag)) {
                      setSelectedRedFlags(selectedRedFlags.filter(r => r !== redFlag));
                    } else {
                      setSelectedRedFlags([...selectedRedFlags, redFlag]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    selectedRedFlags.includes(redFlag)
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50'
                      : 'bg-white/10 backdrop-blur-sm text-gray-300 hover:bg-red-500/30 border border-white/20'
                  }`}
                >
                  {redFlag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Loading users...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map(user => {
            const profile = MBTI_PROFILES.find(p => p.code === user.mbti);
            const groupColor = profile ? GROUP_COLORS[profile.group] : 'text-gray-400 border-gray-500';

            return (
              <div 
                key={user.id} 
                className="dating-card rounded-2xl overflow-hidden group flex flex-col cursor-pointer"
                onClick={() => navigate(`/user/${user.id}`)}
              >
                <div className="relative h-64 bg-gradient-to-br from-pink-500/20 to-purple-500/20 overflow-hidden">
                  <div 
                    className="relative w-full h-full"
                    onTouchStart={(e) => {
                      setTouchStart({ userId: user.id, x: e.touches[0].clientX });
                    }}
                    onTouchEnd={(e) => {
                      if (!touchStart || touchStart.userId !== user.id) return;
                      const touchEnd = e.changedTouches[0].clientX;
                      const diff = touchStart.x - touchEnd;
                      const currentIndex = photoIndices.get(user.id) || 0;
                      // Show avatar first, then photos
                      const photos = user.avatarUrl ? [user.avatarUrl, ...(user.photos || [])] : (user.photos || []);
                      
                      if (Math.abs(diff) > 50) { // Swipe threshold
                        if (diff > 0 && currentIndex < photos.length - 1) {
                          // Swipe left - next photo
                          setPhotoIndices(new Map(photoIndices.set(user.id, currentIndex + 1)));
                        } else if (diff < 0 && currentIndex > 0) {
                          // Swipe right - previous photo
                          setPhotoIndices(new Map(photoIndices.set(user.id, currentIndex - 1)));
                        }
                      }
                      setTouchStart(null);
                    }}
                    onClick={() => {
                      // Show avatar first, then photos
                      const photos = user.avatarUrl ? [user.avatarUrl, ...(user.photos || [])] : (user.photos || []);
                      const currentIndex = photoIndices.get(user.id) || 0;
                      setSelectedPhotoIndex({ userId: user.id, index: currentIndex });
                    }}
                  >
                    {(() => {
                      // Show avatar first, then photos
                      const photos = user.avatarUrl ? [user.avatarUrl, ...(user.photos || [])] : (user.photos || []);
                      const currentIndex = photoIndices.get(user.id) || 0;
                      return (
                        <img
                          src={photos[currentIndex] || user.avatarUrl}
                          alt={user.username}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-pointer"
                        />
                      );
                    })()}
                  </div>
                  {(() => {
                    // If the user has at least one photo or avatar, just apply a subtle gradient overlay
                    const hasPhotos =
                      (user.photos && user.photos.length > 0) ||
                      !!user.avatarUrl;
                    if (hasPhotos) {
                      return (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      );
                    }
                    // Fallback: show a large centered profile picture instead of a dark overlay
                    return (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-pink-500/60 shadow-xl">
                          <img
                            src={user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(user.username)}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    );
                  })()}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' : 'bg-gray-500'} border-2 border-white/50`}></span>
                      <span className="text-white font-bold text-xl drop-shadow-lg">{user.username}, {user.age}</span>
                    </div>
                    {(() => {
                      // Show avatar first, then photos
                      const photos = user.avatarUrl ? [user.avatarUrl, ...(user.photos || [])] : (user.photos || []);
                      const currentIndex = photoIndices.get(user.id) || 0;
                      if (photos.length > 1) {
                        return (
                          <div className="flex gap-1 mt-2">
                            {photos.slice(0, 5).map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`h-1 flex-1 rounded-full transition-all ${
                                  idx === currentIndex ? 'bg-white' : 'bg-white/30'
                                }`}
                              ></div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {/* Heart icon overlay on hover */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-pink-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <span className="text-xl">💕</span>
                    </div>
                  </div>
                  {/* Compatibility score badge */}
                  <div className="absolute top-4 left-4">
                    {(() => {
                      const compat = getCompatibility(user.mbti);
                      const colorClass = compat.score >= 80 ? 'from-green-500 to-emerald-500' : 
                                        compat.score >= 60 ? 'from-yellow-500 to-amber-500' : 
                                        'from-red-500 to-orange-500';
                      return (
                        <div className={`bg-gradient-to-r ${colorClass} px-2 py-1 rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-1`}>
                          <span>💕</span>
                          <span>{compat.score}%</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col bg-gradient-to-b from-gray-900/95 to-gray-800/95">
                  <div className="flex justify-between items-center">
                    <span className={`px-3 py-1 rounded-full border-2 text-xs font-bold shadow-lg ${groupColor} bg-white/10 backdrop-blur-sm`}>
                      {user.mbti}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-pink-300 text-xs font-semibold">{user.gender}</span>
                      {user.isVerified && (
                        <span className="text-blue-400" title="Verified">✓</span>
                      )}
                    </div>
                  </div>

                  <div className="text-pink-200 text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                    {getLastSeenText(user)}
                  </div>

                  {user.bio && (
                    <p className="text-gray-200 text-sm line-clamp-2 italic bg-white/5 p-2 rounded-lg border border-white/10">
                      "{user.bio}"
                    </p>
                  )}

                  {user.hobbies && user.hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {user.hobbies.slice(0, 3).map((hobby, idx) => (
                        <span key={idx} className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 px-2.5 py-1 rounded-full text-xs text-pink-200 backdrop-blur-sm">
                          {hobby}
                        </span>
                      ))}
                      {user.hobbies.length > 3 && (
                        <span className="text-pink-300 text-xs font-semibold">+{user.hobbies.length - 3}</span>
                      )}
                    </div>
                  )}

                  {user.redFlags && user.redFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {user.redFlags.slice(0, 2).map((redFlag, idx) => (
                        <span key={idx} className="bg-red-900/40 border border-red-500/50 px-2.5 py-1 rounded-full text-xs text-red-200 backdrop-blur-sm">
                          {redFlag}
                        </span>
                      ))}
                      {user.redFlags.length > 2 && (
                        <span className="text-red-400 text-xs font-semibold">+{user.redFlags.length - 2}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex gap-2">
                    <button
                      onClick={(e) => handleSuperLike(user.id, user.username, e)}
                      className={`p-3 rounded-xl transition-all ${
                        superLikedUsers.has(user.id)
                          ? 'bg-yellow-500 text-white'
                          : 'glass-effect border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20'
                      }`}
                      title="Super Like"
                    >
                      ⭐
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/${user.id}`);
                      }}
                      className="flex-1 glass-effect border border-pink-500/30 text-pink-300 hover:bg-pink-500/10 font-semibold py-3 rounded-xl transition-all text-sm"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartChat(user);
                        showToast(`Started conversation with ${user.username}`, 'success');
                      }}
                      className="flex-1 dating-button-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                    >
                      <span>💬</span>
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-12 dating-card rounded-xl">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
              <p className="text-gray-400 mb-6">Try adjusting your filters to see more people</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => {
                    setFilterGroup('All');
                    setFilterGender('All');
                    setMinAge(18);
                    setMaxAge(99);
                    setSelectedHobbies([]);
                    setSelectedRedFlags([]);
                    showToast('Filters cleared', 'info');
                  }}
                  className="dating-button-primary px-6 py-2 rounded-xl text-white font-semibold"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhotoIndex && (() => {
        const user = users.find(u => u.id === selectedPhotoIndex.userId);
        if (!user || !user.photos || user.photos.length === 0) return null;
        return (
          <PhotoModal
            photos={user.photos}
            currentIndex={selectedPhotoIndex.index}
            onClose={() => setSelectedPhotoIndex(null)}
            onNavigate={(index) => setSelectedPhotoIndex({ userId: selectedPhotoIndex.userId, index })}
          />
        );
      })()}
    </div>
  );
};