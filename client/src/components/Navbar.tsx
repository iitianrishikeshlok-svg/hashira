// ============================================================================
// File: client/src/components/Navbar.tsx
// VisualMind AI - Top Navigation Bar
// ============================================================================
import React from 'react';
import {
  Brain,
  UploadCloud,
  Library,
  Sparkles,
  Share2,
  LogOut,
  User as UserIcon,
  Compass,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  currentTab?: string;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab = 'landing', onNavigate }) => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('landing')}
          className="flex cursor-pointer items-center space-x-3 transition-transform hover:scale-105"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-white">VisualMind</span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-400 uppercase border border-indigo-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Visual Knowledge Extraction Engine</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => onNavigate('landing')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              currentTab === 'landing'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span className="hidden md:inline">Overview</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Library className="h-4 w-4" />
            <span>Library</span>
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
              currentTab === 'upload'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-indigo-600/90 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/10'
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            <span>Extract Studio</span>
          </button>

          <button
            onClick={() => onNavigate('workspace-demo')}
            className="hidden lg:flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Demo</span>
          </button>
        </nav>

        {/* User Profile / Status */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{user.full_name || user.email}</span>
                <span className="text-[10px] text-slate-400">
                  {user.isDemo ? '🎓 Demo Workspace' : 'Supabase Authenticated'}
                </span>
              </div>
              <div className="relative group">
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500 transition-colors">
                  <UserIcon className="h-4 w-4" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-medium text-white truncate">{user.email}</p>
                    <p className="text-[10px] text-indigo-400 mt-0.5">Stanford / Undergraduate</p>
                  </div>
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-2 mt-1"
                  >
                    <Library className="h-3.5 w-3.5" />
                    <span>My Visual Library</span>
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center space-x-2 mt-1"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
