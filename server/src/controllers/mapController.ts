// ============================================================================
// File: server/src/controllers/mapController.ts
// Knowledge Map Generation, Retrieval & Sharing Controller
// ============================================================================
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../services/aiService';
import { supabaseAdmin, isSupabaseConfigured, loadMemoryStore, saveMemoryStore } from '../lib/supabase';
import { AuthenticatedRequest, DEMO_USER } from '../middleware/authMiddleware';
import { GenerateMapSchema, MapVisibilitySchema } from '../../../shared/validators';
import type { KnowledgeMapRecord, DiagramType, GranularityLevel } from '../../../shared/schema';

// Seed demo map in memory fallback
function ensureSeedMap() {
  const store = loadMemoryStore();
  const demoMapId = '22222222-2222-2222-2222-222222222222';
  const demoDocId = '11111111-1111-1111-1111-111111111111';

  if (!store.knowledge_maps[demoMapId]) {
    store.knowledge_maps[demoMapId] = {
      id: demoMapId,
      document_id: demoDocId,
      user_id: DEMO_USER.id,
      title: 'CPU Scheduling Algorithms & Dynamics',
      diagram_type: 'flowchart',
      mermaid_code: `flowchart TD
    subgraph SchedOverview["1. CPU Scheduler Core"]
        nodeA["Process State Transitions"] --> nodeB["Scheduler Dispatcher"]
        nodeB --> nodeC["Evaluation Metrics"]
    end
    subgraph NonPreempt["2. Non-Preemptive Strategies"]
        nodeC --> nodeD["FCFS Scheduling"]
        nodeD -.->|Suffers From| nodeE["Convoy Effect"]
    end
    subgraph Preempt["3. Preemptive Strategies"]
        nodeC --> nodeF["Round Robin RR"]
        nodeF --> nodeG["Time Quantum Tradeoff"]
        nodeC --> nodeH["SRTF Scheduling"]
        nodeH --> nodeI["Exponential Smoothing Burst"]
    end
    subgraph Advanced["4. Hybrid & Multi-Queue"]
        nodeF --> nodeJ["MLFQ Multi-Level Feedback"]
        nodeH --> nodeJ
        nodeJ --> nodeK["Aging Prevents Starvation"]
    end

    classDef core fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef algo fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef metric fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef warning fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;

    class nodeA,nodeB core;
    class nodeD,nodeF,nodeH,nodeJ algo;
    class nodeC,nodeI,nodeK metric;
    class nodeE,nodeG warning;`,
      concept_nodes: [
        { id: 'nodeA', label: 'Process State Transitions', summary: 'Processes cycle through New, Ready, Running, Waiting, and Terminated states managed by the OS kernel.', sourceRefs: [1, 4] },
        { id: 'nodeB', label: 'Scheduler Dispatcher', summary: 'Module giving control of CPU to process selected by short-term scheduler, handling context switching and mode switches.', sourceRefs: [1, 4] },
        { id: 'nodeC', label: 'Evaluation Metrics', summary: 'CPU utilization, throughput, turnaround time, waiting time, and response time used to score scheduling efficiency.', sourceRefs: [7] },
        { id: 'nodeD', label: 'FCFS Scheduling', summary: 'First-Come First-Served non-preemptive algorithm executing jobs in exact arrival order.', sourceRefs: [11] },
        { id: 'nodeE', label: 'Convoy Effect', summary: 'Short interactive processes stuck waiting behind a massive CPU-bound process in FCFS.', sourceRefs: [11] },
        { id: 'nodeF', label: 'Round Robin RR', summary: 'Preemptive timesharing scheduler with cyclic FIFO queue and allocated fixed time quantum q.', sourceRefs: [14] },
        { id: 'nodeG', label: 'Time Quantum Tradeoff', summary: 'Too large quantum acts like FCFS; too small quantum causes excessive context switch overhead.', sourceRefs: [14] },
        { id: 'nodeH', label: 'SRTF Scheduling', summary: 'Shortest Remaining Time First preemptive algorithm achieving mathematically minimal average wait time.', sourceRefs: [18] },
        { id: 'nodeI', label: 'Exponential Smoothing Burst', summary: 'Prediction heuristic calculating future CPU burst duration based on historical bursts.', sourceRefs: [18] },
        { id: 'nodeJ', label: 'MLFQ Multi-Level Feedback', summary: 'Adaptive queue hierarchy separating processes based on CPU burst characteristics.', sourceRefs: [22] },
        { id: 'nodeK', label: 'Aging Prevents Starvation', summary: 'Technique gradually increasing priority of processes waiting in lower queues.', sourceRefs: [22] }
      ],
      cheatsheet: {
        coreDefinitions: [
          { term: 'Turnaround Time', definition: 'Interval from submission of process to its full completion (Wait time + Execution time).' },
          { term: 'Time Quantum (q)', definition: 'Fixed slice of CPU execution time allocated to a process in Round Robin scheduling (typically 10-100 ms).' },
          { term: 'Convoy Effect', definition: 'Pathological condition in FCFS where multiple short I/O bound jobs wait behind a single CPU-bound monopolizer.' },
          { term: 'Aging', definition: 'Mechanism of gradually increasing priority of processes that wait in the system for a long time to prevent indefinite starvation.' }
        ],
        keyFormulas: [
          { name: 'Exponential Smoothing (Burst Prediction)', formula: 'tau_{n+1} = alpha * t_n + (1 - alpha) * tau_n', context: 'Estimates next CPU burst length where alpha in [0,1] weights recent history.' },
          { name: 'Turnaround Time Calculation', formula: 'Turnaround = CompletionTime - ArrivalTime', context: 'Fundamental metric evaluated across all benchmark sets.' },
          { name: 'Waiting Time Calculation', formula: 'WaitingTime = TurnaroundTime - BurstTime', context: 'Time spent by process idling in the ready queue.' }
        ],
        keyTakeaways: [
          'SJF/SRTF is provably optimal for minimizing average waiting time, but requires burst length estimation.',
          'Round Robin performance is critically dependent on quantum size: aim for 80% of bursts shorter than quantum.',
          'MLFQ achieves adaptive scheduling without prior knowledge of process burst times.'
        ]
      },
      is_public: true,
      public_slug: 'os-process-scheduling-demo',
      granularity: 'standard',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveMemoryStore(store);
  }
}
ensureSeedMap();

export class MapController {
  /**
   * Generate new Knowledge Map via AI Pipeline
   */
  static async generateMap(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = GenerateMapSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.format() });
      }

      const { documentId, diagramType, granularity, focusArea } = parsed.data;
      const userId = req.user?.id || DEMO_USER.id;

      // 1. Fetch document
      let doc: any = null;
      if (isSupabaseConfigured) {
        const { data, error } = await supabaseAdmin
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();
        if (!error && data) doc = data;
      }

      if (!doc) {
        const store = loadMemoryStore();
        doc = store.documents[documentId];
      }

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // 2. Invoke AIService for extraction
      console.log(`🚀 Generating ${diagramType} knowledge map for document: "${doc.title}"`);
      const extraction = await AIService.extractKnowledgeMap(doc.raw_extracted_text || [], {
        diagramType: diagramType as DiagramType,
        granularity: granularity as GranularityLevel,
        focusArea,
        detectedDomain: doc.academic_domain,
      });

      const mapId = uuidv4();
      const slug = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${mapId.slice(0, 6)}`;

      const newMap: KnowledgeMapRecord = {
        id: mapId,
        document_id: documentId,
        user_id: userId,
        title: extraction.title || doc.title,
        diagram_type: diagramType as DiagramType,
        mermaid_code: extraction.mermaidCode,
        concept_nodes: extraction.nodes,
        cheatsheet: extraction.cheatsheet,
        is_public: false,
        public_slug: slug,
        granularity: granularity as GranularityLevel,
        focus_area: focusArea || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 3. Save to database or memory store
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('knowledge_maps')
            .insert({
              id: newMap.id,
              document_id: newMap.document_id,
              user_id: newMap.user_id,
              title: newMap.title,
              diagram_type: newMap.diagram_type,
              mermaid_code: newMap.mermaid_code,
              concept_nodes: newMap.concept_nodes,
              cheatsheet: newMap.cheatsheet,
              is_public: newMap.is_public,
              public_slug: newMap.public_slug,
              granularity: newMap.granularity,
              focus_area: newMap.focus_area,
            })
            .select()
            .single();

          if (!error && data) {
            return res.status(201).json({ map: { ...data, document: doc } });
          }
        } catch (dbErr) {
          console.warn('Supabase map insert error, using memory fallback:', dbErr);
        }
      }

      const store = loadMemoryStore();
      store.knowledge_maps[newMap.id] = newMap;
      saveMemoryStore(store);

      return res.status(201).json({ map: { ...newMap, document: doc } });
    } catch (err: any) {
      console.error('Generate map error:', err);
      return res.status(500).json({ error: 'Failed to generate knowledge map: ' + err.message });
    }
  }

  /**
   * List maps for user
   */
  static async listMaps(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || DEMO_USER.id;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('knowledge_maps')
            .select(`
              id, document_id, user_id, title, diagram_type, mermaid_code,
              concept_nodes, cheatsheet, is_public, public_slug, granularity, focus_area,
              created_at, updated_at,
              document:documents(id, title, file_name, file_type, total_pages_or_slides, academic_domain)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            return res.json({ maps: data });
          }
        } catch (dbErr) {
          console.warn('Supabase list maps fallback');
        }
      }

      const store = loadMemoryStore();
      const maps = Object.values(store.knowledge_maps)
        .filter((m: any) => m.user_id === userId || userId === DEMO_USER.id)
        .map((m: any) => ({
          ...m,
          document: store.documents[m.document_id] || null,
        }))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return res.json({ maps });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get single map by ID with full source document
   */
  static async getMap(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('knowledge_maps')
            .select(`
              *,
              document:documents(*)
            `)
            .eq('id', id)
            .single();

          if (!error && data) {
            return res.json({ map: data });
          }
        } catch {}
      }

      const store = loadMemoryStore();
      const map = store.knowledge_maps[id];
      if (!map) {
        return res.status(404).json({ error: 'Knowledge map not found.' });
      }

      const doc = store.documents[map.document_id] || null;
      return res.json({ map: { ...map, document: doc } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Public View route (read-only by slug)
   */
  static async getPublicMap(req: AuthenticatedRequest, res: Response) {
    try {
      const { publicSlug } = req.params;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('knowledge_maps')
            .select(`
              *,
              document:documents(*)
            `)
            .eq('public_slug', publicSlug)
            .eq('is_public', true)
            .single();

          if (!error && data) {
            return res.json({ map: data });
          }
        } catch {}
      }

      const store = loadMemoryStore();
      const map = Object.values(store.knowledge_maps).find(
        (m: any) => m.public_slug === publicSlug && m.is_public
      ) as any;

      if (!map) {
        return res.status(404).json({ error: 'Public knowledge map not found or sharing is disabled.' });
      }

      const doc = store.documents[map.document_id] || null;
      return res.json({ map: { ...map, document: doc } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Toggle public sharing visibility
   */
  static async toggleVisibility(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const parsed = MapVisibilitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid visibility payload.' });
      }

      const { isPublic } = parsed.data;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('knowledge_maps')
            .update({ is_public: isPublic, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (!error && data) {
            return res.json({ map: data });
          }
        } catch {}
      }

      const store = loadMemoryStore();
      if (!store.knowledge_maps[id]) {
        return res.status(404).json({ error: 'Knowledge map not found.' });
      }

      store.knowledge_maps[id].is_public = isPublic;
      store.knowledge_maps[id].updated_at = new Date().toISOString();
      saveMemoryStore(store);

      return res.json({ map: store.knowledge_maps[id] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
