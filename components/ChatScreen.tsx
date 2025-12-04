/**
 * ChatScreen Component
 * 
 * Real-time chat interface with MBTI-based message translation feature.
 * 
 * Key Features:
 * - Real-time message synchronization via Firestore onSnapshot
 * - Real-time partner presence updates (online/offline status)
 * - Multiple message types: text, images, stickers
 * - MBTI-based translation using Gemini API (translates messages between different personality types)
 * - Read receipts with visual indicators (✓ for sent, ✓✓ for read)
 * 
 * Real-time Subscriptions:
 * - Messages: Automatically updates when new messages arrive
 * - Partner Presence: Updates when partner comes online/offline
 * 
 * Translation Logic:
 * - Translates messages from sender's MBTI to receiver's MBTI
 * - Assumes Gemini API handles personality-based translation/contextualization
 * - Uses optimistic UI updates for better UX
 * 
 * TODO:
 * - Consider advanced scroll management (only auto-scroll if user is near bottom)
 * - Ensure translation service is fast to avoid lingering loading states
 */
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, Event, PrivateDate, IcebreakerTemplate, ChatStats, ChatGameTemplate, GameType, ChatGameData } from '../types';
import { store } from '../services/store';
import { translateMessage, superTranslateMessage, getAISuggestions } from '../services/gemini';
import { PhotoModal } from './PhotoModal';
import { useToast } from './Toast';
import { MessageSkeleton } from './LoadingSkeleton';
import { ContextMenu } from './ContextMenu';

// Predefined sticker URLs for quick sharing
const STICKERS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDdtY2J6eHl5aDlxZnA5eXl5aHl5aHl5aHl5aHl5aHl5aHl5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0HlMwMh2l0I0qJgI/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3d4eHl5aDlxZnA5eXl5aHl5aHl5aHl5aHl5aHl5aHl5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7TKr3nzbh5WgCFxe/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXl5eHl5aDlxZnA5eXl5aHl5aHl5aHl5aHl5aHl5aHl5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/26FLdmIp6wJr91JAI/giphy.gif",
  "https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif",
  "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif",
  "https://media.giphy.com/media/3o7abldb0LmZ3p3yU8/giphy.gif",
  "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
  "https://media.giphy.com/media/3o7aD2saQqFL5aZMA0/giphy.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/3o7abKhOpu0N9s8rD2/giphy.gif",
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  "https://media.giphy.com/media/3o7aD2saQqFL5aZMA0/giphy.gif",
  "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
  "https://media.giphy.com/media/3o7abKhOpu0N9s8rD2/giphy.gif",
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif"
];

const TranslateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
    <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 002.322-.446z" />
  </svg>
);

export const ChatScreen: React.FC<{ 
  currentUser: User; 
  partnerId: string; 
  chatId: string;
  onBack: () => void; 
}> = ({ currentUser, partnerId, chatId, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<User | undefined>(undefined);
  const [input, setInput] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [showPhrases, setShowPhrases] = useState(false);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; index: number } | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showPrivateDateModal, setShowPrivateDateModal] = useState(false);
  const [showShareEventModal, setShowShareEventModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [datingCategories, setDatingCategories] = useState<string[]>([]);
  const [newPrivateDate, setNewPrivateDate] = useState<{ category: string; time: string; place: string }>({
    category: '',
    time: '',
    place: ''
  });
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);
  const [showStarters, setShowStarters] = useState(false);
  const [icebreakers, setIcebreakers] = useState<IcebreakerTemplate[]>([]);
  const [showIcebreakerModal, setShowIcebreakerModal] = useState(false);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [chatGames, setChatGames] = useState<ChatGameTemplate[]>([]);
  const [showGamesModal, setShowGamesModal] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  /**
   * Sets up real-time subscriptions for messages and partner presence
   * Automatically marks messages as read when partner sends new messages
   * Cleans up subscriptions on unmount or when chatId/partnerId changes
   */
  useEffect(() => {
    // Initial fetch to ensure chat exists and load partner data
    const fetchChatData = async () => {
      // Ensure chat exists in Firestore
      await store.getChat(currentUser.id, partnerId);
      
      const p = await store.getUserById(partnerId);
      setPartner(p);
      setLoading(false);
    };

    fetchChatData();

    // Load personality phrases for current user's MBTI
    const loadPhrases = async () => {
      try {
        const userPhrases = await store.getPersonalityPhrases(currentUser.mbti);
        setPhrases(userPhrases);
      } catch (error) {
        console.error('Error loading phrases:', error);
      }
    };
    loadPhrases();

    // Load events and dating categories
    const loadData = async () => {
      try {
        const allEvents = await store.getAllEvents();
        setEvents(allEvents);
        const categories = await store.getAllDatingCategories();
        setDatingCategories(categories.map(c => c.name));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    // Real-time subscription to messages - updates automatically when new messages arrive
    const unsubscribeMessages = store.subscribeToChatMessages(chatId, (newMessages) => {
      setMessages(newMessages);
      
      // Auto-mark messages as read if they're from the partner
      const unreadFromPartner = newMessages.filter(
        msg => msg.senderId !== currentUser.id && !msg.readBy.includes(currentUser.id)
      );
      if (unreadFromPartner.length > 0) {
        store.markChatRead(chatId, currentUser.id);
      }
    });

    // Real-time subscription to partner's presence (online/offline status)
    const unsubscribePresence = store.subscribeToUserPresence(partnerId, (updatedPartner) => {
      if (updatedPartner) {
        setPartner(updatedPartner);
      }
    });

    // Real-time subscription to typing status
    const unsubscribeTyping = store.subscribeToTypingStatus(chatId, (typingUsers) => {
      const partnerIsTyping = partnerId in typingUsers;
      setPartnerTyping(partnerIsTyping);
    });

    // Load conversation starters
    const loadStarters = async () => {
      try {
        const starters = await store.getConversationStarters(currentUser.id, partnerId);
        setConversationStarters(starters);
      } catch (error) {
        console.error('Error loading conversation starters:', error);
      }
    };
    loadStarters();

    // Load icebreaker templates
    const loadIcebreakers = async () => {
      try {
        const templates = await store.getAllIcebreakers();
        setIcebreakers(templates);
      } catch (error) {
        console.error('Error loading icebreakers:', error);
      }
    };
    loadIcebreakers();

    // Load chat games
    const loadChatGames = async () => {
      try {
        const games = await store.getActiveChatGames();
        setChatGames(games);
      } catch (error) {
        console.error('Error loading chat games:', error);
      }
    };
    loadChatGames();

    // Subscribe to chat stats (for milestones)
    const unsubscribeStats = store.subscribeToChatStats(chatId, (stats) => {
      setChatStats(stats);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeMessages();
      unsubscribePresence();
      unsubscribeTyping();
      unsubscribeStats();
    };
  }, [chatId, currentUser.id, partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const txt = input;
    setInput(''); // Optimistic update
    
    await store.sendMessage(chatId, currentUser.id, txt, 'text');
    showToast('Message sent', 'success');
    // Real-time subscription will update messages automatically
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Update typing status in Firestore
    if (e.target.value.trim().length > 0) {
      store.updateTypingStatus(chatId, currentUser.id, true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        store.updateTypingStatus(chatId, currentUser.id, false);
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      // Stop typing if input is empty
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      store.updateTypingStatus(chatId, currentUser.id, false);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    await store.toggleMessageReaction(chatId, messageId, currentUser.id, emoji);
    setShowReactionPicker(null);
  };

  const handleSendStarter = (starter: string) => {
    setInput(starter);
    setShowStarters(false);
    // Auto-focus input
    setTimeout(() => {
      const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
      inputEl?.focus();
    }, 100);
  };

  const handleSendIcebreaker = async (template: IcebreakerTemplate) => {
    try {
      await store.sendIcebreakerMessage(chatId, currentUser.id, template);
      setShowIcebreakerModal(false);
      showToast('Icebreaker sent!', 'success');
    } catch (error: any) {
      console.error('Error sending icebreaker:', error);
      showToast('Failed to send icebreaker', 'error');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB for chat images)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Send message with Base64 data URL - will be uploaded to Storage in sendMessage
          await store.sendMessage(chatId, currentUser.id, 'Sent an image', 'image', reader.result as string);
          // Real-time subscription will update messages automatically
        } catch (error: any) {
          console.error('Error sending image:', error);
          alert('Failed to send image. Please try again.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendSticker = async (url: string) => {
    await store.sendMessage(chatId, currentUser.id, 'Sent a sticker', 'sticker', url);
    // Real-time subscription will update messages automatically
    setShowStickers(false);
  };

  /**
   * Translates a message from sender's MBTI context to receiver's MBTI context
   */
  const handleTranslate = async (msgId: string, text: string, senderId: string) => {
    // Determine source and target MBTI types for translation
    let sourceMBTI = senderId === currentUser.id ? currentUser.mbti : (partner?.mbti || 'ISFJ');
    let targetMBTI = senderId === currentUser.id ? (partner?.mbti || 'ISFJ') : currentUser.mbti;

    // Optimistically update UI to show translation in progress
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranslating: true } : m));
    
    const translation = await translateMessage(text, sourceMBTI, targetMBTI);
    await store.updateMessageTranslation(chatId, msgId, translation);
    // Real-time subscription will update messages automatically with the translation
  };

  /**
   * Super translate - translates with context from previous 20 messages
   */
  const handleSuperTranslate = async (msgId: string, msgIndex: number) => {
    if (!partner) return;
    
    const msg = messages[msgIndex];
    if (!msg || !msg.text) return;

    // Determine source and target MBTI types
    let sourceMBTI = msg.senderId === currentUser.id ? currentUser.mbti : partner.mbti;
    let targetMBTI = msg.senderId === currentUser.id ? partner.mbti : currentUser.mbti;

    // Optimistically update UI
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranslating: true } : m));
    
    try {
      console.log('🔍 [ChatScreen] Starting super translate for message:', msgId, 'index:', msgIndex);
      console.log('🔍 [ChatScreen] Message text:', msg.text);
      console.log('🔍 [ChatScreen] Source MBTI:', sourceMBTI, 'Target MBTI:', targetMBTI);
      
      const translation = await superTranslateMessage(messages, msgIndex, sourceMBTI, targetMBTI);
      
      console.log('🔍 [ChatScreen] Super translate result:', translation);
      console.log('🔍 [ChatScreen] Translation type:', typeof translation);
      console.log('🔍 [ChatScreen] Translation length:', translation?.length);
      
      await store.updateMessageTranslation(chatId, msgId, translation);
      
      // Log the action
      await store.logUserAction('super_translate', currentUser.id, {
        chatId,
        messageId: msgId,
        partnerId: partner.id
      });
    } catch (error) {
      console.error('❌ [ChatScreen] Super translate error:', error);
      // Reset translating state on error
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranslating: false } : m));
    }
  };

  /**
   * Get AI suggestions based on user profiles
   */
  const handleGetAISuggestions = async () => {
    if (!partner) return;
    
    setLoadingSuggestions(true);
    setShowAISuggestions(true);
    
    try {
      const suggestions = await getAISuggestions(currentUser, partner);
      setAiSuggestions(suggestions);
      
      // Log the action
      await store.logUserAction('ai_suggestion', currentUser.id, {
        chatId,
        partnerId: partner.id
      });
    } catch (error) {
      console.error('AI suggestions error:', error);
      setAiSuggestions('Failed to generate suggestions.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  /**
   * Share an event to chat
   */
  const handleShareEvent = async (eventId: string) => {
    try {
      await store.sendMessage(chatId, currentUser.id, 'Shared an event', 'event', eventId);
      setShowShareEventModal(false);
    } catch (error) {
      console.error('Error sharing event:', error);
      alert('Failed to share event');
    }
  };

  /**
   * Create and send a private date
   */
  const handleCreatePrivateDate = async () => {
    if (!newPrivateDate.category || !newPrivateDate.time || !newPrivateDate.place) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const privateDate: PrivateDate = {
        category: newPrivateDate.category,
        time: newPrivateDate.time,
        place: newPrivateDate.place,
        createdAt: Date.now()
      };

      // Send as a special message type
      await store.sendPrivateDateMessage(chatId, currentUser.id, privateDate);
      setShowPrivateDateModal(false);
      setNewPrivateDate({ category: '', time: '', place: '' });
    } catch (error) {
      console.error('Error creating private date:', error);
      alert('Failed to create private date');
    }
  };

  if (loading) return <div className="p-4 text-white">Loading chat...</div>;
  if (!partner) return <div>User not found</div>;

  const getLastSeenText = () => {
    if (partner.isOnline) return 'Online';
    if (!partner.lastSeen) return 'Offline';
    const minutes = Math.floor((Date.now() - partner.lastSeen) / 60000);
    if (minutes < 1) return 'Last seen just now';
    if (minutes < 60) return `Last seen ${minutes}m ago`;
    return 'Offline';
  };

  return (
    <div 
      className="flex flex-col bg-gray-900 overflow-hidden" 
      style={{ 
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        width: '100%',
        maxWidth: '100vw',
        position: 'relative',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        overflowX: 'hidden'
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="p-3 sm:p-4 glass-effect border-b border-pink-500/20 flex items-center gap-2 sm:gap-4 flex-shrink-0 shadow-lg">
        <button 
          onClick={onBack} 
          className="text-gray-400 active:text-white touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center px-2"
          style={{ touchAction: 'manipulation' }}
        >
          ← Back
        </button>
        <div className="relative flex-shrink-0">
          <img src={partner.avatarUrl} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 object-cover ring-2 ring-pink-400/50 shadow-lg" />
          {partner.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 shadow-lg shadow-green-400/50 animate-pulse"></div>}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
            <span className="truncate">{partner.username}</span>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300 flex-shrink-0">{partner.mbti}</span>
          </h3>
          <p className="text-xs text-gray-400">{getLastSeenText()}</p>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3 sm:space-y-4 pb-20"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        {/* Conversation milestones banner */}
        {chatStats && chatStats.milestones && chatStats.milestones.length > 0 && (
          <div className="mb-3">
            {chatStats.milestones.slice(-3).map((m) => {
              let label: string | null = null;
              if (m.startsWith('messages_')) {
                const n = m.split('_')[1];
                label = `🎉 You’ve exchanged ${n}+ messages together!`;
              } else if (m.startsWith('streak_')) {
                const n = m.split('_')[1];
                label = `🔥 ${n}-day chat streak!`;
              }
              if (!label) return null;
              return (
                <div
                  key={m}
                  className="mb-2 glass-effect border border-pink-500/30 rounded-xl px-3 py-2 text-xs text-pink-100 flex items-center gap-2"
                >
                  <span>✨</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        )}
        {loading ? (
          <>
            <MessageSkeleton isMe={false} />
            <MessageSkeleton isMe={true} />
            <MessageSkeleton isMe={false} />
          </>
        ) : (
          messages.map((msg, msgIndex) => {
            const isMe = msg.senderId === currentUser.id;
            const isRead = msg.readBy.length > 1;
            
            // Date separator logic
            const msgDate = new Date(msg.timestamp);
            const prevMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
            const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;
            const showDateSeparator = !prevDate || 
              msgDate.toDateString() !== prevDate.toDateString();
            
            // Format date separator
            const formatDateSeparator = (date: Date): string => {
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (date.toDateString() === today.toDateString()) {
                return 'Today';
              } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
              } else {
                return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
              }
            };
            
            // Show timestamp if message is older than 5 minutes or first message of the day
            const showTimestamp = msgIndex === 0 || 
              (prevMsg && (msg.timestamp - prevMsg.timestamp) > 5 * 60 * 1000);

            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <div className="glass-effect px-4 py-1 rounded-full text-xs text-gray-400">
                      {formatDateSeparator(msgDate)}
                    </div>
                  </div>
                )}
                <div 
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full relative`}
                  style={{ maxWidth: '100%' }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id });
                  }}
                  onTouchStart={(e) => {
                    // Don't trigger context menu if clicking on reactions
                    if ((e.target as HTMLElement).closest('button')) {
                      return;
                    }
                    const touch = e.touches[0];
                    const timer = setTimeout(() => {
                      setContextMenu({ x: touch.clientX, y: touch.clientY, messageId: msg.id });
                    }, 500);
                    e.currentTarget.addEventListener('touchend', () => clearTimeout(timer), { once: true });
                    e.currentTarget.addEventListener('touchmove', () => clearTimeout(timer), { once: true });
                  }}
                >
              <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 text-sm sm:text-base break-words relative ${
                isMe 
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-none shadow-lg shadow-pink-500/30' 
                  : 'glass-effect text-gray-200 rounded-bl-none border border-white/20'
              }`}
              style={{ pointerEvents: 'auto' }}
              >
                
                {/* Content Rendering */}
                {msg.type === 'text' && <div className="mb-1 break-words">{msg.text}</div>}
                {msg.type === 'image' && msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Shared" 
                    className="rounded-lg max-h-48 sm:max-h-60 mb-1 w-full object-contain cursor-pointer hover:opacity-90" 
                    onClick={() => setSelectedPhoto({ url: msg.imageUrl!, index: 0 })}
                  />
                )}
                {msg.type === 'sticker' && (
                  <img src={msg.stickerUrl} alt="Sticker" className="w-24 h-24 sm:w-32 sm:h-32 mb-1" />
                )}
                {msg.type === 'event' && msg.eventId && (() => {
                  const event = events.find(e => e.id === msg.eventId);
                  return event ? (
                    <div className="bg-gray-700/50 p-3 rounded-lg mb-1">
                      <div className="font-bold text-sm mb-1">📅 {event.title}</div>
                      <div className="text-xs opacity-90">{event.description}</div>
                      <div className="text-xs opacity-75 mt-1">📍 {event.location}</div>
                      <div className="text-xs opacity-75">📆 {new Date(event.startDate).toLocaleDateString()}</div>
                    </div>
                  ) : (
                    <div className="text-xs opacity-75">Shared an event</div>
                  );
                })()}
                {msg.type === 'private_date' && msg.privateDate && (
                  <div className="bg-purple-900/50 p-3 rounded-lg mb-1">
                    <div className="font-bold text-sm mb-1">💕 Private Date</div>
                    <div className="text-xs opacity-90">Category: {msg.privateDate.category}</div>
                    <div className="text-xs opacity-90">📍 {msg.privateDate.place}</div>
                    <div className="text-xs opacity-75">📆 {new Date(msg.privateDate.time).toLocaleString()}</div>
                  </div>
                )}

                {/* Icebreaker Card */}
                {msg.type === 'icebreaker' && (
                  <div className="bg-pink-900/40 border border-pink-400/40 rounded-xl p-3 mb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">❄️</span>
                      <span className="text-xs font-bold uppercase tracking-wide text-pink-200">
                        Icebreaker
                      </span>
                    </div>
                    {msg.icebreakerTitle && (
                      <div className="font-semibold text-sm text-white mb-1">
                        {msg.icebreakerTitle}
                      </div>
                    )}
                    <div className="text-xs text-pink-100 opacity-90">
                      {msg.icebreakerPrompt || msg.text}
                    </div>
                  </div>
                )}

                {/* Translation State */}
                {msg.isTranslating && (
                   <div className="mt-2 pt-2 border-t border-white/20 text-xs italic opacity-80 animate-pulse">
                     ✨ Translating...
                   </div>
                )}
                
                {/* Translated Text */}
                {msg.translatedText && (
                   <div className="mt-2 pt-2 border-t border-white/20 text-sm italic opacity-90 bg-black/10 p-2 rounded">
                     <span className="text-xs font-bold uppercase block opacity-70 mb-1">
                        {isMe ? `→ ${partner.mbti}` : `→ ${currentUser.mbti}`}
                     </span>
                     {msg.translatedText}
                   </div>
                )}
                
                {/* Metadata & Actions */}
                <div className="flex justify-between items-center mt-2 gap-4">
                   <div className="flex items-center gap-2">
                     {showTimestamp && (
                       <span className="text-[10px] opacity-60">
                         {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                       </span>
                     )}
                     {isMe && (
                       <span className={`text-[10px] ${isRead ? 'text-blue-200' : 'opacity-60'}`} title={isRead ? 'Read' : 'Sent'}>
                         {isRead ? '✓✓' : '✓'}
                       </span>
                     )}
                   </div>
                   
                   {msg.type === 'text' && !msg.translatedText && !msg.isTranslating && (
                     <div className="flex gap-1">
                       <button 
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id);
                         }}
                         onTouchEnd={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id);
                         }}
                         className="p-2 active:bg-white/20 rounded-full transition-colors opacity-70 active:opacity-100 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                         style={{ 
                           touchAction: 'manipulation',
                           WebkitTapHighlightColor: 'transparent',
                           pointerEvents: 'auto',
                           zIndex: 10
                         }}
                         title="Add Reaction"
                       >
                         😊
                       </button>
                       <button 
                         onClick={() => handleTranslate(msg.id, msg.text || '', msg.senderId)}
                         onTouchStart={(e) => {
                           e.preventDefault();
                           handleTranslate(msg.id, msg.text || '', msg.senderId);
                         }}
                         className="p-2 active:bg-white/20 rounded-full transition-colors opacity-70 active:opacity-100 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                         style={{ touchAction: 'manipulation' }}
                         title="Translate"
                       >
                         <TranslateIcon />
                       </button>
                       <button 
                         onClick={() => handleSuperTranslate(msg.id, msgIndex)}
                         className="p-2 active:bg-white/20 rounded-full transition-colors opacity-70 active:opacity-100 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold"
                         style={{ touchAction: 'manipulation' }}
                         title="Super Translate (with context)"
                       >
                         ⭐
                       </button>
                     </div>
                   )}
                </div>
                
                {/* Message Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 relative z-10">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                      const hasReacted = (userIds as string[]).includes(currentUser.id);
                      return (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleReaction(msg.id, emoji);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleReaction(msg.id, emoji);
                          }}
                          className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-all touch-manipulation ${
                            hasReacted
                              ? 'bg-pink-500/30 border border-pink-400/50'
                              : 'bg-white/10 border border-white/20 hover:bg-white/20'
                          }`}
                          style={{ 
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent',
                            pointerEvents: 'auto',
                            zIndex: 20
                          }}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px]">{(userIds as string[]).length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {/* Reaction Picker */}
                {showReactionPicker === msg.id && (
                  <div 
                    className="absolute bottom-full left-0 mb-2 dating-card p-2 rounded-xl flex gap-2 max-w-full overflow-x-auto"
                    style={{
                      zIndex: 1000,
                      pointerEvents: 'auto',
                      position: 'absolute'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    {['❤️', '😂', '😮', '👍', '😍', '🔥'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleReaction(msg.id, emoji);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleReaction(msg.id, emoji);
                        }}
                        className="text-2xl hover:scale-125 transition-transform p-1 flex-shrink-0 touch-manipulation"
                        style={{ 
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          pointerEvents: 'auto',
                          minWidth: '44px',
                          minHeight: '44px'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </React.Fragment>
            );
          })
        )}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="glass-effect rounded-2xl rounded-bl-none border border-white/20 p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            options={[
              {
                label: 'Copy',
                icon: '📋',
                action: () => {
                  const msg = messages.find(m => m.id === contextMenu.messageId);
                  if (msg?.text) {
                    navigator.clipboard.writeText(msg.text);
                    showToast('Message copied', 'success');
                  }
                }
              },
              {
                label: 'Translate',
                icon: '🌐',
                action: () => {
                  const msg = messages.find(m => m.id === contextMenu.messageId);
                  if (msg?.text && msg?.senderId) {
                    handleTranslate(contextMenu.messageId, msg.text, msg.senderId);
                  }
                }
              },
              {
                label: 'Delete',
                icon: '🗑️',
                action: () => {
                  showToast('Delete feature coming soon', 'info');
                },
                danger: true
              }
            ]}
            onClose={() => setContextMenu(null)}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div
        className="p-2 sm:p-4 glass-effect border-t border-pink-500/20 relative flex-shrink-0 shadow-lg w-full max-w-full overflow-x-hidden z-10"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)' // prevent iOS Safari bottom bar from covering icons/input
        }}
      >
        {showStickers && (
          <div 
            className="left-2 right-2 bottom-32 sm:bottom-36 bg-gray-900/95 border border-gray-600 rounded-xl p-2 sm:p-3 shadow-2xl flex gap-2 overflow-x-auto z-50"
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              WebkitOverflowScrolling: 'touch',
              willChange: 'transform',
              pointerEvents: 'auto'
            }}
          >
            {STICKERS.map((s, i) => (
              <img 
                key={i} 
                src={s} 
                onClick={() => {
                  handleSendSticker(s);
                  setShowStickers(false);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSendSticker(s);
                  setShowStickers(false);
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 cursor-pointer active:scale-95 transition-transform touch-manipulation flex-shrink-0"
                style={{ 
                  minWidth: '56px', 
                  minHeight: '56px',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
              />
            ))}
          </div>
        )}
        {showStarters && conversationStarters.length > 0 && (
          <div 
            className="left-2 right-2 bottom-32 sm:bottom-36 dating-card rounded-xl p-3 sm:p-4 shadow-2xl z-50"
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              willChange: 'transform',
              pointerEvents: 'auto'
            }}
          >
            <div className="text-xs sm:text-sm text-pink-300 mb-3 font-semibold">💬 Conversation Starters:</div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {conversationStarters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSendStarter(starter)}
                  className="text-left text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-3 transition-all text-white break-words"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Icebreaker modal */}
        {showIcebreakerModal && icebreakers.length > 0 && (
          <div
            className="left-2 right-2 bottom-32 sm:bottom-36 dating-card rounded-xl p-3 sm:p-4 shadow-2xl z-50"
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              willChange: 'transform',
              pointerEvents: 'auto'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm text-pink-300 font-semibold flex items-center gap-2">
                <span>❄️ Icebreakers & Quick Games</span>
              </div>
              <button
                onClick={() => setShowIcebreakerModal(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {icebreakers.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSendIcebreaker(template)}
                  className="text-left text-xs sm:text-sm bg-white/5 hover:bg-white/15 border border-white/15 rounded-lg p-3 transition-all text-white"
                >
                  <div className="font-semibold mb-1">
                    {template.title}
                  </div>
                  <div className="text-[11px] text-gray-300 line-clamp-3">
                    {template.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Games modal */}
        {showGamesModal && chatGames.length > 0 && (
          <div
            className="left-2 right-2 bottom-32 sm:bottom-36 dating-card rounded-xl p-3 sm:p-4 shadow-2xl z-50"
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              willChange: 'transform',
              pointerEvents: 'auto'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm text-pink-300 font-semibold flex items-center gap-2">
                <span>🎮 Fun Games to Play Together</span>
              </div>
              <button
                onClick={() => setShowGamesModal(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {chatGames.map(game => (
                <button
                  key={game.id}
                  onClick={async () => {
                    // Pick a random question from the game
                    const randomIndex = Math.floor(Math.random() * game.questions.length);
                    const randomQ = game.questions[randomIndex];
                    // Create a unique question ID using game ID and question index
                    const uniqueQuestionId = `${game.id}_q${randomIndex}_${Date.now()}`;
                    await store.sendGameMessage(chatId, currentUser.id, game.type, {
                      questionId: uniqueQuestionId,
                      question: randomQ.question,
                      options: randomQ.options
                    });
                    setShowGamesModal(false);
                    showToast(`Started ${game.title}!`, 'success');
                  }}
                  className="text-left text-xs sm:text-sm bg-white/5 hover:bg-white/15 border border-white/15 rounded-lg p-3 transition-all text-white"
                >
                  <div className="font-semibold mb-1 flex items-center gap-2">
                    <span>
                      {game.type === 'truth_or_dare' && '🎲'}
                      {game.type === 'would_you_rather' && '🤔'}
                      {game.type === 'compatibility_quiz' && '💕'}
                      {game.type === 'this_or_that' && '⚡'}
                    </span>
                    {game.title}
                  </div>
                  <div className="text-[11px] text-gray-300">
                    {game.questions.length} questions • {game.type.replace(/_/g, ' ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showPhrases && phrases.length > 0 && (
          <div 
            className="fixed left-2 right-2 bottom-32 sm:bottom-36 bg-gray-800 border border-gray-600 rounded-xl p-3 sm:p-4 shadow-2xl z-50"
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              willChange: 'transform',
              pointerEvents: 'auto'
            }}
          >
            <div className="text-xs sm:text-sm text-gray-400 mb-3 font-semibold">Quick Phrases ({currentUser.mbti}):</div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {phrases.map((phrase, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInput(phrase);
                    setShowPhrases(false);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInput(phrase);
                    setShowPhrases(false);
                  }}
                  className="text-sm sm:text-base bg-gray-700 active:bg-gray-600 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full text-white transition-colors touch-manipulation min-h-[44px] flex items-center justify-center"
                  style={{ 
                    minWidth: '44px',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Input bar: icons row on top, text box row below for better mobile UX */}
        <div className="flex flex-col gap-2 w-full min-w-0">
          <div className="flex gap-1 sm:gap-2 flex-wrap items-center flex-shrink-0">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Emoji button clicked');
                setShowStickers(prev => !prev);
                setShowPhrases(false);
                setShowStarters(false);
                setShowIcebreakerModal(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Emoji button touch');
                setShowStickers(prev => !prev);
                setShowPhrases(false);
                setShowStarters(false);
                setShowIcebreakerModal(false);
              }}
              className="text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              style={{ touchAction: 'manipulation' }}
            >
              ☺
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Starters button clicked');
                setShowStarters(prev => !prev);
                setShowPhrases(false);
                setShowStickers(false);
                setShowIcebreakerModal(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Starters button touch');
                setShowStarters(prev => !prev);
                setShowPhrases(false);
                setShowStickers(false);
                setShowIcebreakerModal(false);
              }}
              className={`text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 ${conversationStarters.length === 0 ? 'opacity-30' : ''}`}
              title="Conversation Starters"
              disabled={conversationStarters.length === 0}
              style={{ touchAction: 'manipulation' }}
            >
              ✨
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Quick phrases button clicked');
                setShowPhrases(prev => !prev);
                setShowStickers(false);
                setShowStarters(false);
                setShowIcebreakerModal(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Quick phrases button touch');
                setShowPhrases(prev => !prev);
                setShowStickers(false);
                setShowStarters(false);
                setShowIcebreakerModal(false);
              }}
              className={`text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 ${phrases.length === 0 ? 'opacity-30' : ''}`}
              title="Quick Phrases"
              disabled={phrases.length === 0}
              style={{ touchAction: 'manipulation' }}
            >
              💬
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Camera button clicked');
                fileRef.current?.click();
              }} 
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟣 Camera button touch');
                fileRef.current?.click();
              }}
              className="text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              style={{ touchAction: 'manipulation' }}
            >
              📷
            </button>
            <button 
              onClick={() => setShowShareEventModal(true)} 
              className="text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              style={{ touchAction: 'manipulation' }}
              title="Share Event"
            >
              📅
            </button>
            <button 
              onClick={() => setShowPrivateDateModal(true)} 
              className="text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              style={{ touchAction: 'manipulation' }}
              title="Create Private Date"
            >
              💕
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowGamesModal(prev => !prev);
                setShowStickers(false);
                setShowPhrases(false);
                setShowStarters(false);
                setShowIcebreakerModal(false);
              }}
              className={`text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 ${chatGames.length === 0 ? 'opacity-30' : ''}`}
              style={{ touchAction: 'manipulation' }}
              title="Fun Games"
              disabled={chatGames.length === 0}
            >
              🎮
            </button>
            {/* Small inline hints so we can visually confirm state even if overlays are clipped */}
            {showStickers && (
              <span className="hidden sm:inline text-[10px] text-pink-300 ml-1">Stickers ↑</span>
            )}
            {showStarters && (
              <span className="hidden sm:inline text-[10px] text-pink-300 ml-1">Starters ↑</span>
            )}
            {showPhrases && (
              <span className="hidden sm:inline text-[10px] text-pink-300 ml-1">Phrases ↑</span>
            )}
          </div>
          <div className="flex gap-2 items-center w-full min-w-0">
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            
            <input 
              className="flex-1 bg-gray-900 border border-gray-600 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-white focus:outline-none focus:border-pink-500 min-h-[44px] min-w-0"
              placeholder="Type a message..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              style={{ width: '100%', maxWidth: '100%' }}
            />
            <button 
              onClick={handleSend}
              className="bg-pink-600 active:bg-pink-500 text-white p-2 sm:p-2.5 rounded-full min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center touch-manipulation flex-shrink-0"
              style={{ touchAction: 'manipulation' }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photos={[selectedPhoto.url]}
          currentIndex={0}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {/* AI Suggestions Modal */}
      {showAISuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-pink-500">AI Suggestions</h3>
              <button
                onClick={() => setShowAISuggestions(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            {loadingSuggestions ? (
              <div className="text-center py-8 text-gray-400">Generating suggestions...</div>
            ) : (
              <div className="text-gray-200 whitespace-pre-wrap">{aiSuggestions}</div>
            )}
          </div>
        </div>
      )}

      {/* Share Event Modal */}
      {showShareEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-pink-500">Share Event</h3>
              <button
                onClick={() => setShowShareEventModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => handleShareEvent(event.id)}
                  className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  <div className="font-bold text-white">{event.title}</div>
                  <div className="text-sm text-gray-400">{event.location}</div>
                  <div className="text-xs text-gray-500">{new Date(event.startDate).toLocaleDateString()}</div>
                </button>
              ))}
              {events.length === 0 && (
                <div className="text-center py-8 text-gray-400">No events available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Private Date Modal */}
      {showPrivateDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-pink-500">Create Private Date</h3>
              <button
                onClick={() => setShowPrivateDateModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Category *</label>
                <select
                  value={newPrivateDate.category}
                  onChange={(e) => setNewPrivateDate({...newPrivateDate, category: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                >
                  <option value="">Select category</option>
                  {datingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Time *</label>
                <input
                  type="datetime-local"
                  value={newPrivateDate.time}
                  onChange={(e) => setNewPrivateDate({...newPrivateDate, time: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Place *</label>
                <input
                  type="text"
                  value={newPrivateDate.place}
                  onChange={(e) => setNewPrivateDate({...newPrivateDate, place: e.target.value})}
                  placeholder="Enter location"
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPrivateDateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePrivateDate}
                  className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};