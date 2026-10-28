import React from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = 'md',
  isOnline,
  className,
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const badgeSizeClasses = {
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
  };

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={cn(
            'rounded-full object-cover shadow-sm ring-1 ring-white/10',
            sizeClasses[size],
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center font-bold text-white rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-sm ring-1 ring-white/10',
            sizeClasses[size],
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-zinc-950 transition-colors',
            badgeSizeClasses[size],
            isOnline ? 'bg-emerald-500' : 'bg-zinc-500',
          )}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
