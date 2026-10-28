import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Message } from '../../types/index';
import { Avatar } from '../ui/Avatar';
import { cn, formatTime } from '../../lib/utils';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  showSenderInfo?: boolean;
}

export function MessageBubble({
  message,
  isSelf,
  showSenderInfo = true,
}: MessageBubbleProps) {
  const isRead = message.status === 'READ';
  const isDelivered = message.status === 'DELIVERED';

  return (
    <div
      className={cn(
        'flex items-end gap-2.5 my-1.5 group transition-all',
        isSelf ? 'justify-end' : 'justify-start',
      )}
    >
      {!isSelf && showSenderInfo && (
        <Avatar
          src={message.sender?.avatarUrl}
          name={message.sender?.displayName || message.sender?.username}
          size="sm"
          className="mb-1"
        />
      )}

      <div
        className={cn(
          'relative max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-shadow',
          isSelf
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-xs'
            : 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/50 rounded-bl-xs',
        )}
      >
        {!isSelf && showSenderInfo && (
          <p className="text-[11px] font-semibold text-indigo-400 mb-0.5 tracking-wide">
            {message.sender?.displayName || message.sender?.username}
          </p>
        )}

        <p className="break-words whitespace-pre-wrap leading-relaxed select-text">
          {message.content}
        </p>

        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1 text-[10px] select-none',
            isSelf ? 'text-indigo-200/80' : 'text-zinc-400',
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isSelf && (
            <span title={message.status}>
              {isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-300 inline" />
              ) : isDelivered ? (
                <CheckCheck className="w-3.5 h-3.5 text-indigo-300/80 inline" />
              ) : (
                <Check className="w-3.5 h-3.5 text-indigo-300/80 inline" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
