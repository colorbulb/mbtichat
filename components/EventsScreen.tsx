/**
 * EventsScreen Component
 * 
 * Events discovery and creation interface.
 * 
 * Key Features:
 * - View all events
 * - Create new events
 * - Filter events by various criteria
 * - Join events
 */
import React, { useState, useEffect } from 'react';
import { User, Event, Gender } from '../types';
import { MBTI_PROFILES } from '../constants';
import { store } from '../services/store';
import { PhotoModal } from './PhotoModal';

export const EventsScreen: React.FC<{
  currentUser: User;
}> = ({ currentUser }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<{ eventId: string; index: number } | null>(null);
  const [eventReminders, setEventReminders] = useState<Map<string, number>>(new Map()); // eventId -> countdown seconds
  const [filterGender, setFilterGender] = useState<Gender | 'All'>('All');
  const [filterMBTI, setFilterMBTI] = useState<string>('All');
  const [filterHobby, setFilterHobby] = useState<string>('All');
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    minAge: 18,
    maxAge: 99,
    genderFilter: [] as Gender[],
    mbtiFilter: [] as string[],
    hobbiesFilter: [] as string[],
    photos: [] as string[]
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const allEvents = await store.getAllEvents();
        setEvents(allEvents);
        const hobbies = await store.getAllHobbies();
        setAvailableHobbies(hobbies);
        
        // Initialize reminders for events user is participating in
        const reminders = new Map<string, number>();
        allEvents.forEach(event => {
          if (event.participants?.includes(currentUser.id)) {
            const timeUntil = event.startDate - Date.now();
            if (timeUntil > 0) {
              reminders.set(event.id, Math.floor(timeUntil / 1000));
            }
          }
        });
        setEventReminders(reminders);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    
    // Update countdown every second
    const interval = setInterval(() => {
      setEventReminders(prev => {
        const updated = new Map(prev);
        updated.forEach((seconds, eventId) => {
          if (seconds > 0) {
            updated.set(eventId, seconds - 1);
          } else {
            updated.delete(eventId);
          }
        });
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleCreateEvent = async () => {
    try {
      const eventId = await store.createEvent({
        creatorId: currentUser.id,
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate || newEvent.startDate,
        ageRange: { min: newEvent.minAge, max: newEvent.maxAge },
        genderFilter: newEvent.genderFilter.length > 0 ? newEvent.genderFilter : undefined,
        mbtiFilter: newEvent.mbtiFilter.length > 0 ? newEvent.mbtiFilter : undefined,
        hobbiesFilter: newEvent.hobbiesFilter.length > 0 ? newEvent.hobbiesFilter : undefined,
        photos: newEvent.photos,
        participants: []
      });
      
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        minAge: 18,
        maxAge: 99,
        genderFilter: [],
        mbtiFilter: [],
        hobbiesFilter: [],
        photos: []
      });
      
      // Reload events
      const allEvents = await store.getAllEvents();
      setEvents(allEvents);
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      await store.joinEvent(eventId, currentUser.id);
      const allEvents = await store.getAllEvents();
      setEvents(allEvents);
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Failed to join event');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const photoUrl = await store.uploadUserPhoto(currentUser.id, file);
        setNewEvent(prev => ({
          ...prev,
          photos: [...prev.photos, photoUrl]
        }));
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesGender = filterGender === 'All' || !event.genderFilter || event.genderFilter.includes(filterGender);
    const matchesMBTI = filterMBTI === 'All' || !event.mbtiFilter || event.mbtiFilter.includes(filterMBTI);
    const matchesHobby = filterHobby === 'All' || !event.hobbiesFilter || event.hobbiesFilter.includes(filterHobby);
    return matchesGender && matchesMBTI && matchesHobby;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 md:pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">📅 Events</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="dating-button-primary px-4 py-2 text-white rounded-xl font-bold"
        >
          + Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="dating-card p-4 rounded-2xl mb-8 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Gender</label>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as Gender | 'All')}
            className="bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
          >
            <option value="All">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">MBTI</label>
          <select
            value={filterMBTI}
            onChange={(e) => setFilterMBTI(e.target.value)}
            className="bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
          >
            <option value="All">All</option>
            {MBTI_PROFILES.map(p => (
              <option key={p.code} value={p.code}>{p.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Hobby</label>
          <select
            value={filterHobby}
            onChange={(e) => setFilterHobby(e.target.value)}
            className="bg-white/10 backdrop-blur-sm border border-pink-500/30 rounded-lg p-2 text-white text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
          >
            <option value="All">All</option>
            {availableHobbies.map(hobby => (
              <option key={hobby} value={hobby}>{hobby}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Loading events...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <div key={event.id} className="dating-card rounded-2xl overflow-hidden">
              {event.photos && event.photos.length > 0 && (
                <div className="relative h-48 bg-gray-700">
                  <img
                    src={event.photos[0]}
                    alt={event.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedPhotoIndex({ eventId: event.id, index: 0 })}
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                <p className="text-gray-300 text-sm mb-2 line-clamp-2">{event.description}</p>
                <div className="text-gray-400 text-xs space-y-1 mb-4">
                  <div>📍 {event.location}</div>
                  <div>📅 {new Date(event.startDate).toLocaleDateString()}</div>
                  {event.ageRange && (
                    <div>👥 Age: {event.ageRange.min}-{event.ageRange.max}</div>
                  )}
                  {event.participants && (
                    <div>👤 {event.participants.length} participants</div>
                  )}
                  {eventReminders.has(event.id) && event.participants?.includes(currentUser.id) && (
                    <div className="mt-2 p-2 bg-pink-500/20 border border-pink-400/30 rounded-lg">
                      <div className="text-pink-300 font-semibold text-xs mb-1">⏰ Event Reminder</div>
                      <div className="text-pink-200 text-xs">
                        {(() => {
                          const seconds = eventReminders.get(event.id) || 0;
                          const days = Math.floor(seconds / 86400);
                          const hours = Math.floor((seconds % 86400) / 3600);
                          const minutes = Math.floor((seconds % 3600) / 60);
                          if (days > 0) return `${days}d ${hours}h ${minutes}m`;
                          if (hours > 0) return `${hours}h ${minutes}m`;
                          return `${minutes}m`;
                        })()} until event starts
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleJoinEvent(event.id)}
                  className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 rounded-lg"
                >
                  Join Event
                </button>
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-12">
              No events found
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="dating-card rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">Create Event</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description *</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white h-24"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Location *</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Min Age</label>
                  <input
                    type="number"
                    value={newEvent.minAge}
                    onChange={(e) => setNewEvent({...newEvent, minAge: Number(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Max Age</label>
                  <input
                    type="number"
                    value={newEvent.maxAge}
                    onChange={(e) => setNewEvent({...newEvent, maxAge: Number(e.target.value)})}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                />
                {newEvent.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {newEvent.photos.map((photo, idx) => (
                      <img key={idx} src={photo} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!newEvent.title || !newEvent.description || !newEvent.location || !newEvent.startDate}
                  className="flex-1 px-4 py-2 dating-button-primary disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhotoIndex && (() => {
        const event = events.find(e => e.id === selectedPhotoIndex.eventId);
        if (!event || !event.photos || event.photos.length === 0) return null;
        return (
          <PhotoModal
            photos={event.photos}
            currentIndex={selectedPhotoIndex.index}
            onClose={() => setSelectedPhotoIndex(null)}
            onNavigate={(index) => setSelectedPhotoIndex({ eventId: selectedPhotoIndex.eventId, index })}
          />
        );
      })()}
    </div>
  );
};

