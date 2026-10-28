import React from 'react';
import { ArrowLeft, Users, MoreVertical } from 'lucide-react';
import { Conversation, User } from '../../types/index';
import { Avatar } from '../ui/Avatar';

interface ChatHeaderProps {
  conversation: Conversation;
  currentUser: User | null;
  onBack?: () => void;
  isOnline?: boolean;
}

export function ChatHeader({
  conversation,
  currentUser,
  onBack,
  isOnline,
}: ChatHeaderProps) {
  const isDirect = conversation.type === 'DIRECT';
  const otherMember = isDirect
    ? conversation.members.find((m) => m.userId !== currentUser?.id)?.user
    : null;

  const displayName = isDirect
    ? otherMember?.displayName || otherMember?.username || 'Direct Chat'
    : conversation.name || 'Group Chat';

  const avatarUrl = isDirect ? otherMember?.avatarUrl : conversation.avatarUrl;

  const statusText = isDirect
    ? isOnline
      ? 'Online'
      : otherMember?.lastSeenAt
        ? 'Offline'
        : 'Offline'
    : `${conversation.members.length} members`;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <Avatar
          src={avatarUrl}
          name={displayName}
          size="md"
          isOnline={isDirect ? isOnline : undefined}
        />

        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 leading-tight">
            {!isDirect && <Users className="w-3.5 h-3.5 text-indigo-400" />}
            {displayName}
          </h2>
          <p className="text-[11px] text-zinc-400 flex items-center gap-1">
            {isDirect && isOnline && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {statusText}
          </p>
        </div>
      </div>
    </div>
  );
}
