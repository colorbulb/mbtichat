
export type MBTIGroup = 'Analysts' | 'Diplomats' | 'Sentinels' | 'Explorers';
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Other';
export type MessageType = 'text' | 'image' | 'sticker' | 'event' | 'private_date' | 'icebreaker';

export interface MBTIProfile {
  code: string;
  name: string;
  group: MBTIGroup;
  description: string;
  adjectives: string[];
}

export interface User {
  id: string;
  username: string;
  email?: string; // Firebase Auth email
  password?: string;
  birthDate: string; // ISO Date string YYYY-MM-DD
  age: number; // Derived/Stored for easier filtering
  gender: Gender;
  mbti: string;
  isAdmin?: boolean;
  role?: string; // 'users' for regular users, 'admin' for admins
  visibleToUsers?: boolean; // If false, only admin can see this user. Default: true
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: number; // Timestamp
  apiCallLimit?: number; // Default: 10, editable by admin
  apiCallsUsed?: number; // Track API calls used (for translation feature)
  photos?: string[]; // Array of photo URLs (max 5)
  hobbies?: string[]; // Array of hobby tags
  redFlags?: string[]; // Array of red flag tags
  audioRecordings?: { questionId: string; questionText: string; audioUrl: string }[]; // Max 3 audio recordings
  // Privacy & Settings
  readReceiptsEnabled?: boolean; // Default: true
  showOnlineStatus?: boolean; // Default: true
  showLastSeen?: boolean; // Default: true
  appearOffline?: boolean; // Default: false
  blockedUsers?: string[]; // Array of blocked user IDs
  // Verification
  isVerified?: boolean; // Profile verification status
  verificationBadge?: 'photo' | 'phone' | 'email'; // Type of verification
  // Profile views tracking
  profileViews?: { viewerId: string; timestamp: number }[]; // Who viewed this profile
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string; // Optional if image
  imageUrl?: string;
  stickerUrl?: string;
  type: MessageType;
  translatedText?: string;
  timestamp: number;
  isTranslating?: boolean;
  readBy: string[]; // Array of user IDs who have read the message
  eventId?: string; // For event sharing
  privateDate?: PrivateDate; // For private dating
  reactions?: { [emoji: string]: string[] }; // Emoji -> Array of user IDs who reacted
  // Icebreaker metadata (for type === 'icebreaker')
  icebreakerTitle?: string;
  icebreakerPrompt?: string;
  icebreakerCategory?: string;
}

export interface PrivateDate {
  category: string;
  time: string; // ISO date string
  place: string;
  createdAt: number;
}

export interface DatingCategory {
  id: string;
  name: string;
  createdAt: number;
}

export interface UserActionLog {
  id: string;
  userId: string;
  action: 'super_translate' | 'ai_suggestion' | 'smart_reply' | 'icebreaker_used';
  chatId?: string;
  messageId?: string;
  partnerId?: string;
  timestamp: number;
  metadata?: any;
}

// Admin-defined icebreaker templates
export interface IcebreakerTemplate {
  id: string;
  title: string;
  prompt: string;
  category: 'get_to_know' | 'flirty' | 'deep_talk' | 'fun';
  isActive: boolean;
  createdAt: number;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  messages: ChatMessage[];
  typingUsers?: { [userId: string]: number }; // userId -> timestamp of last typing activity
}

// Stored conversation stats (no heavy on-the-fly computation)
export interface ChatStats {
  chatId: string;
  messagesCount: number;
  consecutiveDays: number;
  lastMessageDate: number; // timestamp (ms)
  milestones: string[]; // e.g. ['messages_50', 'messages_100', 'streak_3']
}

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  location: string;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate?: string; // Optional end date for date ranges
  ageRange?: { min: number; max: number };
  genderFilter?: Gender[];
  mbtiFilter?: string[];
  hobbiesFilter?: string[];
  photos?: string[];
  createdAt: number; // Timestamp
  participants?: string[]; // User IDs who joined
}

export interface AudioQuestion {
  id: string;
  questionText: string;
  createdAt: number;
}
