// ============================================================================
// File: client/src/components/ExportToolbar.tsx
// Export & Sharing Suite (PNG, SVG, PDF, Markdown & Public Link)
// ============================================================================
import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Download,
  Share2,
  FileCode,
  FileImage,
  FileSpreadsheet,
  Check,
  Sparkles,
  Link as LinkIcon,
  Globe,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import type { KnowledgeMapRecord } from '../../../shared/schema';

interface ExportToolbarProps {
  map: KnowledgeMapRecord;
  onOpenQuiz: () => void;
  onUpdateMap?: (updated: KnowledgeMapRecord) => void;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  map,
  onOpenQuiz,
  onUpdateMap,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // 1. Export as PNG
  const handleExportPNG = async () => {
    try {
      setIsExporting(true);
      const viewport = document.getElementById('visualmind-mermaid-viewport');
      if (!viewport) throw new Error('Diagram viewport not found');

      const canvas = await html2canvas(viewport, {
        backgroundColor: '#090d16',
        scale: 2, // High resolution
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${map.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-diagram.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export PNG failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export as SVG
  const handleExportSVG = () => {
    try {
      const viewport = document.getElementById('visualmind-mermaid-viewport');
      const svg = viewport?.querySelector('svg');
      if (!svg) throw new Error('SVG element not found');

      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${map.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-diagram.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export SVG failed:', err);
    }
  };

  // 3. Export as PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const viewport = document.getElementById('visualmind-mermaid-viewport');
      if (!viewport) throw new Error('Diagram viewport not found');

      const canvas = await html2canvas(viewport, {
        backgroundColor: '#090d16',
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${map.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-study-map.pdf`);
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Toggle Public Share Link
  const handleToggleShare = async () => {
    try {
      setIsSharing(true);
      const nextPublicState = !map.is_public;
      const updated = await api.toggleVisibility(map.id, nextPublicState);
      if (onUpdateMap) onUpdateMap(updated);

      if (nextPublicState && updated.public_slug) {
        const shareUrl = `${window.location.origin}/share/${updated.public_slug}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch (err) {
      console.error('Toggle share failed:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyExistingLink = () => {
    if (map.public_slug) {
      const shareUrl = `${window.location.origin}/share/${map.public_slug}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 backdrop-blur-md">
      {/* Left: Active Recall Quiz CTA */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenQuiz}
          className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 transition-all"
        >
          <Sparkles className="h-4 w-4" />
          <span>Launch Active Recall Quiz (5 Qs)</span>
        </button>
      </div>

      {/* Right: Export & Sharing Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Export Buttons */}
        <button
          onClick={handleExportPNG}
          disabled={isExporting}
          className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          title="Download high-resolution PNG for Notion/Obsidian"
        >
          <FileImage className="h-3.5 w-3.5 text-indigo-400" />
          <span>PNG</span>
        </button>

        <button
          onClick={handleExportSVG}
          className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          title="Download vector SVG"
        >
          <FileCode className="h-3.5 w-3.5 text-purple-400" />
          <span>SVG</span>
        </button>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          title="Download printable Vector PDF"
        >
          <Download className="h-3.5 w-3.5 text-emerald-400" />
          <span>PDF</span>
        </button>

        {/* Public Share Button */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleToggleShare}
            disabled={isSharing}
            className={`inline-flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              map.is_public
                ? 'border border-blue-500/40 bg-blue-500/10 text-blue-400'
                : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            {isSharing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            <span>{map.is_public ? 'Public Link Active' : 'Enable Sharing'}</span>
          </button>

          {map.is_public && (
            <button
              onClick={handleCopyExistingLink}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 transition-colors"
              title="Copy public link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <LinkIcon className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
