import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { User } from './types';
import { store } from './services/store';
import { AuthScreen } from './components/AuthScreen';
import { DiscoverScreen } from './components/DiscoverScreen';
import { ChatScreen } from './components/ChatScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { ChatListScreen } from './components/ChatListScreen';
import { EventsScreen } from './components/EventsScreen';
import { ToastProvider } from './components/Toast';
import { ViewProfileScreen } from './components/ViewProfileScreen';

// Simple build/version tag – bump this string when deploying
const BUILD_VERSION = 'v4.0.3';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ children, requireAdmin = false }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          try {
            const user = await store.getCurrentUser();
            if (user) {
              setCurrentUser(user);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('[ProtectedRoute] Error getting current user:', error);
            // Continue to show login screen on error
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        setLoading(false);
      } catch (error) {
        console.error('[ProtectedRoute] Unexpected error in initAuth:', error);
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 25%, #0f3460 50%, #1a0a2e 100%)',
        backgroundAttachment: 'fixed'
      }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">💕</div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !currentUser.isAdmin) {
    return <Navigate to="/users" replace />;
  }

  return <>{children}</>;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // First, quickly check if there's an authenticated user via Firebase Auth
        // This doesn't require Firestore, so it's fast and won't fail with permission errors
        const { auth } = await import('./services/firebase');
        
        // Wait a short moment for Firebase Auth to restore session (if any)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If no authenticated user, show login immediately
        if (!auth.currentUser) {
          console.log('[AppRoutes] No authenticated user, showing login screen');
          setLoading(false);
          setCurrentUser(null);
          return;
        }
        
        // If there is an authenticated user, try to get full user data from Firestore
        // But don't wait too long - if it fails, we'll still show login
        const timeout = setTimeout(() => {
          console.log('[AppRoutes] Timeout getting user data, showing login screen');
          setLoading(false);
          setCurrentUser(null);
        }, 1500); // 1.5 second max wait for Firestore
        
        try {
          const user = await store.getCurrentUser();
          clearTimeout(timeout);
          if (user) {
            setCurrentUser(user);
            setLoading(false);
            
            // Redirect based on route and user role
            if (location.pathname === '/') {
              if (user.isAdmin) {
                navigate('/admin', { replace: true });
              } else {
                navigate('/users', { replace: true });
              }
            }
          } else {
            setLoading(false);
            setCurrentUser(null);
          }
        } catch (error: any) {
          console.error('[AppRoutes] Error getting current user:', error);
          clearTimeout(timeout);
          setLoading(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('[AppRoutes] Unexpected error in initAuth:', error);
        setLoading(false);
        setCurrentUser(null);
      }
    };
    
    initAuth();
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    await store.logout();
    setCurrentUser(null);
    navigate('/', { replace: true });
  };

  const handleStartChat = async (partner: User) => {
    if (!currentUser) return;
    const chat = await store.getChat(currentUser.id, partner.id);
    navigate(`/chat/${chat.id}?partnerId=${partner.id}`);
  };

  const handleSelectChat = (chatId: string, partnerId: string) => {
    navigate(`/chat/${chatId}?partnerId=${partnerId}`);
  };

  // Show login screen immediately if not loading and no user
  // Don't wait for Firestore operations to complete
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 25%, #0f3460 50%, #1a0a2e 100%)',
        backgroundAttachment: 'fixed'
      }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">💕</div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // If no user after loading, always show login screen
  // This ensures users can always access the login page even if there are Firestore errors
  return (
    <Routes>
      {/* Public Route - Auth Screen */}
      <Route 
        path="/" 
        element={
          currentUser ? (
            currentUser.isAdmin ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/users" replace />
            )
          ) : (
            <AuthScreen onLogin={(user) => {
              setCurrentUser(user);
              if (user.isAdmin) {
                navigate('/admin', { replace: true });
              } else {
                navigate('/users', { replace: true });
              }
            }} />
          )
        } 
      />

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <div className="min-h-screen bg-gray-900">
              <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
                <div className="font-bold text-xl text-white">PersonaDate <span className="text-red-500 text-xs">ADMIN</span></div>
                <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
              </header>
              <AdminDashboard />
            </div>
          </ProtectedRoute>
        }
      />

      {/* User Routes */}
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            {currentUser && (
              <UserLayout currentUser={currentUser} onLogout={handleLogout}>
                <DiscoverScreen 
                  currentUser={currentUser} 
                  onStartChat={handleStartChat} 
                />
              </UserLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/chatlist"
        element={
          <ProtectedRoute>
            {currentUser && (
              <UserLayout currentUser={currentUser} onLogout={handleLogout} activeTab="chatlist">
                <ChatListScreen
                  currentUser={currentUser}
                  onSelectChat={handleSelectChat}
                />
              </UserLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            {currentUser && (
              <UserLayout currentUser={currentUser} onLogout={handleLogout} activeTab="profile">
                <ProfileScreen 
                  user={currentUser} 
                  onSave={() => navigate('/users')} 
                  onCancel={() => navigate('/users')}
                />
              </UserLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/events"
        element={
          <ProtectedRoute>
            {currentUser && (
              <UserLayout currentUser={currentUser} onLogout={handleLogout} activeTab="events">
                <EventsScreen currentUser={currentUser} />
              </UserLayout>
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat/:chatId"
        element={
          <ProtectedRoute>
            {currentUser && (
              <ChatRoute 
                currentUser={currentUser} 
                onLogout={handleLogout}
                onBack={() => navigate('/chatlist')}
              />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/:userId"
        element={
          <ProtectedRoute>
            {currentUser && (
              <UserLayout currentUser={currentUser} onLogout={handleLogout}>
                <ViewProfileRoute 
                  currentUser={currentUser}
                  onStartChat={handleStartChat}
                  onBack={() => navigate('/users')}
                />
              </UserLayout>
            )}
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to appropriate route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// User Layout Component with Header and Footer
const UserLayout: React.FC<{
  currentUser: User;
  onLogout: () => void;
  activeTab?: 'discover' | 'chatlist' | 'profile' | 'events';
  children: React.ReactNode;
}> = ({ currentUser, onLogout, activeTab = 'discover', children }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        position: 'relative',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        background: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 25%, #0f3460 50%, #1a0a2e 100%)',
        backgroundAttachment: 'fixed'
      } as React.CSSProperties}
    >
      <header className="glass-effect border-b border-pink-500/20 p-4 flex justify-between items-center sticky top-0 z-10 flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-lg ring-2 ring-pink-400/50">
            {currentUser.mbti}
          </div>
          <h1 className="font-bold text-2xl bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">
            💕 NE Dating
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/profile')}>
            <div className="text-white text-sm font-bold">{currentUser.username}</div>
            <div className="text-pink-300 text-xs">{currentUser.mbti} • {currentUser.age}</div>
          </div>
          <img 
            src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`} 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 cursor-pointer object-cover ring-2 ring-pink-400/50 shadow-lg hover:ring-pink-400 transition-all" 
            onClick={() => navigate('/profile')}
          />
          <button onClick={onLogout} className="text-gray-300 hover:text-white text-xs transition-colors">
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
        {children}
      </main>

      {/* Footer Tabs */}
      <footer className="glass-effect border-t border-pink-500/20 flex flex-shrink-0 shadow-lg" style={{ flexShrink: 0 }}>
        <button
          onClick={() => navigate('/users')}
          className={`flex-1 py-4 text-center transition-all relative ${
            activeTab === 'discover' 
              ? 'text-pink-400 font-bold' 
              : 'text-gray-400 hover:text-pink-300'
          }`}
        >
          {activeTab === 'discover' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-t-full"></div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">🔍</span>
            <span className="text-xs">Discover</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/chatlist')}
          className={`flex-1 py-4 text-center transition-all relative ${
            activeTab === 'chatlist' 
              ? 'text-pink-400 font-bold' 
              : 'text-gray-400 hover:text-pink-300'
          }`}
        >
          {activeTab === 'chatlist' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-t-full"></div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">💬</span>
            <span className="text-xs">Chat</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/events')}
          className={`flex-1 py-4 text-center transition-all relative ${
            activeTab === 'events' 
              ? 'text-pink-400 font-bold' 
              : 'text-gray-400 hover:text-pink-300'
          }`}
        >
          {activeTab === 'events' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-t-full"></div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">📅</span>
            <span className="text-xs">Events</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className={`flex-1 py-4 text-center transition-all relative ${
            activeTab === 'profile' 
              ? 'text-pink-400 font-bold' 
              : 'text-gray-400 hover:text-pink-300'
          }`}
        >
          {activeTab === 'profile' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-t-full"></div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">👤</span>
            <span className="text-xs">Profile</span>
          </div>
        </button>
      </footer>
    </div>
  );
};

// Chat Route Component
const ChatRoute: React.FC<{
  currentUser: User;
  onLogout: () => void;
  onBack: () => void;
}> = ({ currentUser, onLogout, onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  const searchParams = new URLSearchParams(location.search);
  const partnerId = searchParams.get('partnerId');

  if (!chatId || !partnerId) {
    navigate('/chatlist', { replace: true });
    return null;
  }

  return (
    <ChatScreen 
      currentUser={currentUser} 
      partnerId={partnerId} 
      chatId={chatId}
      onBack={onBack} 
    />
  );
};

// View Profile Route Component
const ViewProfileRoute: React.FC<{
  currentUser: User;
  onStartChat: (user: User) => void;
  onBack: () => void;
}> = ({ currentUser, onStartChat, onBack }) => {
  const { userId } = useParams<{ userId: string }>();

  if (!userId) {
    onBack();
    return null;
  }

  return (
    <ViewProfileScreen
      userId={userId}
      currentUser={currentUser}
      onBack={onBack}
      onStartChat={onStartChat}
    />
  );
};

// Main App Component
export default function App() {
  useEffect(() => {
    // Log build version once on app load
    // Helps verify that latest code is running (especially with caching/PWAs)
    console.log('[NE Dating] Build version:', BUILD_VERSION);
    // Optional: expose on window for quick manual checks
    (window as any).__NE_DATING_BUILD__ = BUILD_VERSION;
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <React.Suspense fallback={
          <div className="min-h-screen flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 25%, #0f3460 50%, #1a0a2e 100%)',
            backgroundAttachment: 'fixed'
          }}>
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">💕</div>
              <div className="text-white text-lg">Loading...</div>
            </div>
          </div>
        }>
          <AppRoutes />
        </React.Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}
