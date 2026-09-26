// ============================================================================
// File: client/src/pages/PublicView.tsx
// VisualMind AI - Public Read-Only Shareable View
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  Brain,
  Share2,
  BookOpen,
  Sparkles,
  ArrowRight,
  Globe,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { api } from '../services/api';
import { MermaidViewer } from '../components/MermaidViewer';
import { SourceDrawer } from '../components/SourceDrawer';
import { CheatsheetPanel } from '../components/CheatsheetPanel';
import type { KnowledgeMapRecord, ConceptNode } from '../../../shared/schema';

interface PublicViewProps {
  publicSlug: string;
  onNavigateHome: () => void;
}

export const PublicView: React.FC<PublicViewProps> = ({ publicSlug, onNavigateHome }) => {
  const [map, setMap] = useState<KnowledgeMapRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'source' | 'cheatsheet'>('source');

  useEffect(() => {
    loadPublicMap();
  }, [publicSlug]);

  const loadPublicMap = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicMap(publicSlug);
      setMap(data);
      if (data.concept_nodes && data.concept_nodes.length > 0) {
        setSelectedNode(data.concept_nodes[0]);
      }
    } catch (err: any) {
      console.error('Failed to load public map:', err);
      setError(err.message || 'This knowledge map is private or does not exist.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        <p className="text-sm font-semibold text-slate-300">
          Loading Public Knowledge Map...
        </p>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="mx-auto max-w-md py-24 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Public Map Not Accessible</h3>
        <p className="mt-2 text-xs text-slate-400">
          This study map may have been made private by its author or the link has expired.
        </p>
        <button
          onClick={onNavigateHome}
          className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <span>Explore VisualMind AI</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8 py-6">
      {/* Public Share Banner */}
      <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Shared Academic Knowledge Map
            </span>
            <p className="text-xs text-slate-300">
              Interactive study workspace shared for peer collaboration.
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateHome}
          className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:from-indigo-600"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Extract Your Own Lecture</span>
        </button>
      </div>

      {/* Map Header */}
      <div className="mb-4 pb-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{map.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {map.concept_nodes.length} Concept Nodes • Traced to {map.document?.file_name || 'Academic Deck'}
          </p>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <MermaidViewer
            mermaidCode={map.mermaid_code}
            nodes={map.concept_nodes}
            selectedNodeId={selectedNode?.id}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setRightPanelTab('source');
            }}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/70 p-1">
            <button
              onClick={() => setRightPanelTab('source')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 ${
                rightPanelTab === 'source' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Source Tracer</span>
            </button>
            <button
              onClick={() => setRightPanelTab('cheatsheet')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 ${
                rightPanelTab === 'cheatsheet' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Cheatsheet</span>
            </button>
          </div>

          {rightPanelTab === 'source' ? (
            <div className="h-[620px]">
              <SourceDrawer
                node={selectedNode}
                document={map.document}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          ) : (
            <div className="h-[620px]">
              <CheatsheetPanel
                cheatsheet={map.cheatsheet}
                mapTitle={map.title}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
