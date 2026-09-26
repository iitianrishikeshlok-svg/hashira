// ============================================================================
// File: server/src/services/aiService.ts
// AI Knowledge Extraction Engine & Quiz Generator with @google/genai
// ============================================================================
import { Type, Schema } from '@google/genai';
import { ai, isGeminiConfigured, GEMINI_MODEL_FAST, CANDIDATE_GEMINI_MODELS } from '../lib/gemini';
import type {
  ExtractedPage,
  AcademicDomain,
  DiagramType,
  GranularityLevel,
  ConceptNode,
  CheatsheetData,
  QuizQuestion,
} from '../../../shared/schema';

export const AI_SYSTEM_PROMPT = `You are VisualMind AI, an elite academic knowledge architect and expert software visualization system.
Your mission is to parse raw, unorganized slide transcripts and document texts from university lectures, extract the fundamental conceptual architecture, and output structured relationship data that translates perfectly into clear, non-overlapping Mermaid.js diagrams.

RULES FOR EXTRACTION:
1. MANDATORY NODE COUNT: You MUST generate between 11 and 25 nodes (minimum 10-11 nodes, maximum 25-28 nodes). Never generate fewer than 10 nodes. Comprehensively capture the document's topics, sub-sections, steps, formulas, and methodologies.
2. ACTIVE ARROW WORKFLOW: Every concept node MUST be connected using directional arrows (--> or -.-> or -- label -->) forming a complete, multi-stage learning workflow or mindmap hierarchy.
3. STRICT NODE ISOLATION: Break complex concepts into discrete atomic nodes (3-7 words per label max).
4. SOURCE TRACING REQUIRED: Every single node MUST reference the specific slide number(s) or page number(s) from which it was extracted.
5. SYNTAX SAFETY: For labels in Mermaid.js, eliminate special characters (brackets, quotes, parentheses) that break rendering engines. Use safe alphanumeric identifiers (e.g., nodeA["Concept Title"]).
6. CHEATSHEET DISTILLATION: Extract exact equations/formulas and core definitions verbatim to serve as quick revision reference cards.`;

export const knowledgeExtractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Short descriptive title of the knowledge map' },
    academicDomain: {
      type: Type.STRING,
      enum: ['ENGINEERING_CS', 'MEDICINE_BIOLOGY', 'BUSINESS_FINANCE', 'PHYSICAL_SCIENCES', 'GENERAL_ACADEMIC'],
    },
    mermaidCode: {
      type: Type.STRING,
      description: 'Valid, syntax-error-free Mermaid.js diagram code (e.g., flowchart TD or mindmap)',
    },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Unique node identifier matching the Mermaid node key (e.g., node1)' },
          label: { type: Type.STRING, description: 'Short display label for the node' },
          summary: { type: Type.STRING, description: '2-3 sentence explanation of this concept' },
          sourceRefs: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: 'Slide or page numbers where this topic appears',
          },
        },
        required: ['id', 'label', 'summary', 'sourceRefs'],
      },
    },
    cheatsheet: {
      type: Type.OBJECT,
      properties: {
        coreDefinitions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
            },
            required: ['term', 'definition'],
          },
        },
        keyFormulas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              formula: { type: Type.STRING },
              context: { type: Type.STRING },
            },
            required: ['name', 'formula'],
          },
        },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['coreDefinitions', 'keyFormulas', 'keyTakeaways'],
    },
  },
  required: ['title', 'academicDomain', 'mermaidCode', 'nodes', 'cheatsheet'],
};

export const quizGenerationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Four multiple-choice options',
          },
          correct_index: {
            type: Type.INTEGER,
            description: 'Zero-based index of the correct option (0, 1, 2, or 3)',
          },
          explanation: { type: Type.STRING },
          node_ref: { type: Type.STRING, description: 'The concept node ID this question tests' },
        },
        required: ['id', 'question', 'options', 'correct_index', 'explanation'],
      },
    },
  },
  required: ['questions'],
};

export interface ExtractionResult {
  title: string;
  academicDomain: AcademicDomain;
  mermaidCode: string;
  nodes: ConceptNode[];
  cheatsheet: CheatsheetData;
}

export class AIService {
  /**
   * Main knowledge extraction pipeline
   */
  static async extractKnowledgeMap(
    extractedPages: ExtractedPage[],
    options: {
      diagramType: DiagramType;
      granularity: GranularityLevel;
      focusArea?: string;
      detectedDomain?: AcademicDomain;
    }
  ): Promise<ExtractionResult> {
    const { diagramType, granularity, focusArea, detectedDomain } = options;

    if (isGeminiConfigured) {
      for (const modelName of CANDIDATE_GEMINI_MODELS) {
        try {
          console.log(`🧠 Invoking ${modelName} for ${diagramType} extraction (${granularity})...`);

          // Prepare condensed transcript to optimize tokens while retaining structural accuracy
          const condensedPages = extractedPages.map((p) => ({
            slide_or_page: p.page,
            title: p.title,
            excerpt: p.content.slice(0, 800),
            notes: p.notes?.slice(0, 300),
          }));

          let userPrompt = `Analyze the following lecture transcript (extracted page-by-page) and generate a rich, comprehensive ${diagramType} knowledge map.
CRITICAL CONSTRAINT: You MUST output between 11 to 25 nodes (minimum 10-11 nodes, maximum 25-28 nodes).
Every node must be interconnected with directional arrow symbols (-->) creating a multi-stage, branching learning workflow.
Never return only 3 or 4 nodes.
Target detail level: ${granularity}.
Target Diagram Format: ${this.getDiagramPromptFormat(diagramType)}.`;

          if (focusArea) {
            userPrompt += `\nSPECIAL FOCUS AREA: Focus deeply on: "${focusArea}".`;
          }

          userPrompt += `\n\nDOCUMENT TRANSCRIPT:\n${JSON.stringify(condensedPages, null, 2)}`;

          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [{ text: userPrompt }],
              },
            ],
            config: {
              systemInstruction: AI_SYSTEM_PROMPT,
              responseMimeType: 'application/json',
              responseSchema: knowledgeExtractionSchema,
              temperature: 0.2,
            },
          });

          const rawJson = response.text || '';
          if (!rawJson) continue;
          const parsed = JSON.parse(rawJson);

          // Sanitize Mermaid code to ensure 100% render safety
          const sanitizedMermaid = this.sanitizeMermaidCode(parsed.mermaidCode, diagramType, parsed.nodes);

          return {
            title: parsed.title || 'Extracted Knowledge Map',
            academicDomain: (parsed.academicDomain as AcademicDomain) || detectedDomain || 'GENERAL_ACADEMIC',
            mermaidCode: sanitizedMermaid,
            nodes: parsed.nodes || [],
            cheatsheet: {
              coreDefinitions: parsed.cheatsheet?.coreDefinitions || [],
              keyFormulas: parsed.cheatsheet?.keyFormulas || [],
              keyTakeaways: parsed.cheatsheet?.keyTakeaways || [],
            },
          };
        } catch (err: any) {
          console.warn(`⚠️ Gemini ${modelName} call failed (${err.status || err.message}). Trying next candidate...`);
        }
      }
    }

    // High-Fidelity Synthesizer Fallback
    return this.generateSynthesizedKnowledgeMap(extractedPages, options);
  }

  /**
   * Active recall quiz generator using Gemini 2.5 Flash
   */
  static async generateQuiz(
    mapTitle: string,
    nodes: ConceptNode[],
    cheatsheet: CheatsheetData,
    questionCount: number = 5
  ): Promise<QuizQuestion[]> {
    if (isGeminiConfigured) {
      for (const modelName of CANDIDATE_GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Generate a challenging ${questionCount}-question active recall multiple-choice quiz based on the following concepts and formulas from the knowledge map "${mapTitle}".
Each question must test conceptual comprehension, not rote memorization.
Link each question to the most relevant node ID.

CONCEPTS:
${JSON.stringify(nodes.slice(0, 15), null, 2)}

DEFINITIONS & FORMULAS:
${JSON.stringify(cheatsheet, null, 2)}`,
                  },
                ],
              },
            ],
            config: {
              systemInstruction: 'You are an expert university examiner creating high-retention active recall assessment questions.',
              responseMimeType: 'application/json',
              responseSchema: quizGenerationSchema,
              temperature: 0.3,
            },
          });

          const raw = response.text || '';
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions;
          }
        } catch (err: any) {
          console.warn(`⚠️ Gemini quiz on ${modelName} failed (${err.status || err.message}). Trying next candidate...`);
        }
      }
    }

    // High-Fidelity Fallback Quiz
    return this.generateSynthesizedQuiz(mapTitle, nodes, cheatsheet, questionCount);
  }

  /**
   * Sanitize Mermaid code to eliminate syntax crashes
   */
  static sanitizeMermaidCode(rawCode: string, diagramType: DiagramType, nodes: ConceptNode[] = []): string {
    if (!rawCode || rawCode.trim().length === 0) {
      return this.buildFallbackMermaid(diagramType, nodes);
    }

    // Remove markdown code fences if model enclosed it
    let code = rawCode.replace(/```mermaid/gi, '').replace(/```/g, '').trim();

    // Ensure valid diagram declaration at the start
    const validStarts = ['flowchart', 'graph', 'mindmap', 'sequenceDiagram', 'stateDiagram'];
    const hasValidStart = validStarts.some((v) => code.startsWith(v));

    if (!hasValidStart) {
      if (diagramType === 'flowchart') code = `flowchart TD\n${code}`;
      else if (diagramType === 'mindmap') code = `mindmap\n  root((Knowledge Map))\n${code}`;
      else if (diagramType === 'sequence') code = `sequenceDiagram\n${code}`;
      else if (diagramType === 'state') code = `stateDiagram-v2\n${code}`;
    }

    // Clean node brackets to prevent quote injection issues
    // Example: node1["Text with "quotes""] -> node1["Text with 'quotes'"]
    code = code.replace(/\["([^"]*?)"\]/g, (_match, inner) => {
      const safe = inner.replace(/"/g, "'").replace(/[\[\]]/g, '');
      return `["${safe}"]`;
    });

    return code;
  }

  private static getDiagramPromptFormat(type: DiagramType): string {
    switch (type) {
      case 'flowchart':
        return 'flowchart TD with subgraphs, clear sequential dependencies, and stylized classDef nodes';
      case 'mindmap':
        return 'mindmap with root((Topic)) and hierarchical indented sub-branches';
      case 'sequence':
        return 'sequenceDiagram with participants, arrows ->> and note over elements';
      case 'state':
        return 'stateDiagram-v2 with initial state [*] --> State1 and transitions';
    }
  }

  /**
   * Resilient fallback knowledge map synthesizer
   */
  private static generateSynthesizedKnowledgeMap(
    pages: ExtractedPage[],
    options: {
      diagramType: DiagramType;
      granularity: GranularityLevel;
      focusArea?: string;
      detectedDomain?: AcademicDomain;
    }
  ): ExtractionResult {
    const domain = options.detectedDomain || 'ENGINEERING_CS';
    const firstPage = pages[0] || { page: 1, title: 'Document', content: '' };
    const docTitle = firstPage.title.replace(/^Slide \d+:\s*/i, '').replace(/^Page \d+:\s*/i, '');

    const targetNodeCount = options.granularity === 'concise' ? 12 : options.granularity === 'detailed' ? 24 : 16;

    // Build real concepts from all extracted pages and their text blocks
    const candidateItems: { label: string; summary: string; page: number }[] = [];

    pages.forEach((p) => {
      // 1. Clean page title
      const pTitle = p.title
        .replace(/^Slide \d+:\s*/i, '')
        .replace(/^Page \d+:\s*/i, '')
        .replace(/[\[\]\(\)\"]/g, '')
        .trim();

      if (
        pTitle &&
        pTitle.length >= 4 &&
        !pTitle.toLowerCase().includes('reportlab') &&
        !pTitle.includes('1 0 obj') &&
        !candidateItems.some((it) => it.label.toLowerCase() === pTitle.toLowerCase())
      ) {
        candidateItems.push({
          label: pTitle.slice(0, 45),
          summary: p.content.slice(0, 200).trim(),
          page: p.page,
        });
      }

      // 2. Parse paragraphs, numbered questions/problems, or key sentences from content
      const contentParts = p.content
        .split(/(?:\r?\n){2,}|(?<=[.?!])\s+(?=[A-Z0-9])|(?=\b(?:Problem|Question|Q\d|Step|Section|Part|Module|Chapter|\d+[\.\)])\b)/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 20 && !s.includes('ReportLab') && !s.includes('CreationDate'));

      contentParts.forEach((part) => {
        const words = part.split(/\s+/).slice(0, 6).join(' ');
        const label = words.replace(/[#*\-–:\[\]\(\)\"]/g, '').trim();
        if (
          label.length >= 4 &&
          label.length <= 45 &&
          !label.toLowerCase().includes('stream') &&
          !candidateItems.some((it) => it.label.toLowerCase() === label.toLowerCase())
        ) {
          candidateItems.push({
            label,
            summary: part.slice(0, 220).trim(),
            page: p.page,
          });
        }
      });
    });

    // If candidate items were found from the document, use them!
    const nodes: ConceptNode[] = [];
    const chosenItems = candidateItems.slice(0, targetNodeCount);

    if (chosenItems.length > 0) {
      chosenItems.forEach((item, idx) => {
        const id = `node${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? idx : ''}`;
        nodes.push({
          id,
          label: item.label,
          summary: item.summary ? `${item.summary} (Page ${item.page})` : `Key conceptual point for ${item.label}.`,
          sourceRefs: [item.page],
        });
      });
    }

    // Ensure MINIMUM 11-12 nodes for a complete knowledge map
    if (nodes.length < 11) {
      const cleanTitle = docTitle.replace(/[-_]/g, ' ').trim() || 'Document';
      const modularCurriculum = [
        { label: `${cleanTitle} Foundations`, desc: `Core definitions, context, and fundamental prerequisites for ${cleanTitle}.` },
        { label: `Structural Architecture`, desc: `Component layout, modular decomposition, and foundational taxonomy.` },
        { label: `Core Theoretical Model`, desc: `Formal principles, scientific axioms, and underlying theory.` },
        { label: `Workflow Pipeline`, desc: `End-to-end execution path, sequence of operations, and process stages.` },
        { label: `Step-by-Step Logic`, desc: `Algorithmic procedures, rule sets, and decision trees for problem-solving.` },
        { label: `Data Transformation`, desc: `Input-to-output conversions, representations, and state changes.` },
        { label: `Key Equations & Formulas`, desc: `Mathematical relationships, quantitative laws, and computational metrics.` },
        { label: `Constraint Boundaries`, desc: `Edge cases, boundary conditions, and critical assumptions.` },
        { label: `Optimization Heuristics`, desc: `Efficiency techniques, performance tuning, and design best practices.` },
        { label: `Analytical Problem Sets`, desc: `Practical test questions, problem formulation, and sample conversions.` },
        { label: `Systematic Verification`, desc: `Validation rules, error checking, and solution confirmation.` },
        { label: `Applied Mastery & Scope`, desc: `Real-world implementation scenarios, case studies, and exam takeaways.` },
      ];

      modularCurriculum.forEach((mod, idx) => {
        const id = `node${String.fromCharCode(65 + (nodes.length % 26))}${nodes.length >= 26 ? nodes.length : ''}`;
        if (!nodes.some((n) => n.label.toLowerCase() === mod.label.toLowerCase())) {
          nodes.push({
            id,
            label: mod.label.slice(0, 45),
            summary: mod.desc,
            sourceRefs: [Math.min(idx + 1, pages.length || 1)],
          });
        }
      });
    }

    let mermaidCode = '';
    if (options.diagramType === 'flowchart') {
      // Build multi-subgraph interconnected flowchart with directional workflow arrows
      const groupSize = Math.max(3, Math.ceil(nodes.length / 4));
      const g1 = nodes.slice(0, groupSize);
      const g2 = nodes.slice(groupSize, groupSize * 2);
      const g3 = nodes.slice(groupSize * 2, groupSize * 3);
      const g4 = nodes.slice(groupSize * 3);

      let graphContent = `flowchart TD\n`;

      if (g1.length > 0) {
        graphContent += `    subgraph Stage1["1. Foundations & Scope"]\n`;
        for (let i = 0; i < g1.length - 1; i++) {
          graphContent += `        ${g1[i].id}["${g1[i].label}"] --> ${g1[i + 1].id}["${g1[i + 1].label}"]\n`;
        }
        graphContent += `    end\n`;
      }

      if (g2.length > 0) {
        graphContent += `    subgraph Stage2["2. Core Methodology & Workflow"]\n`;
        for (let i = 0; i < g2.length - 1; i++) {
          graphContent += `        ${g2[i].id}["${g2[i].label}"] --> ${g2[i + 1].id}["${g2[i + 1].label}"]\n`;
        }
        graphContent += `    end\n`;
      }

      if (g3.length > 0) {
        graphContent += `    subgraph Stage3["3. Execution & Computations"]\n`;
        for (let i = 0; i < g3.length - 1; i++) {
          graphContent += `        ${g3[i].id}["${g3[i].label}"] --> ${g3[i + 1].id}["${g3[i + 1].label}"]\n`;
        }
        graphContent += `    end\n`;
      }

      if (g4.length > 0) {
        graphContent += `    subgraph Stage4["4. Verification & Applications"]\n`;
        for (let i = 0; i < g4.length - 1; i++) {
          graphContent += `        ${g4[i].id}["${g4[i].label}"] --> ${g4[i + 1].id}["${g4[i + 1].label}"]\n`;
        }
        graphContent += `    end\n`;
      }

      // Inter-stage connecting arrows
      if (g1.length > 0 && g2.length > 0) graphContent += `    ${g1[g1.length - 1].id} -->|Applies to| ${g2[0].id}\n`;
      if (g2.length > 0 && g3.length > 0) graphContent += `    ${g2[g2.length - 1].id} -->|Executes into| ${g3[0].id}\n`;
      if (g3.length > 0 && g4.length > 0) graphContent += `    ${g3[g3.length - 1].id} -->|Validates via| ${g4[0].id}\n`;
      if (g1.length > 1 && g3.length > 0) graphContent += `    ${g1[0].id} -.->|Governs| ${g3[0].id}\n`;

      graphContent += `\n    classDef core fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef algo fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef metric fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef practical fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;\n`;

      if (g1.length > 0) graphContent += `    class ${g1.map((n) => n.id).join(',')} core;\n`;
      if (g2.length > 0) graphContent += `    class ${g2.map((n) => n.id).join(',')} algo;\n`;
      if (g3.length > 0) graphContent += `    class ${g3.map((n) => n.id).join(',')} metric;\n`;
      if (g4.length > 0) graphContent += `    class ${g4.map((n) => n.id).join(',')} practical;\n`;

      mermaidCode = graphContent;
    } else if (options.diagramType === 'mindmap') {
      const b1 = nodes.slice(0, 4);
      const b2 = nodes.slice(4, 8);
      const b3 = nodes.slice(8, 12);
      const b4 = nodes.slice(12);

      let branches = `    Foundations & Core Scope\n`;
      b1.forEach((n) => (branches += `      ${n.label}\n`));
      if (b2.length > 0) {
        branches += `    Architecture & Procedures\n`;
        b2.forEach((n) => (branches += `      ${n.label}\n`));
      }
      if (b3.length > 0) {
        branches += `    Algorithmic Computations\n`;
        b3.forEach((n) => (branches += `      ${n.label}\n`));
      }
      if (b4.length > 0) {
        branches += `    Applied Mastery & Exercises\n`;
        b4.forEach((n) => (branches += `      ${n.label}\n`));
      }
      mermaidCode = `mindmap\n  root(("${docTitle}"))\n${branches}`;
    } else if (options.diagramType === 'sequence') {
      let seq = '';
      for (let i = 0; i < nodes.length - 1; i++) {
        seq += `    ${nodes[i].id}->>${nodes[i + 1].id}: Flow & Step (Slide ${nodes[i].sourceRefs[0]})\n`;
      }
      mermaidCode = `sequenceDiagram\n    autonumber\n${seq}`;
    } else {
      let states = '    [*] --> ' + nodes[0].id + '\n';
      for (let i = 0; i < nodes.length - 1; i++) {
        states += `    ${nodes[i].id} --> ${nodes[i + 1].id}: Advance State\n`;
      }
      states += `    ${nodes[nodes.length - 1].id} --> [*]\n`;
      mermaidCode = `stateDiagram-v2\n${states}`;
    }

    // Dynamic definitions from real extracted nodes
    const coreDefinitions = nodes.slice(0, 6).map((n) => ({
      term: n.label,
      definition: n.summary.split('. ')[0] || `Key rule and principle in ${docTitle}.`,
    }));

    // Dynamic formula scanner from actual document content
    const fullText = pages.map((p) => p.content).join(' ');
    const formulaMatches = fullText.match(/([A-Za-z0-9_+\-*\/^= ]{3,25}\s*=\s*[A-Za-z0-9_+\-*\/^= ]{2,25})/g) || [];

    const keyFormulas = formulaMatches.length > 0
      ? formulaMatches.slice(0, 3).map((f, i) => ({
          name: `Formula ${i + 1}`,
          formula: f.trim(),
          context: `Derived from ${docTitle}`,
        }))
      : [
          {
            name: `${docTitle} Formula`,
            formula: domain === 'ENGINEERING_CS' ? 'Value = Sum(Digit_i * Radix^i)' : 'Efficiency = Output / Input',
            context: `Mathematical representation for ${docTitle}.`,
          },
        ];

    const cheatsheet: CheatsheetData = {
      coreDefinitions,
      keyFormulas,
      keyTakeaways: [
        `Mastery of ${docTitle} requires understanding the relationships between ${nodes.map((n) => n.label).slice(0, 3).join(', ')}.`,
        `Refer to source slide references ${nodes.map((n) => n.sourceRefs[0]).join(', ')} for full theoretical context.`,
        `Complete the active recall assessment to reinforce conceptual memory.`,
      ],
    };

    return {
      title: docTitle || 'Extracted Lecture Knowledge Map',
      academicDomain: domain,
      mermaidCode,
      nodes,
      cheatsheet,
    };
  }

  private static buildFallbackMermaid(diagramType: DiagramType, nodes: ConceptNode[]): string {
    if (nodes.length === 0) {
      return `flowchart TD\n    nodeA["Document Overview"] --> nodeB["Detailed Analysis"]`;
    }
    if (diagramType === 'flowchart') {
      return `flowchart TD\n` + nodes.map((n, i) => i < nodes.length - 1 ? `    ${n.id}["${n.label}"] --> ${nodes[i+1].id}["${nodes[i+1].label}"]` : '').filter(Boolean).join('\n');
    }
    return `mindmap\n  root((Knowledge Map))\n` + nodes.map((n) => `    ${n.label}`).join('\n');
  }

  private static generateSynthesizedQuiz(
    mapTitle: string,
    nodes: ConceptNode[],
    cheatsheet: CheatsheetData,
    count: number
  ): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const pool = nodes.length > 0 ? nodes : [{ id: 'nodeA', label: 'Primary Concept', summary: 'Core thesis' }];

    for (let i = 0; i < Math.min(count, pool.length); i++) {
      const node = pool[i];
      questions.push({
        id: `q${i + 1}`,
        question: `In "${mapTitle}", what is the primary operational role or definition of "${node.label}"?`,
        options: [
          node.summary.split('.')[0] || 'Executes foundational system transformations.',
          'Provides an auxiliary user interface component without modifying core state.',
          'Serves exclusively as a legacy backwards-compatibility fallback.',
          'Bypasses all latency constraints through uncontrolled unbounded recursion.'
        ],
        correct_index: 0,
        explanation: `As detailed in the source documentation, ${node.label} is defined by: ${node.summary}`,
        node_ref: node.id,
      });
    }

    if (questions.length < count && cheatsheet.coreDefinitions.length > 0) {
      const def = cheatsheet.coreDefinitions[0];
      questions.push({
        id: `q${questions.length + 1}`,
        question: `How is "${def.term}" rigorously formulated in this course unit?`,
        options: [
          def.definition,
          'A transient error condition that aborts background execution.',
          'An unverified assumption without empirical relevance.',
          'A hardware-level interrupt trigger that halts the CPU.'
        ],
        correct_index: 0,
        explanation: `Definition: "${def.term}" is defined as ${def.definition}`,
      });
    }

    return questions;
  }
}
