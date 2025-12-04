import React from 'react';

export const UserCardSkeleton: React.FC = () => {
  return (
    <div className="dating-card rounded-2xl overflow-hidden animate-pulse">
      <div className="relative h-64 bg-gradient-to-br from-gray-700/50 to-gray-800/50"></div>
      <div className="p-5 space-y-3 bg-gradient-to-b from-gray-900/95 to-gray-800/95">
        <div className="flex justify-between items-center">
          <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
          <div className="h-4 w-12 bg-gray-700/50 rounded"></div>
        </div>
        <div className="h-4 w-20 bg-gray-700/50 rounded"></div>
        <div className="h-12 bg-gray-700/50 rounded-lg"></div>
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
          <div className="h-6 w-20 bg-gray-700/50 rounded-full"></div>
        </div>
        <div className="h-10 bg-gray-700/50 rounded-xl mt-3"></div>
      </div>
    </div>
  );
};

export const ChatListSkeleton: React.FC = () => {
  return (
    <div className="dating-card rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-700/50 flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-700/50 rounded"></div>
          <div className="h-3 w-48 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export const MessageSkeleton: React.FC<{ isMe?: boolean }> = ({ isMe = false }) => {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-pulse`}>
      <div className={`max-w-[85%] rounded-2xl p-3 ${
        isMe 
          ? 'bg-gray-700/50 rounded-br-none' 
          : 'bg-gray-700/50 rounded-bl-none'
      }`}>
        <div className="h-4 w-32 bg-gray-600/50 rounded mb-2"></div>
        <div className="h-3 w-16 bg-gray-600/50 rounded"></div>
      </div>
    </div>
  );
};

export const ProfileFormSkeleton: React.FC = () => {
  return (
    <div className="dating-card p-6 rounded-2xl space-y-6 animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-full bg-gray-700/50"></div>
        <div className="h-8 w-32 bg-gray-700/50 rounded-full"></div>
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-700/50 rounded-lg"></div>
        <div className="h-10 bg-gray-700/50 rounded-lg"></div>
        <div className="h-24 bg-gray-700/50 rounded-lg"></div>
      </div>
    </div>
  );
};

