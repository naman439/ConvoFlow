import React, { useState } from 'react';
import { Search, MessageSquareDashed } from 'lucide-react';
import { Conversation, User } from '../../types/index';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  currentUser: User | null;
  onlineUsers: Set<string>;
  onSelectConversation: (conversation: Conversation) => void;
  onOpenNewChat: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  currentUser,
  onlineUsers,
  onSelectConversation,
  onOpenNewChat,
}: ConversationListProps) {
  const [filter, setFilter] = useState('');

  const filteredConversations = conversations.filter((c) => {
    if (!filter.trim()) return true;
    const isDirect = c.type === 'DIRECT';
    const otherMember = isDirect
      ? c.members.find((m) => m.userId !== currentUser?.id)?.user
      : null;
    const name = isDirect
      ? otherMember?.displayName || otherMember?.username || ''
      : c.name || '';
    return name.toLowerCase().includes(filter.toLowerCase().trim());
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
      {/* Search Filter */}
      <div className="p-3 border-b border-zinc-900">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 rounded-xl border border-zinc-800/80 focus-within:border-indigo-500/80 text-xs">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Filter conversations..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations scroll area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <MessageSquareDashed className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400 font-medium">No conversations yet</p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors border border-indigo-500/20"
            >
              Start a chat
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isDirect = conv.type === 'DIRECT';
            const otherMember = isDirect
              ? conv.members.find((m) => m.userId !== currentUser?.id)?.user
              : null;
            const isOnline = otherMember ? onlineUsers.has(otherMember.id) : false;

            return (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUser={currentUser}
                isActive={conv.id === activeConversationId}
                isOnline={isOnline}
                onClick={() => onSelectConversation(conv)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
