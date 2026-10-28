import React from 'react';
import Link from 'next/link';
import { Plus, LogOut, User as UserIcon, MessageSquare } from 'lucide-react';
import { User } from '../../types/index';
import { Avatar } from '../ui/Avatar';

interface UserProfileHeaderProps {
  user: User | null;
  onNewChat: () => void;
  onLogout: () => void;
}

export function UserProfileHeader({
  user,
  onNewChat,
  onLogout,
}: UserProfileHeaderProps) {
  return (
    <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md">
      {/* Brand logo & New chat button */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/chat" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-zinc-200 to-indigo-300 bg-clip-text text-transparent">
            ConvoFlow
          </span>
        </Link>

        <button
          onClick={onNewChat}
          className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          title="New Conversation"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* User profile card */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || user?.username}
            size="sm"
            isOnline={true}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-100 truncate">
              {user?.displayName || user?.username}
            </p>
            <p className="text-[10px] text-zinc-400 truncate">@{user?.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/profile"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
            title="Profile Settings"
          >
            <UserIcon className="w-4 h-4" />
          </Link>
          <button
            onClick={onLogout}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
