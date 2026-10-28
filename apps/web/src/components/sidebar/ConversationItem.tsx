import React from 'react';
import { Users } from 'lucide-react';
import { Conversation, User } from '../../types/index';
import { Avatar } from '../ui/Avatar';
import { cn, formatDate } from '../../lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  currentUser: User | null;
  isActive: boolean;
  isOnline?: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  currentUser,
  isActive,
  isOnline,
  onClick,
}: ConversationItemProps) {
  const isDirect = conversation.type === 'DIRECT';
  const otherMember = isDirect
    ? conversation.members.find((m) => m.userId !== currentUser?.id)?.user
    : null;

  const displayName = isDirect
    ? otherMember?.displayName || otherMember?.username || 'Direct Chat'
    : conversation.name || 'Group Chat';

  const avatarUrl = isDirect ? otherMember?.avatarUrl : conversation.avatarUrl;

  const lastMessage = conversation.lastMessage;
  const lastMessageTime = lastMessage?.createdAt || conversation.updatedAt;

  // Unread indicator check
  const memberRecord = conversation.members.find(
    (m) => m.userId === currentUser?.id,
  );
  const isUnread =
    lastMessage &&
    memberRecord &&
    lastMessage.senderId !== currentUser?.id &&
    new Date(lastMessage.createdAt) > new Date(memberRecord.lastReadAt);

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 group relative',
        isActive
          ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
          : 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent',
      )}
    >
      <Avatar
        src={avatarUrl}
        name={displayName}
        size="md"
        isOnline={isDirect ? isOnline : undefined}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span
            className={cn(
              'font-medium text-sm truncate flex items-center gap-1',
              isActive ? 'text-indigo-200' : 'text-zinc-200 group-hover:text-white',
            )}
          >
            {!isDirect && <Users className="w-3.5 h-3.5 text-indigo-400" />}
            {displayName}
          </span>
          <span className="text-[11px] text-zinc-500 flex-shrink-0">
            {formatDate(lastMessageTime)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'text-xs truncate leading-tight',
              isUnread ? 'font-semibold text-zinc-100' : 'text-zinc-400',
            )}
          >
            {lastMessage
              ? `${lastMessage.senderId === currentUser?.id ? 'You: ' : ''}${lastMessage.content}`
              : 'No messages yet'}
          </p>

          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
