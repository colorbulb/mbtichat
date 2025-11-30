import React, { useState, useEffect } from 'react';
import { User, ChatRoom } from '../types';
import { store } from '../services/store';

export const ChatListScreen: React.FC<{
  currentUser: User;
  onSelectChat: (chatId: string, partnerId: string) => void;
}> = ({ currentUser, onSelectChat }) => {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Fetch all chats (regardless of participant visibility)
    const fetchChats = async () => {
      try {
        const allChats = await store.getAllChats();
        setChats(allChats);
        
        // Fetch user data for all participants
        const userIds = new Set<string>();
        allChats.forEach(chat => {
          chat.participants.forEach(id => {
            if (id !== currentUser.id) {
              userIds.add(id);
            }
          });
        });
        
        // Fetch all partner users
        const userPromises = Array.from(userIds).map(id => store.getUserById(id));
        const userResults = await Promise.all(userPromises);
        
        const userMap = new Map<string, User>();
        userResults.forEach(user => {
          if (user) {
            userMap.set(user.id, user);
          }
        });
        setUsers(userMap);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // Subscribe to real-time chat updates
    // Note: We could add real-time subscription here if needed
    const interval = setInterval(fetchChats, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [currentUser.id]);

  const getPartner = (chat: ChatRoom): User | undefined => {
    const partnerId = chat.participants.find(id => id !== currentUser.id);
    return partnerId ? users.get(partnerId) : undefined;
  };

  const formatLastMessage = (chat: ChatRoom): string => {
    if (!chat.lastMessage) return 'No messages yet';
    
    if (chat.lastMessage.type === 'image') {
      return '📷 Image';
    } else if (chat.lastMessage.type === 'sticker') {
      return '🎨 Sticker';
    } else {
      return chat.lastMessage.text || 'Message';
    }
  };

  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        Loading chats...
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="text-4xl mb-4">💬</div>
        <p>No chats yet. Start a conversation!</p>
      </div>
    );
  }

  // Sort chats by last message timestamp (most recent first)
  const sortedChats = [...chats].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime;
  });

  return (
    <div className="p-4 space-y-2 pb-20 md:pb-4">
      {sortedChats.map(chat => {
        const partner = getPartner(chat);
        const isUnread = chat.lastMessage && 
          !chat.lastMessage.readBy?.includes(currentUser.id) &&
          chat.lastMessage.senderId !== currentUser.id;

        return (
          <div
            key={chat.id}
            onClick={() => {
              const partnerId = chat.participants.find(id => id !== currentUser.id);
              if (partnerId) {
                onSelectChat(chat.id, partnerId);
              }
            }}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-pink-500 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={partner?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner?.username || 'user'}`}
                  alt={partner?.username || 'User'}
                  className="w-14 h-14 rounded-full bg-gray-700 object-cover"
                />
                {partner?.isOnline && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white truncate">
                    {partner?.username || 'Unknown User'}
                    {partner && (
                      <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                        {partner.mbti}
                      </span>
                    )}
                  </h3>
                  {chat.lastMessage && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTimestamp(chat.lastMessage.timestamp)}
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${isUnread ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  {formatLastMessage(chat)}
                </p>
              </div>

              {/* Unread Indicator */}
              {isUnread && (
                <div className="w-3 h-3 bg-pink-500 rounded-full flex-shrink-0"></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};


