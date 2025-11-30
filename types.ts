
export type MBTIGroup = 'Analysts' | 'Diplomats' | 'Sentinels' | 'Explorers';
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Other';
export type MessageType = 'text' | 'image' | 'sticker';

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
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  messages: ChatMessage[];
}
