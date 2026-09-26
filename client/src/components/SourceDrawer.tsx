// ============================================================================
// File: client/src/components/SourceDrawer.tsx
// Source Node Tracing Drawer with Slide Context, Excerpts & Notes
// ============================================================================
import React from 'react';
import {
  FileText,
  Presentation,
  BookOpen,
  X,
  Compass,
  Quote,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { ConceptNode, ExtractedPage, DocumentRecord } from '../../../shared/schema';

interface SourceDrawerProps {
  node: ConceptNode | null;
  document?: Partial<DocumentRecord> | null;
  onClose: () => void;
  onNavigateToNode?: (nodeId: string) => void;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({
  node,
  document,
  onClose,
}) => {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
          <Compass className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">Interactive Source Tracer</h4>
        <p className="mt-1 text-xs text-slate-400 max-w-xs">
          Click any diagram node in the knowledge map to inspect its exact slide citations, lecture context, and speaker notes.
        </p>
      </div>
    );
  }

  // Find matching extracted pages
  const extractedPages: ExtractedPage[] = document?.raw_extracted_text || [];
  const matchedPages = extractedPages.filter((p) =>
    node.sourceRefs.includes(p.page)
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Source Citation</span>
            <p className="text-[10px] text-slate-400">Traced to {node.sourceRefs.length} lecture reference(s)</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Node Concept Highlight Card */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wider border border-indigo-500/30">
              Node: {node.id}
            </span>
            <div className="flex space-x-1">
              {node.sourceRefs.map((ref) => (
                <span
                  key={ref}
                  className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30"
                >
                  Slide #{ref}
                </span>
              ))}
            </div>
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">{node.label}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{node.summary}</p>
        </div>

        {/* Source References List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Primary Lecture Evidence</span>
            <span>{document?.file_name || 'Presentation Deck'}</span>
          </div>

          {matchedPages.length > 0 ? (
            matchedPages.map((page) => (
              <div
                key={page.page}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700"
              >
                {/* Slide Title Bar */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[11px] font-bold text-indigo-400">
                      {page.page}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
                      {page.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase">Slide Excerpt</span>
                </div>

                {/* Excerpt Body */}
                <div className="relative pl-3 border-l-2 border-indigo-500/50 mb-3">
                  <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-line text-[11.5px]">
                    {page.content}
                  </p>
                </div>

                {/* Speaker Notes if present */}
                {page.notes && (
                  <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-amber-400 uppercase mb-1">
                      <Quote className="h-3 w-3" />
                      <span>Instructor Speaker Notes</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 italic">{page.notes}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
              <p>
                This concept was derived from slide reference {node.sourceRefs.join(', ')}.
              </p>
            </div>
          )}
        </div>

        {/* Study Tip Box */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3.5 flex items-start space-x-2.5 text-xs text-slate-400">
          <Info className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Every diagram element is linked to course pages. Use the active recall quiz mode to verify retention
            of the algorithms covered in this section.
          </p>
        </div>
      </div>
    </div>
  );
};
