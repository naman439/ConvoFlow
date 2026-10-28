'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Zap, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-indigo-300 bg-clip-text text-transparent">
            ConvoFlow
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Chat Engine with Redis & Kafka</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Seamless Real-Time Conversations,{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            Engineered at Scale
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          ConvoFlow delivers instant messaging with live presence, typing indicators,
          read receipts, and event-driven background processing across WebSockets,
          Redis, RabbitMQ, and PostgreSQL.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 group"
          >
            <span>Launch ConvoFlow</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold text-sm transition-colors"
          >
            Create an Account
          </Link>
        </div>

        {/* Features badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 text-left w-full">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              Sub-Millisecond Presence
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Powered by Redis sets and TTL heartbeat caching for live online status.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              PostgreSQL Persistence
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Fully indexed relational schema with message status tracking and soft-deletion.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">
              Event Streaming & Queues
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Kafka for message events and RabbitMQ for background notification worker jobs.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-900 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} ConvoFlow — Real-Time Communication Platform
      </footer>
    </div>
  );
}
