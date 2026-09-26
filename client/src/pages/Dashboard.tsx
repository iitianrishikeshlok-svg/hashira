// ============================================================================
// File: client/src/pages/Dashboard.tsx
// VisualMind AI - Student Library & Knowledge Maps Dashboard
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  Library,
  UploadCloud,
  FileText,
  Presentation,
  Sparkles,
  ArrowRight,
  Trash2,
  Share2,
  ExternalLink,
  Layers,
  Search,
  BookOpen,
  CheckCircle2,
  Calendar,
  Loader2,
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import type { KnowledgeMapRecord, DocumentRecord, AcademicDomain } from '../../../shared/schema';

interface DashboardProps {
  onOpenMap: (mapId: string) => void;
  onNavigateToUpload: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenMap, onNavigateToUpload }) => {
  const [maps, setMaps] = useState<KnowledgeMapRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [fetchedMaps, fetchedDocs] = await Promise.all([
        api.listMaps(),
        api.listDocuments(),
      ]);
      setMaps(fetchedMaps);
      setDocuments(fetchedDocs);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document and its associated visual maps?')) return;
    try {
      await api.deleteDocument(id);
      await loadDashboardData();
    } catch (err) {
      console.error('Delete document failed:', err);
    }
  };

  // Metrics
  const totalSlides = documents.reduce((acc, d) => acc + (d.total_pages_or_slides || 0), 0);
  const totalConcepts = maps.reduce((acc, m) => acc + (m.concept_nodes?.length || 0), 0);

  // Filtered maps
  const filteredMaps = maps.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.document?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain =
      domainFilter === 'ALL' ||
      m.document?.academic_domain === domainFilter;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">Student Visual Library</h1>
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
              {maps.length} Knowledge Maps
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Access your synthesized lecture decks, interactive flowcharts, and study cheatsheets.
          </p>
        </div>

        <button
          onClick={onNavigateToUpload}
          className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Ingest New Lecture</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Knowledge Maps</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{maps.length}</p>
          <p className="mt-1 text-[11px] text-slate-500">Interactive Mermaid views ready</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Slides & Pages Digested</span>
            <Presentation className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">{totalSlides}</p>
          <p className="mt-1 text-[11px] text-slate-500">Extracted across course decks</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Concept Nodes Traced</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-400">{totalConcepts}</p>
          <p className="mt-1 text-[11px] text-slate-500">100% Citation verified to slides</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Recall Readiness</span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-400">98%</p>
          <p className="mt-1 text-[11px] text-slate-500">Active quizzes available</p>
        </div>
      </div>

      {/* Search and Domain Filters */}
      <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search knowledge maps & slides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['ALL', 'ENGINEERING_CS', 'MEDICINE_BIOLOGY', 'BUSINESS_FINANCE', 'PHYSICAL_SCIENCES'].map((dom) => (
            <button
              key={dom}
              onClick={() => setDomainFilter(dom)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                domainFilter === dom
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {dom === 'ALL' ? 'All Tracks' : dom.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Maps Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400">Loading student visual library...</p>
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
            <BookOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">No Knowledge Maps Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't uploaded or generated any knowledge maps in this track yet. Drop a slide deck to start.
            </p>
            <button
              onClick={onNavigateToUpload}
              className="mt-4 inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ingest Document</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMaps.map((map) => (
              <div
                key={map.id}
                onClick={() => onOpenMap(map.id)}
                className="group relative cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider border border-indigo-500/30">
                      {map.diagram_type}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Presentation className="h-3 w-3 text-orange-400" />
                      <span>{map.document?.total_pages_or_slides || '20+'} slides</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {map.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400 truncate">
                    Source: {map.document?.file_name || 'Academic Deck'}
                  </p>

                  <div className="mt-4 flex items-center space-x-3 text-xs text-slate-400 pt-3 border-t border-slate-800/80">
                    <span className="font-semibold text-slate-300">
                      {map.concept_nodes?.length || 0} Nodes
                    </span>
                    <span>•</span>
                    <span>{map.cheatsheet?.keyFormulas?.length || 0} Formulas</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Ready</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2">
                  <span className="text-[11px] text-indigo-400 group-hover:underline font-semibold flex items-center space-x-1">
                    <span>Open Workspace</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>

                  {map.is_public && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20 flex items-center space-x-1">
                      <Share2 className="h-2.5 w-2.5" />
                      <span>Public</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Documents Management Table */}
      {documents.length > 0 && (
        <div className="mt-14">
          <h2 className="text-lg font-bold text-white mb-4">Ingested Source Documents</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Document Title</th>
                  <th className="px-4 py-3.5">Format</th>
                  <th className="px-4 py-3.5">Slides / Pages</th>
                  <th className="px-4 py-3.5">Academic Track</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">
                      <div className="flex items-center space-x-2">
                        {doc.file_type === 'pptx' ? (
                          <Presentation className="h-4 w-4 text-orange-400 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 uppercase font-mono">{doc.file_type}</td>
                    <td className="px-4 py-3.5 text-slate-300">{doc.total_pages_or_slides} slides</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {doc.academic_domain.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
