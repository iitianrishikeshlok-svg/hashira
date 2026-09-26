// ============================================================================
// File: client/src/App.tsx
// VisualMind AI - Core Application Router & Context Assembly
// ============================================================================
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { DocumentUploader } from './components/DocumentUploader';
import { Workspace } from './pages/Workspace';
import { PublicView } from './pages/PublicView';
import { AuthPage } from './pages/AuthPage';

const DEMO_MAP_ID = '22222222-2222-2222-2222-222222222222';

function MainApp() {
  const { user } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>('landing');
  const [currentParam, setCurrentParam] = useState<string | null>(null);

  // Parse path on initial load & popstate (browser back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;

      if (path.startsWith('/share/')) {
        const slug = path.replace('/share/', '');
        setCurrentRoute('share');
        setCurrentParam(slug);
      } else if (path.startsWith('/workspace/')) {
        const mapId = path.replace('/workspace/', '').replace('/quiz', '');
        setCurrentRoute('workspace');
        setCurrentParam(mapId);
      } else if (path === '/dashboard') {
        setCurrentRoute('dashboard');
        setCurrentParam(null);
      } else if (path === '/upload') {
        setCurrentRoute('upload');
        setCurrentParam(null);
      } else if (path === '/auth' || path.startsWith('/auth/')) {
        setCurrentRoute('auth');
        setCurrentParam(null);
      } else {
        setCurrentRoute('landing');
        setCurrentParam(null);
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (route: string, param?: string) => {
    setCurrentRoute(route);
    setCurrentParam(param || null);

    let newUrl = '/';
    if (route === 'dashboard') newUrl = '/dashboard';
    else if (route === 'upload') newUrl = '/upload';
    else if (route === 'auth') newUrl = '/auth/login';
    else if (route === 'workspace' && param) newUrl = `/workspace/${param}`;
    else if (route === 'share' && param) newUrl = `/share/${param}`;
    else if (route === 'workspace-demo') {
      route = 'workspace';
      param = DEMO_MAP_ID;
      setCurrentRoute('workspace');
      setCurrentParam(DEMO_MAP_ID);
      newUrl = `/workspace/${DEMO_MAP_ID}`;
    }

    window.history.pushState({}, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentRoute}
        onNavigate={(tab) => {
          if (tab === 'workspace-demo') {
            navigateTo('workspace-demo');
          } else {
            navigateTo(tab);
          }
        }}
      />

      {/* Main Route Content */}
      <main className="flex-1">
        {currentRoute === 'landing' && (
          <LandingPage
            onNavigate={(tab) => navigateTo(tab)}
            onOpenDemo={() => navigateTo('workspace-demo')}
          />
        )}

        {currentRoute === 'dashboard' && (
          <Dashboard
            onOpenMap={(mapId) => navigateTo('workspace', mapId)}
            onNavigateToUpload={() => navigateTo('upload')}
          />
        )}

        {currentRoute === 'upload' && (
          <DocumentUploader
            onSuccess={(mapId) => navigateTo('workspace', mapId)}
          />
        )}

        {currentRoute === 'workspace' && currentParam && (
          <Workspace
            mapId={currentParam}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {currentRoute === 'share' && currentParam && (
          <PublicView
            publicSlug={currentParam}
            onNavigateHome={() => navigateTo('landing')}
          />
        )}

        {currentRoute === 'auth' && (
          <AuthPage
            initialMode="login"
            onSuccess={() => navigateTo('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">VisualMind AI</span>
            <span>•</span>
            <span>Automated Visual Knowledge Extraction Engine</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <span>Powered by @google/genai & Supabase Cloud</span>
            <span>•</span>
            <button
              onClick={() => navigateTo('workspace-demo')}
              className="text-indigo-400 hover:underline"
            >
              Demo Deck (CS140)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
