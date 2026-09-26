// ============================================================================
// File: client/src/pages/LandingPage.tsx
// VisualMind AI - Landing Showcase & Feature Presentation
// ============================================================================
import React from 'react';
import {
  Brain,
  Sparkles,
  ArrowRight,
  Compass,
  FileText,
  Presentation,
  CheckCircle2,
  Workflow,
  Share2,
  Eye,
  Zap,
  GraduationCap,
  Layers,
  ChevronRight,
  Cpu,
  Dna,
  TrendingUp,
  Atom,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
  onOpenDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenDemo }) => {
  const tracks = [
    {
      id: 'ENGINEERING_CS',
      title: 'Engineering & CS',
      desc: 'Algorithmic flowcharts, process scheduling, distributed protocol sequence diagrams.',
      icon: Cpu,
      color: 'from-blue-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30',
      defaultFormat: 'Flowcharts & Sequence Trees',
    },
    {
      id: 'MEDICINE_BIOLOGY',
      title: 'Medicine & Biology',
      desc: 'Physiological cascades, anatomical taxonomies, biochemical metabolic cycles.',
      icon: Dna,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      defaultFormat: 'Hierarchical Mind Maps',
    },
    {
      id: 'BUSINESS_FINANCE',
      title: 'Business & Finance',
      desc: 'Value chains, decision trees, organizational hierarchies, financial models.',
      icon: TrendingUp,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      defaultFormat: 'Process Decision Trees',
    },
    {
      id: 'PHYSICAL_SCIENCES',
      title: 'Physical Sciences',
      desc: 'Reaction pathways, thermodynamics derivations, quantum state charts.',
      icon: Atom,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
      defaultFormat: 'State Transition Diagrams',
    },
  ];

  return (
    <div className="relative overflow-hidden py-12 sm:py-20">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 mb-6">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Visual Knowledge Extraction Engine</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Turn 40-Slide Lecture Decks into{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Interactive Visual Maps
            </span>{' '}
            in 10 Seconds.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate cognitive overload. Drop your dense lecture presentations (<code className="text-indigo-300">.pptx</code>)
            or course textbooks (<code className="text-indigo-300">.pdf</code>). VisualMind distills core relationships into
            interactive Mermaid flowcharts, formula bars, and slide-level source citations.
          </p>

          {/* CTA Group */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('upload')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition-all hover:scale-[1.02]"
            >
              <span>Ingest Course Document</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-8 py-4 text-sm font-bold text-emerald-300 hover:bg-emerald-900/30 transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>Explore Interactive Demo Deck</span>
            </button>
          </div>

          {/* Feature Highlights Bar */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>100% Slide-by-Slide Traceability</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Syntax-Guaranteed Mermaid Engine</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>5-Question Active Recall Quizzes</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>One-Click Vector PDF / SVG Export</span>
            </span>
          </div>
        </div>

        {/* Demo Preview Card */}
        <div className="mt-16 rounded-3xl border border-slate-800 bg-slate-900/40 p-3 sm:p-5 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">VisualMind Workspace • Stanford CS140 Operating Systems</span>
            </div>
            <button
              onClick={onOpenDemo}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center space-x-1"
            >
              <span>Open live interactive canvas</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
            {/* Visual Flow Preview */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-full flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-300">Generated Process Flowchart</span>
                <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  Preemptive Scheduling Flow
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 text-xs w-full max-w-lg justify-center py-6">
                <div className="p-3 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 text-center font-semibold shadow-md">
                  Process Ready Queue
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 rotate-90 sm:rotate-0" />
                <div className="p-3 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-200 text-center font-semibold shadow-md">
                  CPU Dispatcher (Mode Switch)
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 rotate-90 sm:rotate-0" />
                <div className="p-3 rounded-xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 text-center font-semibold shadow-md ring-2 ring-emerald-400">
                  Round Robin (Time Quantum q)
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Clicking any node instantly highlights Slide #14, instructor notes, and mathematical burst formulas.
              </p>
            </div>

            {/* Source Drawer Teaser */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                Source Citation Drawer
              </span>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-emerald-300">Round Robin RR</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                    Slide #14
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  "Allocates fixed time quantum (q = 10-100ms) per process in FIFO ready queue..."
                </p>
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs">
                <span className="font-bold text-purple-300 block mb-1">Key Formula</span>
                <code className="text-[11px] text-purple-200 font-mono">
                  tau_{'{n+1}'} = alpha * t_n + (1 - alpha) * tau_n
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Domains Grid */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Optimized for University Degree Tracks
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              The AI parser automatically categorizes documents into domain taxonomies and selects the optimal Mermaid diagram schema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tracks.map((track) => {
              const Icon = track.icon;
              return (
                <div
                  key={track.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-slate-700 hover:bg-slate-900/70 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr border mb-4 ${track.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{track.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{track.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Default Diagram Format</span>
                    <span className="text-xs font-semibold text-slate-300">{track.defaultFormat}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
