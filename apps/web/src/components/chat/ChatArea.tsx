'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquareDashed, Loader2 } from 'lucide-react';
import { Conversation, Message, User } from '../../types/index';
import { api } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatAreaProps {
  conversation: Conversation | null;
  currentUser: User | null;
  onBack?: () => void;
  onMessageSent?: (message: Message) => void;
}

export function ChatArea({
  conversation,
  currentUser,
  onBack,
  onMessageSent,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sendMessage,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markAsRead,
    onNewMessage,
    typingUsers,
    onlineUsers,
  } = useSocket();

  const conversationId = conversation?.id;

  // Join room and load message history
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    joinConversation(conversationId);
    markAsRead(conversationId);

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<{ messages: Message[] } | Message[]>(
          `/conversations/${conversationId}/messages`,
        );
        const list = Array.isArray(data) ? data : data.messages || [];
        setMessages(list);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, markAsRead]);

  // Subscribe to real-time incoming messages
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = onNewMessage((newMessage: Message) => {
      if (newMessage.conversationId === conversationId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Mark as read if not sent by current user
        if (newMessage.senderId !== currentUser?.id) {
          markAsRead(conversationId, newMessage.id);
        }

        if (onMessageSent) {
          onMessageSent(newMessage);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, onNewMessage, currentUser?.id, markAsRead, onMessageSent]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
          <MessageSquareDashed className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200">
          Select a Conversation
        </h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">
          Choose a conversation from the sidebar or start a new direct message to begin chatting.
        </p>
      </div>
    );
  }

  const handleSend = (content: string) => {
    if (!conversationId) return;
    sendMessage(conversationId, content);
  };

  const currentTypingNames = typingUsers[conversation.id] || [];

  const isDirect = conversation.type === 'DIRECT';
  const otherMember = isDirect
    ? conversation.members.find((m) => m.userId !== currentUser?.id)?.user
    : null;
  const isOnline = otherMember ? onlineUsers.has(otherMember.id) : false;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 min-w-0">
      <ChatHeader
        conversation={conversation}
        currentUser={currentUser}
        onBack={onBack}
        isOnline={isOnline}
      />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-zinc-400 font-medium">
              No messages in this conversation yet.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Say hello and start the discussion!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isSelf = message.senderId === currentUser?.id;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isSelf={isSelf}
                showSenderInfo={conversation.type === 'GROUP' && !isSelf}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator names={currentTypingNames} />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSend}
        onTypingStart={() => startTyping(conversation.id)}
        onTypingStop={() => stopTyping(conversation.id)}
        disabled={isLoading}
      />
    </div>
  );
}
