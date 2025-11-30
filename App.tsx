import React, { useState, useEffect } from 'react';
import { User } from './types';
import { store } from './services/store';
import { AuthScreen } from './components/AuthScreen';
import { DiscoverScreen } from './components/DiscoverScreen';
import { ChatScreen } from './components/ChatScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { ChatListScreen } from './components/ChatListScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'discover' | 'chatlist' | 'profile'>('discover');
  const [activeChat, setActiveChat] = useState<{chatId: string, partnerId: string} | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial Authentication Check - wait for Firebase Auth to restore session
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      // Give Firebase Auth time to restore the session from localStorage
      // Firebase Auth automatically persists sessions, but we need to wait for it
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts && mounted) {
        const user = await store.getCurrentUser();
        
        if (user) {
          console.log('🔍 [App] User found:', user.email);
          if (mounted) {
            setCurrentUser(user);
            setLoading(false);
          }
          return;
        }
        
        // Wait a bit before trying again
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // If we get here, no user was found
      if (mounted) {
        console.log('🔍 [App] No user found after waiting');
        setLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await store.logout();
    setCurrentUser(null);
    setActiveChat(null);
  };

  const handleStartChat = async (partner: User) => {
    if (!currentUser) return;
    const chat = await store.getChat(currentUser.id, partner.id);
    setActiveChat({ chatId: chat.id, partnerId: partner.id });
  };

  const handleSelectChat = (chatId: string, partnerId: string) => {
    setActiveChat({ chatId, partnerId });
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  if (!currentUser) {
    return <AuthScreen onLogin={setCurrentUser} />;
  }

  // Debug logging
  console.log('🔍 [App] Rendering with currentUser:', currentUser);
  console.log('🔍 [App] currentUser.isAdmin:', currentUser.isAdmin);
  console.log('🔍 [App] currentUser.role:', currentUser.role);
  console.log('🔍 [App] Should show admin dashboard?', currentUser.isAdmin);

  // Admin View
  if (currentUser.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
          <div className="font-bold text-xl text-white">PersonaDate <span className="text-red-500 text-xs">ADMIN</span></div>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </header>
        <AdminDashboard />
      </div>
    );
  }

  // Active Chat View
  if (activeChat) {
    return (
      <ChatScreen 
        currentUser={currentUser} 
        partnerId={activeChat.partnerId} 
        chatId={activeChat.chatId}
        onBack={() => setActiveChat(null)} 
      />
    );
  }

  // Profile Edit View
  if (view === 'profile') {
    return (
      <div 
        className="min-h-screen bg-gray-900 flex flex-col overflow-hidden" 
        style={{ 
          height: '100dvh',
          minHeight: '-webkit-fill-available',
          position: 'relative',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)'
        } as React.CSSProperties}
      >
        <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-xl bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Profile
            </h1>
            <button onClick={handleLogout} className="text-gray-400 hover:text-white text-xs">
              Logout
            </button>
          </div>
        </header>
      <main 
        className="flex-1 overflow-y-auto"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          minHeight: 0,
          flexBasis: 0
        }}
      >
          <ProfileScreen 
            user={currentUser} 
            onSave={() => setView('discover')} 
            onCancel={() => setView('discover')}
          />
        </main>
        {/* Footer Tabs */}
        <footer className="bg-gray-800 border-t border-gray-700 flex">
          <button
            onClick={() => setView('discover')}
            className={`flex-1 py-4 text-center transition-colors ${
              view === 'discover' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setView('chatlist')}
            className={`flex-1 py-4 text-center transition-colors ${
              view === 'chatlist' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Chat List
          </button>
          <button
            onClick={() => setView('profile')}
            className={`flex-1 py-4 text-center transition-colors ${
              view === 'profile' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Profile
          </button>
        </footer>
      </div>
    );
  }

  // Main Interface with Footer Tabs
  return (
    <div 
      className="min-h-screen bg-gray-900 flex flex-col overflow-hidden" 
      style={{ 
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        position: 'relative',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)'
      } as React.CSSProperties}
    >
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center font-bold text-white text-xs">
            {currentUser.mbti}
          </div>
          <h1 className="font-bold text-xl bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            NE Dating
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block cursor-pointer hover:opacity-80" onClick={() => setView('profile')}>
            <div className="text-white text-sm font-bold">{currentUser.username}</div>
            <div className="text-gray-500 text-xs">{currentUser.mbti} • {currentUser.age}</div>
          </div>
          <img 
            src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`} 
            className="w-8 h-8 rounded-full bg-gray-700 cursor-pointer object-cover" 
            onClick={() => setView('profile')}
          />
          <button onClick={handleLogout} className="text-gray-400 hover:text-white text-xs">
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {view === 'discover' ? (
          <DiscoverScreen 
            currentUser={currentUser} 
            onStartChat={handleStartChat} 
          />
        ) : view === 'chatlist' ? (
          <ChatListScreen
            currentUser={currentUser}
            onSelectChat={handleSelectChat}
          />
        ) : null}
      </main>

      {/* Footer Tabs */}
      <footer className="bg-gray-800 border-t border-gray-700 flex flex-shrink-0" style={{ flexShrink: 0 }}>
        <button
          onClick={() => setView('discover')}
          className={`flex-1 py-4 text-center transition-colors ${
            view === 'discover' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setView('chatlist')}
          className={`flex-1 py-4 text-center transition-colors ${
            view === 'chatlist' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          Chat List
        </button>
        <button
          onClick={() => setView('profile')}
          className={`flex-1 py-4 text-center transition-colors ${
            view === 'profile' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          Profile
        </button>
      </footer>
    </div>
  );
}