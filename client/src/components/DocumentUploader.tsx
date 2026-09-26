// ============================================================================
// File: client/src/components/DocumentUploader.tsx
// Document Processing Studio with Drag-and-Drop & Live Progress
// ============================================================================
import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Settings2,
  ArrowRight,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { api } from '../services/api';
import type { DiagramType, GranularityLevel, AcademicDomain } from '../../../shared/schema';

interface DocumentUploaderProps {
  onSuccess: (mapId: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [granularity, setGranularity] = useState<GranularityLevel>('standard');
  const [academicDomain, setAcademicDomain] = useState<AcademicDomain>('ENGINEERING_CS');
  const [academicLevel, setAcademicLevel] = useState('Undergraduate');
  const [focusArea, setFocusArea] = useState('');
  
  // Progress states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    'Parsing Slide Layouts & OpenXML Shapes...',
    'Extracting Section Titles & Speaker Notes...',
    'Synthesizing Structural Conceptual Architecture...',
    'Validating Non-Overlapping Mermaid Schema...',
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);
    const validExtensions = ['.pdf', '.pptx'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a .pdf or .pptx presentation.');
      return;
    }

    if (selectedFile.size > 30 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 30MB limit.');
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a .pptx or .pdf file to proceed.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(10);
    setProgressStep(0);
    setStatusMessage(steps[0]);

    try {
      // Step 1: Upload and extract text
      const progressInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev < 85) return prev + 15;
          return prev;
        });
      }, 700);

      setTimeout(() => {
        setProgressStep(1);
        setStatusMessage(steps[1]);
      }, 1000);

      const uploadedDoc = await api.uploadDocument(file, {
        title: title || file.name,
        academicDomain,
      });

      setProgressStep(2);
      setStatusMessage(steps[2]);
      setProgressPercent(70);

      // Step 2: Trigger AI knowledge map synthesis
      setTimeout(() => {
        setProgressStep(3);
        setStatusMessage(steps[3]);
        setProgressPercent(90);
      }, 1500);

      const generatedMap = await api.generateMap({
        documentId: uploadedDoc.id,
        diagramType,
        granularity,
        focusArea: focusArea || undefined,
      });

      clearInterval(progressInterval);
      setProgressPercent(100);
      setStatusMessage('Knowledge map synthesized successfully!');

      setTimeout(() => {
        onSuccess(generatedMap.id);
      }, 600);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'An unexpected error occurred during processing.');
    }
  };

  const handleUseDemo = async () => {
    setIsProcessing(true);
    setProgressPercent(30);
    setStatusMessage('Loading Stanford CS140 Operating Systems Deck...');
    
    setTimeout(() => {
      setProgressPercent(75);
      setStatusMessage('Validating Mermaid graph & interactive citations...');
    }, 400);

    setTimeout(() => {
      setProgressPercent(100);
      onSuccess('22222222-2222-2222-2222-222222222222');
    }, 900);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header Banner */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center space-x-2 rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Automated Visual Knowledge Extraction Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Document Ingestion Studio
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
          Drop your lecture presentation slides or textbooks. VisualMind extracts conceptual hierarchies,
          step-by-step algorithms, and renders interactive Mermaid charts with slide-level traceability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload Dropzone & Configuration */}
        <div className="lg:col-span-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag & Drop Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : file
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <FileCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{file.name}</h3>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for visual extraction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 underline"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Drag & drop course presentation or <span className="text-indigo-400 underline">browse files</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Supports Microsoft PowerPoint (.pptx) & Academic Documents (.pdf) up to 30MB
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 pt-2 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Presentation className="h-3.5 w-3.5 text-orange-400" />
                      <span>Slide & Notes Parsing</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                      <span>Vector PDF Processing</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Parsing Configuration Grid */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
              <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-slate-800/80">
                <Settings2 className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Knowledge Synthesis Parameters
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Lecture Title / Document Name
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Operating Systems - Process Scheduling"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Academic Domain */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Academic Domain Track
                  </label>
                  <select
                    value={academicDomain}
                    onChange={(e) => setAcademicDomain(e.target.value as AcademicDomain)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ENGINEERING_CS">Engineering & Computer Science</option>
                    <option value="MEDICINE_BIOLOGY">Medicine, Anatomy & Biology</option>
                    <option value="BUSINESS_FINANCE">Business, Economics & Finance</option>
                    <option value="PHYSICAL_SCIENCES">Physical Sciences & Chemistry</option>
                    <option value="GENERAL_ACADEMIC">General Academic / Humanities</option>
                  </select>
                </div>

                {/* Target Diagram Output */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Target Diagram Format
                  </label>
                  <select
                    value={diagramType}
                    onChange={(e) => setDiagramType(e.target.value as DiagramType)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="flowchart">Interactive Flowchart (Algorithmic & Process TD)</option>
                    <option value="mindmap">Hierarchical Mind Map (Taxonomy & Core Topics)</option>
                    <option value="sequence">Sequence Diagram (Step-by-Step Protocols)</option>
                    <option value="state">State Transition Diagram (Lifecycle Dynamics)</option>
                  </select>
                </div>

                {/* Granularity Level */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Granularity & Node Depth
                  </label>
                  <select
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value as GranularityLevel)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="concise">Concise Overview (5–10 Key Nodes)</option>
                    <option value="standard">Standard Architecture (11–25 Nodes)</option>
                    <option value="detailed">Deep Process Map (25+ Exhaustive Nodes)</option>
                  </select>
                </div>

                {/* Focus Area (Optional) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Special Topic Focus (Optional)
                  </label>
                  <input
                    type="text"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    placeholder="e.g., Prioritize Round Robin quantum tradeoffs & Convoy effect"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="flex items-center space-x-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Processing Modal / Progress Overlay */}
            {isProcessing && (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Visual Extraction Pipeline</span>
                  </span>
                  <span className="text-xs font-bold text-indigo-300">{progressPercent}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-300 italic">{statusMessage}</p>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {steps.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-[11px] border transition-colors ${
                        progressStep > idx
                          ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                          : progressStep === idx
                          ? 'border-indigo-500/60 bg-indigo-950/40 text-indigo-200 animate-pulse'
                          : 'border-slate-800 bg-slate-900/40 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1">
                        {progressStep > idx ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        )}
                        <span className="font-semibold">Step {idx + 1}</span>
                      </div>
                      <span className="truncate block">{s.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleUseDemo}
                disabled={isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-900/30 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <span>Try Sample Lecture (OS Scheduling)</span>
              </button>

              <button
                type="submit"
                disabled={!file || isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting Knowledge...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Visual Knowledge Map</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
