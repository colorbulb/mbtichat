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
 * 
 * Real-time Data:
 * - Uses `store.subscribeToAllUsers` for live updates
 * - Filters applied client-side after receiving all users
 * 
 * Performance Considerations:
 * - Currently fetches ALL users and filters client-side
 * - For scale, should move filtering to backend (Firestore queries with indexed fields)
 * - Consider pagination or infinite scroll for large user bases
 * 
 * TODO:
 * - Add location/distance filter (common in dating apps)
 * - Implement pagination or infinite scroll
 * - Move filtering to backend queries for better performance
 */
import React, { useState, useEffect } from 'react';
import { User, MBTIGroup, Gender } from '../types';
import { MBTI_PROFILES, GROUP_COLORS } from '../constants';
import { store } from '../services/store';

export const DiscoverScreen: React.FC<{
  currentUser: User;
  onStartChat: (user: User) => void;
}> = ({ currentUser, onStartChat }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState<MBTIGroup | 'All'>('All');
  const [filterGender, setFilterGender] = useState<Gender | 'All'>('All');
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(99);

  /**
   * Subscribes to real-time user updates from Firestore
   * Filters out current user and admins from the list
   * 
   * Note: This fetches ALL users and filters client-side.
   * For better performance at scale, consider backend filtering.
   */
  useEffect(() => {
    setLoading(true);
    
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
   * Filters by: MBTI Group, Gender, Age Range
   * 
   * TODO: Move this filtering to backend (Firestore queries) for better performance
   */
  const filteredUsers = users.filter(user => {
    const profile = MBTI_PROFILES.find(p => p.code === user.mbti);
    const matchesGroup = filterGroup === 'All' || profile?.group === filterGroup;
    const matchesGender = filterGender === 'All' || user.gender === filterGender;
    const matchesAge = user.age >= minAge && user.age <= maxAge;
    return matchesGroup && matchesGender && matchesAge;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-8 flex flex-wrap gap-4 items-end shadow-lg">
        <div>
          <label className="block text-xs text-gray-400 mb-1">MBTI Group</label>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value as MBTIGroup | 'All')}
            className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
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
             className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
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

      {loading ? (
        <div className="text-center text-gray-400 py-20">Loading users...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map(user => {
            const profile = MBTI_PROFILES.find(p => p.code === user.mbti);
            const groupColor = profile ? GROUP_COLORS[profile.group] : 'text-gray-400 border-gray-500';

            return (
              <div key={user.id} className={`bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-pink-500 transition-all hover:shadow-lg hover:shadow-pink-900/20 group flex flex-col`}>
                <div className="relative h-48 bg-gray-700">
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-gray-900 to-transparent">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-500'} border-2 border-gray-800`}></span>
                      <span className="text-white font-bold text-lg">{user.username}, {user.age}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded border text-xs font-bold ${groupColor}`}>
                      {user.mbti}
                    </span>
                    <span className="text-gray-400 text-xs">{user.gender}</span>
                  </div>

                  <p className="text-gray-300 text-sm line-clamp-2 h-10 italic">
                    "{user.bio}"
                  </p>

                  <div className="mt-auto pt-2">
                    <button
                      onClick={() => onStartChat(user)}
                      className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-12 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
              <div className="text-2xl mb-2">🔍</div>
              No users match your filters. Try adjusting the criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};