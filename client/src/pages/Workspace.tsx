// ============================================================================
// File: client/src/pages/Workspace.tsx
// VisualMind AI - Interactive Visual Workspace with Split-View Layout
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  Brain,
  ArrowLeft,
  Share2,
  BookOpen,
  Sparkles,
  Layers,
  FileText,
  Presentation,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { MermaidViewer } from '../components/MermaidViewer';
import { SourceDrawer } from '../components/SourceDrawer';
import { CheatsheetPanel } from '../components/CheatsheetPanel';
import { ExportToolbar } from '../components/ExportToolbar';
import { QuizModal } from '../components/QuizModal';
import type { KnowledgeMapRecord, ConceptNode } from '../../../shared/schema';

interface WorkspaceProps {
  mapId: string;
  onBack: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ mapId, onBack }) => {
  const [map, setMap] = useState<KnowledgeMapRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected node for Source Tracing Drawer
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);

  // Active recall quiz modal
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  // Active right-side tab: 'source' or 'cheatsheet'
  const [rightPanelTab, setRightPanelTab] = useState<'source' | 'cheatsheet'>('source');

  useEffect(() => {
    loadMapData();
  }, [mapId]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMap(mapId);
      setMap(data);

      // Default select the first concept node
      if (data.concept_nodes && data.concept_nodes.length > 0) {
        setSelectedNode(data.concept_nodes[0]);
      }
    } catch (err: any) {
      console.error('Failed to load workspace map:', err);
      setError(err.message || 'Knowledge map could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNode = (node: ConceptNode) => {
    setSelectedNode(node);
    setRightPanelTab('source'); // Automatically switch to source drawer
  };

  const handleSelectNodeFromQuiz = (nodeId: string) => {
    if (!map) return;
    const found = map.concept_nodes.find((n) => n.id === nodeId);
    if (found) {
      setSelectedNode(found);
      setRightPanelTab('source');
      setIsQuizOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        <p className="text-sm font-semibold text-slate-300">
          Assembling Interactive Visual Workspace...
        </p>
        <p className="text-xs text-slate-500">Connecting Mermaid canvas and slide citation database</p>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mx-auto mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Knowledge Map Unavailable</h3>
        <p className="mt-2 text-xs text-slate-400">{error || 'Unable to locate map record.'}</p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Library</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Navigation & Info Header */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
            title="Return to library"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{map.title}</h1>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider border border-indigo-500/30">
                {map.diagram_type}
              </span>
            </div>
            <div className="mt-1 flex items-center space-x-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Presentation className="h-3.5 w-3.5 text-orange-400" />
                <span>{map.document?.file_name || 'Presentation Deck'}</span>
              </span>
              <span>•</span>
              <span className="text-slate-300 font-medium">
                {map.concept_nodes.length} Concept Nodes
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">
                {map.cheatsheet?.coreDefinitions?.length || 0} Core Defs
              </span>
            </div>
          </div>
        </div>

        {/* Export and Sharing Toolbar */}
        <ExportToolbar
          map={map}
          onOpenQuiz={() => setIsQuizOpen(true)}
          onUpdateMap={(updated) => setMap({ ...map, ...updated })}
        />
      </div>

      {/* Split-View Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Column: Interactive Mermaid Canvas */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <MermaidViewer
            mermaidCode={map.mermaid_code}
            nodes={map.concept_nodes}
            selectedNodeId={selectedNode?.id}
            onSelectNode={handleSelectNode}
          />

          {/* Quick Concept Navigation Strip */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 backdrop-blur-md">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Concept Nodes in Diagram (Click to inspect source citation)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {map.concept_nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => handleSelectNode(node)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{node.id}: </span>
                    <span>{node.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Source Drawer & Micro-Cheatsheet Tabs */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Side Tab Switcher */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/70 p-1">
            <button
              onClick={() => setRightPanelTab('source')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 ${
                rightPanelTab === 'source'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Source Tracer</span>
            </button>
            <button
              onClick={() => setRightPanelTab('cheatsheet')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 ${
                rightPanelTab === 'cheatsheet'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Micro-Cheatsheet</span>
            </button>
          </div>

          {/* Active Panel */}
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

      {/* Active Recall Quiz Modal */}
      <QuizModal
        mapId={map.id}
        mapTitle={map.title}
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onSelectNodeRef={handleSelectNodeFromQuiz}
      />
    </div>
  );
};
