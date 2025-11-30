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
import { User, ChatMessage } from '../types';
import { store } from '../services/store';
import { translateMessage } from '../services/gemini';

// Predefined sticker URLs for quick sharing
const STICKERS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDdtY2J6eHl5aDlxZnA5eXl5aHl5aHl5aHl5aHl5aHl5aHl5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0HlMwMh2l0I0qJgI/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3d4eHl5aDlxZnA5eXl5aHl5aHl5aHl5aHl5aHl5aHl5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7TKr3nzbh5WgCFxe/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXl5eHl5aDlxZnA5eXl5aHl5aHl5aHl5aHl5aHl5aHl5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/26FLdmIp6wJr91JAI/giphy.gif"
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
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeMessages();
      unsubscribePresence();
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
    // Real-time subscription will update messages automatically
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
   * 
   * Translation Logic:
   * - If current user sent the message: translate from currentUser.mbti to partner.mbti
   * - If partner sent the message: translate from partner.mbti to currentUser.mbti
   * 
   * Note: This assumes Gemini API handles personality-based translation/contextualization,
   * not just linguistic translation. The UI suggests linguistic translation but the logic
   * implies personality-based message adaptation.
   * 
   * Uses optimistic UI updates for better UX (shows loading state immediately)
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
        position: 'relative',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)'
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="p-3 sm:p-4 bg-gray-800 border-b border-gray-700 flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <button 
          onClick={onBack} 
          className="text-gray-400 active:text-white touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center px-2"
          style={{ touchAction: 'manipulation' }}
        >
          ← Back
        </button>
        <div className="relative flex-shrink-0">
          <img src={partner.avatarUrl} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-700 object-cover" />
          {partner.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>}
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
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.id;
          const isRead = msg.readBy.length > 1; // Assuming 2 participants, if length > 1, partner read it.

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 text-sm sm:text-base ${isMe ? 'bg-pink-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'}`}>
                
                {/* Content Rendering */}
                {msg.type === 'text' && <div className="mb-1 break-words">{msg.text}</div>}
                {msg.type === 'image' && (
                  <img src={msg.imageUrl} alt="Shared" className="rounded-lg max-h-48 sm:max-h-60 mb-1 w-full object-contain" />
                )}
                {msg.type === 'sticker' && (
                  <img src={msg.stickerUrl} alt="Sticker" className="w-24 h-24 sm:w-32 sm:h-32 mb-1" />
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
                     <span className="text-[10px] opacity-60">
                       {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                     </span>
                     {isMe && (
                       <span className={`text-[10px] ${isRead ? 'text-blue-200' : 'opacity-60'}`}>
                         {isRead ? '✓✓' : '✓'}
                       </span>
                     )}
                   </div>
                   
                   {msg.type === 'text' && !msg.translatedText && !msg.isTranslating && (
                     <button 
                       onClick={() => handleTranslate(msg.id, msg.text || '', msg.senderId)}
                       onTouchStart={(e) => {
                         e.preventDefault();
                         handleTranslate(msg.id, msg.text || '', msg.senderId);
                       }}
                       className="p-2 active:bg-white/20 rounded-full transition-colors opacity-70 active:opacity-100 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                       style={{ touchAction: 'manipulation' }}
                     >
                       <TranslateIcon />
                     </button>
                   )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 sm:p-4 bg-gray-800 border-t border-gray-700 relative flex-shrink-0">
        {showStickers && (
          <div 
            className="absolute bottom-full left-2 sm:left-4 mb-2 bg-gray-800 border border-gray-600 rounded-xl p-2 sm:p-3 shadow-xl flex gap-2 max-w-[calc(100vw-1rem)] overflow-x-auto"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '0.5rem',
              marginBottom: '0.5rem',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              WebkitOverflowScrolling: 'touch',
              willChange: 'transform'
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
        {showPhrases && phrases.length > 0 && (
          <div 
            className="absolute bottom-full left-2 sm:left-4 mb-2 bg-gray-800 border border-gray-600 rounded-xl p-3 sm:p-4 shadow-xl max-w-[calc(100vw-2rem)] sm:max-w-md z-50"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '0.5rem',
              marginBottom: '0.5rem',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              willChange: 'transform'
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
        <div className="flex gap-1 sm:gap-2 items-center">
          <button 
            onClick={() => {
              setShowStickers(!showStickers);
              setShowPhrases(false);
            }}
            className="text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ touchAction: 'manipulation' }}
          >
            ☺
          </button>
          <button 
            onClick={() => {
              setShowPhrases(!showPhrases);
              setShowStickers(false);
            }}
            className={`text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${phrases.length === 0 ? 'opacity-30' : ''}`}
            title="Quick Phrases"
            disabled={phrases.length === 0}
            style={{ touchAction: 'manipulation' }}
          >
            💬
          </button>
          <button 
            onClick={() => fileRef.current?.click()} 
            className="text-gray-400 active:text-white p-2 sm:p-2.5 text-xl sm:text-2xl touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ touchAction: 'manipulation' }}
          >
            📷
          </button>
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          
          <input 
            className="flex-1 bg-gray-900 border border-gray-600 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-white focus:outline-none focus:border-pink-500 min-h-[44px]"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="bg-pink-600 active:bg-pink-500 text-white p-2 sm:p-2.5 rounded-full min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};