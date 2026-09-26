// ============================================================================
// File: client/src/components/CheatsheetPanel.tsx
// Micro-Cheatsheet & Formula Bar with Interactive Math and Cards
// ============================================================================
import React, { useState } from 'react';
import {
  FileText,
  Calculator,
  CheckCircle2,
  Copy,
  Check,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import type { CheatsheetData } from '../../../shared/schema';

interface CheatsheetPanelProps {
  cheatsheet?: CheatsheetData | null;
  mapTitle: string;
}

export const CheatsheetPanel: React.FC<CheatsheetPanelProps> = ({ cheatsheet, mapTitle }) => {
  const [activeTab, setActiveTab] = useState<'definitions' | 'formulas' | 'takeaways'>('definitions');
  const [copied, setCopied] = useState(false);

  const defs = cheatsheet?.coreDefinitions || [];
  const formulas = cheatsheet?.keyFormulas || [];
  const takeaways = cheatsheet?.keyTakeaways || [];

  const handleCopyMarkdown = () => {
    let md = `# Visual Cheatsheet: ${mapTitle}\n\n`;

    if (defs.length > 0) {
      md += `## 📚 Core Definitions\n`;
      defs.forEach((d) => {
        md += `- **${d.term}**: ${d.definition}\n`;
      });
      md += `\n`;
    }

    if (formulas.length > 0) {
      md += `## 🧮 Key Equations & Formulas\n`;
      formulas.forEach((f) => {
        md += `- **${f.name}**:\n  \`\`\`text\n  ${f.formula}\n  \`\`\`\n  *Context*: ${f.context || 'Fundamental formula'}\n\n`;
      });
    }

    if (takeaways.length > 0) {
      md += `## 🎯 High-Yield Takeaways\n`;
      takeaways.forEach((t) => {
        md += `- ${t}\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Micro-Cheatsheet
            </span>
            <span className="text-[10px] text-slate-400 block">Exam-ready summary distillation</span>
          </div>
        </div>

        <button
          onClick={handleCopyMarkdown}
          className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          title="Copy markdown cheatsheet"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="text-[11px]">{copied ? 'Copied!' : 'Copy Markdown'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 bg-slate-900/40 px-2 pt-2">
        <button
          onClick={() => setActiveTab('definitions')}
          className={`flex items-center space-x-1.5 border-b-2 px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'definitions'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Definitions ({defs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('formulas')}
          className={`flex items-center space-x-1.5 border-b-2 px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'formulas'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>Formulas ({formulas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('takeaways')}
          className={`flex items-center space-x-1.5 border-b-2 px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'takeaways'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span>Takeaways ({takeaways.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]">
        {activeTab === 'definitions' && (
          <div className="space-y-3">
            {defs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No core definitions extracted.</p>
            ) : (
              defs.map((def, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-indigo-300">{def.term}</span>
                    <span className="text-[10px] text-slate-500">Core Def</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{def.definition}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="space-y-3">
            {formulas.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No mathematical equations present in this unit.</p>
            ) : (
              formulas.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 hover:border-slate-700 transition-colors"
                >
                  <span className="text-xs font-bold text-purple-300 block mb-1.5">{item.name}</span>
                  <div className="rounded-lg bg-slate-950 p-2.5 font-mono text-xs text-emerald-400 border border-slate-800 overflow-x-auto">
                    {item.formula}
                  </div>
                  {item.context && (
                    <p className="mt-2 text-[11px] text-slate-400 italic">{item.context}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'takeaways' && (
          <div className="space-y-2.5">
            {takeaways.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No high-yield bullet takeaways available.</p>
            ) : (
              takeaways.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">{item}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
