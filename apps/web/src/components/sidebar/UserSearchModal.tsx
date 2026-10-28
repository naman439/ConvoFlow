import React, { useState, useEffect } from 'react';
import { Search, X, Users, UserPlus, Check, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { User, Conversation } from '../../types/index';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
  currentUserId?: string;
  onlineUsers?: Set<string>;
}

export function UserSearchModal({
  isOpen,
  onClose,
  onConversationCreated,
  currentUserId,
  onlineUsers = new Set(),
}: UserSearchModalProps) {
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      setSelectedUserIds([]);
      setGroupName('');
      return;
    }

    const searchUsers = async () => {
      setIsLoading(true);
      try {
        const results = await api.get<User[]>(
          `/users/search${query ? `?q=${encodeURIComponent(query)}` : ''}`,
        );
        // Exclude current user from results
        setUsers(results.filter((u) => u.id !== currentUserId));
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 250);
    return () => clearTimeout(debounce);
  }, [query, isOpen, currentUserId]);

  if (!isOpen) return null;

  const handleStartDirect = async (user: User) => {
    setIsSubmitting(true);
    try {
      const conv = await api.post<Conversation>('/conversations/direct', {
        participantId: user.id,
      });
      onConversationCreated(conv);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const conv = await api.post<Conversation>('/conversations/group', {
        name: groupName.trim(),
        memberIds: selectedUserIds,
      });
      onConversationCreated(conv);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('direct')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                tab === 'direct'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
              )}
            >
              Direct Message
            </button>
            <button
              onClick={() => setTab('group')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5',
                tab === 'group'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
              )}
            >
              <Users className="w-3.5 h-3.5" />
              New Group
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group Name input if in group tab */}
        {tab === 'group' && (
          <div className="p-4 border-b border-zinc-800">
            <input
              type="text"
              placeholder="Group name (e.g. Design Team)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="p-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 rounded-xl border border-zinc-700/60 focus-within:border-indigo-500">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by username or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500">
              No users found
            </div>
          ) : (
            users.map((u) => {
              const isSelected = selectedUserIds.includes(u.id);
              const isOnline = onlineUsers.has(u.id);

              return (
                <div
                  key={u.id}
                  onClick={() => {
                    if (tab === 'direct') {
                      handleStartDirect(u);
                    } else {
                      toggleSelectUser(u.id);
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40'
                      : 'hover:bg-zinc-800/60 border border-transparent',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={u.avatarUrl}
                      name={u.displayName || u.username}
                      size="md"
                      isOnline={isOnline}
                    />
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">
                        {u.displayName}
                      </p>
                      <p className="text-xs text-zinc-400">@{u.username}</p>
                    </div>
                  </div>

                  {tab === 'direct' ? (
                    <button
                      disabled={isSubmitting}
                      className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  ) : (
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-zinc-700 bg-zinc-800',
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Group Footer */}
        {tab === 'group' && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {selectedUserIds.length} member(s) selected
            </span>
            <button
              onClick={handleCreateGroup}
              disabled={
                !groupName.trim() || selectedUserIds.length === 0 || isSubmitting
              }
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-md"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
