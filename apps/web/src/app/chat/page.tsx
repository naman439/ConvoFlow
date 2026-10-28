'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Conversation, Message } from '../../types/index';
import { api } from '../../lib/api';
import { UserProfileHeader } from '../../components/sidebar/UserProfileHeader';
import { ConversationList } from '../../components/sidebar/ConversationList';
import { UserSearchModal } from '../../components/sidebar/UserSearchModal';
import { ChatArea } from '../../components/chat/ChatArea';
import { cn } from '../../lib/utils';

export default function ChatPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { onlineUsers, onNewMessage } = useSocket();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<Conversation[]>('/conversations');
      setConversations(data);
      // Auto-select first conversation on initial load if none selected on desktop
      if (data.length > 0 && !activeConversation && window.innerWidth >= 768) {
        setActiveConversation(data[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setIsLoadingConvs(false);
    }
  }, [activeConversation]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  // Handle incoming messages to update conversation list snippets and ordering
  useEffect(() => {
    const unsubscribe = onNewMessage((msg: Message) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === msg.conversationId);
        if (index === -1) {
          // If conversation isn't in list yet, reload conversations
          loadConversations();
          return prev;
        }

        const updated = {
          ...prev[index],
          lastMessage: msg,
          updatedAt: msg.createdAt,
        };

        // Move active conversation to the top
        const nextList = [
          updated,
          ...prev.slice(0, index),
          ...prev.slice(index + 1),
        ];

        return nextList;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [onNewMessage, loadConversations]);

  const handleConversationCreated = (newConv: Conversation) => {
    setConversations((prev) => {
      if (prev.some((c) => c.id === newConv.id)) {
        return prev;
      }
      return [newConv, ...prev];
    });
    setActiveConversation(newConv);
  };

  if (authLoading || (!isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-950 overflow-hidden text-zinc-100">
      {/* Sidebar: hidden on mobile if conversation is selected */}
      <aside
        className={cn(
          'w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-800/80 bg-zinc-950 h-full flex-shrink-0 z-20 transition-all',
          activeConversation ? 'hidden md:flex' : 'flex',
        )}
      >
        <UserProfileHeader
          user={user}
          onNewChat={() => setIsSearchModalOpen(true)}
          onLogout={logout}
        />

        {isLoadingConvs ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversation?.id}
            currentUser={user}
            onlineUsers={onlineUsers}
            onSelectConversation={(conv) => setActiveConversation(conv)}
            onOpenNewChat={() => setIsSearchModalOpen(true)}
          />
        )}
      </aside>

      {/* Main Chat Area */}
      <main
        className={cn(
          'flex-1 flex flex-col h-full min-w-0 bg-zinc-950',
          !activeConversation ? 'hidden md:flex' : 'flex',
        )}
      >
        <ChatArea
          conversation={activeConversation}
          currentUser={user}
          onBack={() => setActiveConversation(null)}
          onMessageSent={(msg) => {
            // Update lastMessage in conversation list
            setConversations((prev) =>
              prev.map((c) =>
                c.id === msg.conversationId
                  ? { ...c, lastMessage: msg, updatedAt: msg.createdAt }
                  : c,
              ),
            );
          }}
        />
      </main>

      {/* User Search & New Chat Modal */}
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onConversationCreated={handleConversationCreated}
        currentUserId={user?.id}
        onlineUsers={onlineUsers}
      />
    </div>
  );
}
