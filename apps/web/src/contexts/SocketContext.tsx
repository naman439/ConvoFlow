'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Message, PresenceUpdateData, TypingIndicatorData } from '../types/index';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Record<string, string[]>; // conversationId -> user names
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markAsRead: (conversationId: string, messageId?: string) => void;
  onNewMessage: (callback: (msg: Message) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const messageListenersRef = useRef<Set<(msg: Message) => void>>(new Set());
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('convoflow_access_token');
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('🟢 Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
      setIsConnected(false);
    });

    // Listen for new messages
    newSocket.on('message:new', (message: Message) => {
      messageListenersRef.current.forEach((listener) => listener(message));
    });

    // Listen for presence updates
    newSocket.on('presence:update', (data: PresenceUpdateData) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.status === 'ONLINE') {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    // Listen for typing events
    newSocket.on('typing:start', (data: TypingIndicatorData) => {
      const name = data.displayName || data.username;
      const key = `${data.conversationId}:${data.userId}`;

      // Clear existing timeout if any
      if (typingTimeoutsRef.current[key]) {
        clearTimeout(typingTimeoutsRef.current[key]);
      }

      setTypingUsers((prev) => {
        const existing = prev[data.conversationId] || [];
        if (!existing.includes(name)) {
          return {
            ...prev,
            [data.conversationId]: [...existing, name],
          };
        }
        return prev;
      });

      // Automatically clear typing after 4 seconds of inactivity
      typingTimeoutsRef.current[key] = setTimeout(() => {
        setTypingUsers((prev) => ({
          ...prev,
          [data.conversationId]: (prev[data.conversationId] || []).filter(
            (n) => n !== name,
          ),
        }));
      }, 4000);
    });

    newSocket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
      // Clear timeout
      const key = `${data.conversationId}:${data.userId}`;
      if (typingTimeoutsRef.current[key]) {
        clearTimeout(typingTimeoutsRef.current[key]);
      }

      setTypingUsers((prev) => {
        // Find if user was typing
        return {
          ...prev,
          [data.conversationId]: [],
        };
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinConversation = useCallback(
    (conversationId: string) => {
      if (socket && isConnected) {
        socket.emit('conversation:join', { conversationId });
      }
    },
    [socket, isConnected],
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (socket && isConnected) {
        socket.emit('conversation:leave', { conversationId });
      }
    },
    [socket, isConnected],
  );

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      if (socket && isConnected) {
        socket.emit('message:send', { conversationId, content, type: 'TEXT' });
      }
    },
    [socket, isConnected],
  );

  const startTyping = useCallback(
    (conversationId: string) => {
      if (socket && isConnected) {
        socket.emit('typing:start', { conversationId });
      }
    },
    [socket, isConnected],
  );

  const stopTyping = useCallback(
    (conversationId: string) => {
      if (socket && isConnected) {
        socket.emit('typing:stop', { conversationId });
      }
    },
    [socket, isConnected],
  );

  const markAsRead = useCallback(
    (conversationId: string, messageId?: string) => {
      if (socket && isConnected) {
        socket.emit('message:read', { conversationId, messageId });
      }
    },
    [socket, isConnected],
  );

  const onNewMessage = useCallback((callback: (msg: Message) => void) => {
    messageListenersRef.current.add(callback);
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        typingUsers,
        joinConversation,
        leaveConversation,
        sendMessage,
        startTyping,
        stopTyping,
        markAsRead,
        onNewMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
