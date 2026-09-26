// ============================================================================
// File: server/src/controllers/quizController.ts
// Active Recall Quiz Generation & Retrieval Controller
// ============================================================================
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../services/aiService';
import { supabaseAdmin, isSupabaseConfigured, loadMemoryStore, saveMemoryStore } from '../lib/supabase';
import { AuthenticatedRequest, DEMO_USER } from '../middleware/authMiddleware';
import { GenerateQuizSchema } from '../../../shared/validators';
import type { QuizRecord } from '../../../shared/schema';

// Seed demo quiz in memory
function ensureSeedQuiz() {
  const store = loadMemoryStore();
  const demoQuizId = '33333333-3333-3333-3333-333333333333';
  const demoMapId = '22222222-2222-2222-2222-222222222222';

  if (!store.quizzes[demoQuizId]) {
    store.quizzes[demoQuizId] = {
      id: demoQuizId,
      map_id: demoMapId,
      user_id: DEMO_USER.id,
      questions: [
        {
          id: 'q1',
          question: 'What is the primary drawback of the First-Come First-Served (FCFS) scheduling algorithm?',
          options: [
            'High context-switch overhead',
            'The Convoy Effect where short jobs wait behind CPU-bound jobs',
            'Requires prior knowledge of CPU burst duration',
            'Violates preemptive safety constraints'
          ],
          correct_index: 1,
          explanation: 'FCFS suffers from the Convoy Effect: short processes queue up behind long CPU-bound processes, lowering CPU and device utilization.',
          node_ref: 'nodeE'
        },
        {
          id: 'q2',
          question: 'In Round Robin scheduling, what happens if the time quantum (q) is chosen to be extremely large?',
          options: [
            'The system spends 90% of time in context switching',
            'The scheduling algorithm degenerates into FCFS',
            'The system achieves optimal Shortest Job First behavior',
            'Processes experience deadlock'
          ],
          correct_index: 1,
          explanation: 'If the time quantum is larger than any burst duration, each process runs to completion on its turn, behaving exactly like FCFS.',
          node_ref: 'nodeG'
        },
        {
          id: 'q3',
          question: 'Which scheduling algorithm is mathematically proven to achieve the minimal average waiting time for a given set of processes?',
          options: [
            'First-Come First-Served (FCFS)',
            'Round Robin (RR)',
            'Shortest Job First / SRTF',
            'Priority Scheduling without Aging'
          ],
          correct_index: 2,
          explanation: 'SJF/SRTF is provably optimal because scheduling shorter jobs ahead reduces the wait time of all subsequent jobs more than longer ones add.',
          node_ref: 'nodeH'
        },
        {
          id: 'q4',
          question: 'What role does the Dispatcher play in operating system CPU scheduling?',
          options: [
            'Selects which process in the ready queue to execute next',
            'Gives CPU control to the selected process by switching context and modes',
            'Compiles user source code into executable binary processes',
            'Monitors disk I/O interrupts and memory page faults'
          ],
          correct_index: 1,
          explanation: 'While the scheduler selects the process, the dispatcher actually transfers CPU control (context switch, user mode jump, program counter restore).',
          node_ref: 'nodeB'
        },
        {
          id: 'q5',
          question: 'How does Multi-Level Feedback Queue (MLFQ) prevent low-priority processes from experiencing indefinite starvation?',
          options: [
            'By using Aging to incrementally increase the priority of waiting processes',
            'By killing long-running processes after a threshold',
            'By converting all tasks to real-time priority',
            'By strictly disabling preemption on low queues'
          ],
          correct_index: 0,
          explanation: 'Aging gradually increments the priority of processes waiting in lower-tier queues so they eventually migrate up and execute.',
          node_ref: 'nodeK'
        }
      ],
      created_at: new Date().toISOString(),
    };
    saveMemoryStore(store);
  }
}
ensureSeedQuiz();

export class QuizController {
  /**
   * Generate active recall quiz for a map
   */
  static async generateQuiz(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = GenerateQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.format() });
      }

      const { mapId, questionCount } = parsed.data;
      const userId = req.user?.id || DEMO_USER.id;

      // 1. Fetch map
      let map: any = null;
      if (isSupabaseConfigured) {
        const { data, error } = await supabaseAdmin
          .from('knowledge_maps')
          .select('*')
          .eq('id', mapId)
          .single();
        if (!error && data) map = data;
      }

      if (!map) {
        const store = loadMemoryStore();
        map = store.knowledge_maps[mapId];
      }

      if (!map) {
        return res.status(404).json({ error: 'Knowledge map not found' });
      }

      console.log(`📝 Generating ${questionCount} quiz questions for map: "${map.title}"`);
      const questions = await AIService.generateQuiz(
        map.title,
        map.concept_nodes || [],
        map.cheatsheet || { coreDefinitions: [], keyFormulas: [], keyTakeaways: [] },
        questionCount
      );

      const quizId = uuidv4();
      const newQuiz: QuizRecord = {
        id: quizId,
        map_id: mapId,
        user_id: userId,
        questions,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('quizzes')
            .insert({
              id: newQuiz.id,
              map_id: newQuiz.map_id,
              user_id: newQuiz.user_id,
              questions: newQuiz.questions,
            })
            .select()
            .single();

          if (!error && data) {
            return res.status(201).json({ quiz: data });
          }
        } catch (dbErr) {
          console.warn('Supabase quiz insert error, using memory fallback');
        }
      }

      const store = loadMemoryStore();
      store.quizzes[newQuiz.id] = newQuiz;
      saveMemoryStore(store);

      return res.status(201).json({ quiz: newQuiz });
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      return res.status(500).json({ error: 'Failed to generate quiz: ' + err.message });
    }
  }

  /**
   * Get quiz for a map
   */
  static async getQuizByMapId(req: AuthenticatedRequest, res: Response) {
    try {
      const { mapId } = req.params;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin
            .from('quizzes')
            .select('*')
            .eq('map_id', mapId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            return res.json({ quiz: data });
          }
        } catch {}
      }

      const store = loadMemoryStore();
      const quiz = Object.values(store.quizzes).find((q: any) => q.map_id === mapId);
      if (!quiz) {
        return res.status(404).json({ error: 'No quiz found for this map yet.' });
      }

      return res.json({ quiz });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
