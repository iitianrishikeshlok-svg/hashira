// ============================================================================
// File: server/src/controllers/documentController.ts
// Document Upload & Ingestion Controller
// ============================================================================
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ParserService } from '../services/parserService';
import { supabaseAdmin, isSupabaseConfigured, loadMemoryStore, saveMemoryStore } from '../lib/supabase';
import { AuthenticatedRequest, DEMO_USER } from '../middleware/authMiddleware';
import type { DocumentRecord, AcademicDomain } from '../../../shared/schema';

// Seed demo document so it's always ready in memory fallback
function ensureSeedData() {
  const store = loadMemoryStore();
  if (!store.documents['11111111-1111-1111-1111-111111111111']) {
    store.profiles[DEMO_USER.id] = {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      full_name: DEMO_USER.full_name,
      academic_institution: 'Stanford School of Engineering',
      degree_program: 'B.S. Computer Science',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.documents['11111111-1111-1111-1111-111111111111'] = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: DEMO_USER.id,
      title: 'Operating System Process Scheduling',
      file_name: 'Lecture04_Process_Scheduling.pptx',
      file_type: 'pptx',
      file_size: 1428500,
      storage_path: 'documents/Lecture04_Process_Scheduling.pptx',
      total_pages_or_slides: 24,
      academic_domain: 'ENGINEERING_CS',
      raw_extracted_text: [
        { page: 1, title: 'CS140: Operating Systems - Lecture 4', content: 'Overview of CPU Scheduling, Long-term vs Short-term schedulers, dispatcher role.', notes: 'Emphasize transition between user and kernel mode.' },
        { page: 4, title: 'Process State Lifecycle', content: 'Processes transition between New, Ready, Running, Waiting, and Terminated states.', notes: 'Context switch latency is pure overhead.' },
        { page: 7, title: 'Scheduling Criteria', content: 'Key metrics: CPU Utilization, Throughput, Turnaround Time, Waiting Time, Response Time.', notes: 'Goal is to minimize average waiting time and turnaround time.' },
        { page: 11, title: 'First-Come First-Served (FCFS)', content: 'Simplest non-preemptive algorithm. Suffers from Convoy Effect where small jobs wait for large CPU-bound jobs.', notes: 'Convoy effect degrades I/O device utilization.' },
        { page: 14, title: 'Round Robin (RR) Scheduling', content: 'Preemptive scheduling designed for timesharing. Allocates fixed time quantum (q = 10-100ms) per process in FIFO queue.', notes: 'If q is very large, RR degenerates to FCFS. If q is very small, context switch overhead dominates.' },
        { page: 18, title: 'Shortest Job First (SJF) & SRTF', content: 'Optimal average waiting time. Preemptive version is Shortest Remaining Time First (SRTF). Requires CPU burst prediction via exponential smoothing.', notes: 'Tau_{n+1} = alpha * t_n + (1 - alpha) * Tau_n' },
        { page: 22, title: 'Multi-Level Feedback Queue (MLFQ)', content: 'Multiple priority queues with aging and dynamically adjusted priorities based on observed CPU burst behavior.', notes: 'Prevents starvation of CPU-bound processes while prioritizing interactive tasks.' }
      ],
      created_at: new Date().toISOString(),
    };

    saveMemoryStore(store);
  }
}
ensureSeedData();

export class DocumentController {
  /**
   * Upload and process PPTX or PDF document
   */
  static async uploadDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No document file uploaded.' });
      }

      const userId = req.user?.id || DEMO_USER.id;
      const fileName = file.originalname;
      const fileExt = fileName.toLowerCase().endsWith('.pptx') ? 'pptx' : fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : null;

      if (!fileExt) {
        return res.status(400).json({ error: 'Unsupported file format. Please upload .pdf or .pptx.' });
      }

      console.log(`📄 Ingesting document: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      // Parse document
      const { pages, totalCount, detectedDomain } = await ParserService.parseDocument(
        file.buffer,
        fileExt,
        fileName
      );

      const title = (req.body.title as string) || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const academicDomain = (req.body.academicDomain as AcademicDomain) || detectedDomain;
      const docId = uuidv4();
      const storagePath = `uploads/${userId}/${docId}_${fileName}`;

      const newDoc: DocumentRecord = {
        id: docId,
        user_id: userId,
        title,
        file_name: fileName,
        file_type: fileExt,
        file_size: file.size,
        storage_path: storagePath,
        total_pages_or_slides: totalCount,
        academic_domain: academicDomain,
        raw_extracted_text: pages,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('documents')
            .insert({
              id: newDoc.id,
              user_id: newDoc.user_id,
              title: newDoc.title,
              file_name: newDoc.file_name,
              file_type: newDoc.file_type,
              file_size: newDoc.file_size,
              storage_path: newDoc.storage_path,
              total_pages_or_slides: newDoc.total_pages_or_slides,
              academic_domain: newDoc.academic_domain,
              raw_extracted_text: newDoc.raw_extracted_text,
            })
            .select()
            .single();

          if (!error && data) {
            return res.status(201).json({ document: data });
          }
          console.warn('Supabase document insert fallback:', error?.message);
        } catch (dbErr) {
          console.warn('Supabase DB error, using memory fallback:', dbErr);
        }
      }

      // Memory store fallback
      const store = loadMemoryStore();
      store.documents[newDoc.id] = newDoc;
      saveMemoryStore(store);

      return res.status(201).json({ document: newDoc });
    } catch (err: any) {
      console.error('Upload document error:', err);
      return res.status(500).json({ error: 'Failed to ingest and parse document: ' + err.message });
    }
  }

  /**
   * List all documents for the authenticated user
   */
  static async listDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || DEMO_USER.id;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('documents')
            .select('id, user_id, title, file_name, file_type, file_size, storage_path, total_pages_or_slides, academic_domain, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            return res.json({ documents: data });
          }
        } catch (dbErr) {
          console.warn('Supabase fetch error, fallback to memory store');
        }
      }

      const store = loadMemoryStore();
      const docs = Object.values(store.documents)
        .filter((d: any) => d.user_id === userId || userId === DEMO_USER.id)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return res.json({ documents: docs });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get single document with raw extracted text
   */
  static async getDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();

          if (!error && data) {
            return res.json({ document: data });
          }
        } catch {
          // fallback
        }
      }

      const store = loadMemoryStore();
      const doc = store.documents[id];
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      return res.json({ document: doc });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Delete document and cascade delete maps
   */
  static async deleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (isSupabaseConfigured) {
        try {
          await supabaseAdmin.from('documents').delete().eq('id', id);
        } catch {}
      }

      const store = loadMemoryStore();
      delete store.documents[id];

      // Remove dependent maps
      Object.keys(store.knowledge_maps).forEach((mapKey) => {
        if (store.knowledge_maps[mapKey].document_id === id) {
          delete store.knowledge_maps[mapKey];
        }
      });

      saveMemoryStore(store);
      return res.json({ success: true, message: 'Document and associated knowledge maps deleted.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Seed / Reset Sample Documents Sandbox
   */
  static async seedSampleDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      ensureSeedData();
      return res.json({ success: true, message: 'Sample academic documents ready in library.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
