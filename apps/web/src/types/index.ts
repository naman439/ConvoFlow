export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: UserStatus;
  lastSeenAt?: string;
  createdAt?: string;
  isOnline?: boolean;
}

export type ConversationType = 'DIRECT' | 'GROUP';
export type MemberRole = 'ADMIN' | 'MEMBER';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  lastReadAt: string;
  user: User;
}

export interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: User;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
  members: ConversationMember[];
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
}

export interface TypingIndicatorData {
  conversationId: string;
  userId: string;
  username: string;
  displayName?: string;
}

export interface PresenceUpdateData {
  userId: string;
  status: UserStatus;
  lastSeenAt: string;
}
