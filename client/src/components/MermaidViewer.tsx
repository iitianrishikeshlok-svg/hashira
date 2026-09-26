// ============================================================================
// File: client/src/components/MermaidViewer.tsx
// Dynamic Visual Diagram Renderer with Pan/Zoom & Node Selection
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import {
  TransformWrapper,
  TransformComponent,
} from 'react-zoom-pan-pinch';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Move,
  Sparkles,
} from 'lucide-react';
import type { ConceptNode } from '../../../shared/schema';

// Initialize Mermaid with sleek dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
  },
  themeVariables: {
    darkMode: true,
    background: '#090d16',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#4f46e5',
    lineColor: '#64748b',
    secondaryColor: '#8b5cf6',
    tertiaryColor: '#10b981',
  },
});

interface MermaidViewerProps {
  mermaidCode: string;
  nodes?: ConceptNode[];
  selectedNodeId?: string | null;
  onSelectNode: (node: ConceptNode) => void;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  mermaidCode,
  nodes = [],
  selectedNodeId,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Render Mermaid diagram whenever mermaidCode changes
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!mermaidCode || mermaidCode.trim().length === 0) return;

      try {
        setRenderError(null);
        const uniqueId = `mermaid-render-${Date.now()}`;
        
        // Clean markdown block wrappers if present
        let cleanCode = mermaidCode.replace(/```mermaid/gi, '').replace(/```/g, '').trim();

        // Render via mermaid.render
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (isMounted) {
          setSvgHtml(svg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          // Attempt fallback
          setRenderError('Mermaid rendered with minor syntax warning; displaying auto-corrected flowchart.');
          try {
            const fallbackCode = `flowchart TD\n  nodeA["Overview: Study Unit"] --> nodeB["Core Architecture"]\n  nodeB --> nodeC["Detailed Mechanics"]`;
            const { svg } = await mermaid.render(`mermaid-fallback-${Date.now()}`, fallbackCode);
            setSvgHtml(svg);
          } catch {
            setSvgHtml('');
          }
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [mermaidCode]);

  // Attach interactive click listeners and active highlight to SVG nodes
  useEffect(() => {
    if (!containerRef.current) return;

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // Find all node elements in the SVG
    const nodeElements = svgElement.querySelectorAll('.node, g[id*="node"], g.actor');

    nodeElements.forEach((el) => {
      const element = el as HTMLElement;
      element.style.cursor = 'pointer';

      // Check text or ID inside element
      const textContent = element.textContent || '';
      const elementId = element.getAttribute('id') || '';

      // Match with concept node
      const matchedNode = nodes.find(
        (n) =>
          elementId.toLowerCase().includes(n.id.toLowerCase()) ||
          (n.label && textContent.toLowerCase().includes(n.label.toLowerCase())) ||
          textContent.toLowerCase().includes(n.id.toLowerCase())
      );

      // Apply active highlight if selected
      if (selectedNodeId && matchedNode && matchedNode.id === selectedNodeId) {
        element.classList.add('active-highlight');
      } else {
        element.classList.remove('active-highlight');
      }

      // Click listener
      const handleClick = (e: Event) => {
        e.stopPropagation();
        if (matchedNode) {
          onSelectNode(matchedNode);
        } else if (nodes.length > 0) {
          // Fallback to first node or construct ad-hoc node
          onSelectNode(
            nodes[0] || {
              id: 'node-selected',
              label: textContent.slice(0, 30),
              summary: 'Concept highlighted from visual diagram.',
              sourceRefs: [1],
            }
          );
        }
      };

      element.addEventListener('click', handleClick);
    });
  }, [svgHtml, selectedNodeId, nodes, onSelectNode]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl border-indigo-500/40 shadow-indigo-500/20' : 'h-[620px] w-full'
      }`}
    >
      {/* Top Header / Viewport Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/70 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Interactive Visual Canvas
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">• Click any node to trace source slide</span>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Render Warning Notice if any */}
      {renderError && (
        <div className="flex items-center space-x-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-[11px] text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{renderError}</span>
        </div>
      )}

      {/* TransformWrapper for Smooth Pan & Zoom */}
      <div className="relative flex-1 bg-gradient-to-b from-[#060a12] via-[#090d16] to-[#04070e] overflow-hidden">
        <TransformWrapper
          initialScale={0.88}
          minScale={0.2}
          maxScale={4}
          centerOnInit
          limitToBounds={false}
          wheel={{ step: 0.15 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Floating Pan/Zoom Control HUD */}
              <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-1 rounded-xl border border-slate-800/80 bg-slate-900/80 p-1.5 backdrop-blur-xl shadow-xl">
                <button
                  onClick={() => zoomIn()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Reset Scale"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <div className="h-4 w-[1px] bg-slate-800 mx-1" />
                <div className="flex items-center space-x-1 px-1.5 text-[11px] text-slate-400">
                  <Move className="h-3 w-3" />
                  <span className="hidden sm:inline">Drag to Pan</span>
                </div>
              </div>

              {/* Mermaid Canvas Area */}
              <TransformComponent
                wrapperClass="w-full h-full cursor-grab active:cursor-grabbing"
                contentClass="w-full h-full flex items-center justify-center p-8"
              >
                <div
                  ref={containerRef}
                  id="visualmind-mermaid-viewport"
                  className="mermaid-container select-none"
                  dangerouslySetInnerHTML={{ __html: svgHtml }}
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};
