-- ============================================================================
-- VisualMind AI - Automated Visual Knowledge Extraction Engine
-- Migration: 001_initial_schema.sql
-- Compatible with Supabase Cloud PostgreSQL
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    academic_institution TEXT DEFAULT 'University / Engineering College',
    degree_program TEXT DEFAULT 'Computer Science / Engineering',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'pptx')),
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    total_pages_or_slides INTEGER DEFAULT 0,
    academic_domain TEXT DEFAULT 'GENERAL_ACADEMIC',
    raw_extracted_text JSONB DEFAULT '[]'::jsonb, -- Array of { page: number, title: string, content: string, notes?: string }
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. KNOWLEDGE MAPS TABLE
CREATE TABLE IF NOT EXISTS public.knowledge_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    diagram_type TEXT NOT NULL CHECK (diagram_type IN ('flowchart', 'mindmap', 'sequence', 'state')),
    mermaid_code TEXT NOT NULL,
    concept_nodes JSONB NOT NULL, -- Array of { id: string, label: string, summary: string, source_refs: number[] }
    cheatsheet JSONB NOT NULL,    -- { coreDefinitions: [], keyFormulas: [], keyTakeaways: [] }
    is_public BOOLEAN DEFAULT FALSE,
    public_slug TEXT UNIQUE,
    granularity TEXT DEFAULT 'standard',
    focus_area TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID NOT NULL REFERENCES public.knowledge_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    questions JSONB NOT NULL, -- Array of { id: string, question: string, options: string[], correct_index: number, explanation: string, node_ref: string }
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_maps_doc ON public.knowledge_maps(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_maps_user ON public.knowledge_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_maps_slug ON public.knowledge_maps(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_map ON public.quizzes(map_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents Policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Knowledge Maps Policies
DROP POLICY IF EXISTS "Users can view own maps" ON public.knowledge_maps;
CREATE POLICY "Users can view own maps" ON public.knowledge_maps FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Users can insert own maps" ON public.knowledge_maps;
CREATE POLICY "Users can insert own maps" ON public.knowledge_maps FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own maps" ON public.knowledge_maps;
CREATE POLICY "Users can update own maps" ON public.knowledge_maps FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own maps" ON public.knowledge_maps;
CREATE POLICY "Users can delete own maps" ON public.knowledge_maps FOR DELETE USING (auth.uid() = user_id);

-- Quizzes Policies
DROP POLICY IF EXISTS "Users can view own quizzes" ON public.quizzes;
CREATE POLICY "Users can view own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quizzes" ON public.quizzes;
CREATE POLICY "Users can insert own quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA FOR DEMO & TESTING
-- ============================================================================
DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
    demo_doc_id UUID := '11111111-1111-1111-1111-111111111111';
    demo_map_id UUID := '22222222-2222-2222-2222-222222222222';
    demo_quiz_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
    -- Insert Demo Profile
    INSERT INTO public.profiles (id, email, full_name, academic_institution, degree_program)
    VALUES (
        demo_user_id,
        'student@visualmind.ai',
        'Alex Chen',
        'Stanford School of Engineering',
        'B.S. Computer Science'
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Demo Document: OS Process Scheduling
    INSERT INTO public.documents (
        id, user_id, title, file_name, file_type, file_size, storage_path, total_pages_or_slides, academic_domain, raw_extracted_text
    ) VALUES (
        demo_doc_id,
        demo_user_id,
        'Operating System Process Scheduling',
        'Lecture04_Process_Scheduling.pptx',
        'pptx',
        1428500,
        'documents/Lecture04_Process_Scheduling.pptx',
        24,
        'ENGINEERING_CS',
        '[
            {"page": 1, "title": "CS140: Operating Systems - Lecture 4", "content": "Overview of CPU Scheduling, Long-term vs Short-term schedulers, dispatcher role.", "notes": "Emphasize transition between user and kernel mode."},
            {"page": 4, "title": "Process State Lifecycle", "content": "Processes transition between New, Ready, Running, Waiting, and Terminated states.", "notes": "Context switch latency is pure overhead."},
            {"page": 7, "title": "Scheduling Criteria", "content": "Key metrics: CPU Utilization, Throughput, Turnaround Time, Waiting Time, Response Time.", "notes": "Goal is to minimize average waiting time and turnaround time."},
            {"page": 11, "title": "First-Come First-Served (FCFS)", "content": "Simplest non-preemptive algorithm. Suffers from Convoy Effect where small jobs wait for large CPU-bound jobs.", "notes": "Convoy effect degrades I/O device utilization."},
            {"page": 14, "title": "Round Robin (RR) Scheduling", "content": "Preemptive scheduling designed for timesharing. Allocates fixed time quantum (q = 10-100ms) per process in FIFO queue.", "notes": "If q is very large, RR degenerates to FCFS. If q is very small, context switch overhead dominates."},
            {"page": 18, "title": "Shortest Job First (SJF) & SRTF", "content": "Optimal average waiting time. Preemptive version is Shortest Remaining Time First (SRTF). Requires CPU burst prediction via exponential smoothing.", "notes": "Tau_{n+1} = alpha * t_n + (1 - alpha) * Tau_n"},
            {"page": 22, "title": "Multi-Level Feedback Queue (MLFQ)", "content": "Multiple priority queues with aging and dynamically adjusted priorities based on observed CPU burst behavior.", "notes": "Prevents starvation of CPU-bound processes while prioritizing interactive tasks."}
        ]'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Demo Knowledge Map
    INSERT INTO public.knowledge_maps (
        id, document_id, user_id, title, diagram_type, mermaid_code, concept_nodes, cheatsheet, is_public, public_slug, granularity
    ) VALUES (
        demo_map_id,
        demo_doc_id,
        demo_user_id,
        'CPU Scheduling Algorithms & Dynamics',
        'flowchart',
        'flowchart TD
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
    class nodeE,nodeG warning;',
        '[
            {"id": "nodeA", "label": "Process State Transitions", "summary": "Processes cycle through New, Ready, Running, Waiting, and Terminated states managed by the OS kernel.", "sourceRefs": [1, 4]},
            {"id": "nodeB", "label": "Scheduler Dispatcher", "summary": "Module giving control of CPU to process selected by short-term scheduler, handling context switching and mode switches.", "sourceRefs": [1, 4]},
            {"id": "nodeC", "label": "Evaluation Metrics", "summary": "CPU utilization, throughput, turnaround time, waiting time, and response time used to score scheduling efficiency.", "sourceRefs": [7]},
            {"id": "nodeD", "label": "FCFS Scheduling", "summary": "First-Come First-Served non-preemptive algorithm executing jobs in exact arrival order.", "sourceRefs": [11]},
            {"id": "nodeE", "label": "Convoy Effect", "summary": "Short interactive processes stuck waiting behind a massive CPU-bound process in FCFS.", "sourceRefs": [11]},
            {"id": "nodeF", "label": "Round Robin RR", "summary": "Preemptive timesharing scheduler with cyclic FIFO queue and allocated fixed time quantum q.", "sourceRefs": [14]},
            {"id": "nodeG", "label": "Time Quantum Tradeoff", "summary": "Too large quantum acts like FCFS; too small quantum causes excessive context switch overhead.", "sourceRefs": [14]},
            {"id": "nodeH", "label": "SRTF Scheduling", "summary": "Shortest Remaining Time First preemptive algorithm achieving mathematically minimal average wait time.", "sourceRefs": [18]},
            {"id": "nodeI", "label": "Exponential Smoothing Burst", "summary": "Prediction heuristic calculating future CPU burst duration based on historical bursts.", "sourceRefs": [18]},
            {"id": "nodeJ", "label": "MLFQ Multi-Level Feedback", "summary": "Adaptive queue hierarchy separating processes based on CPU burst characteristics.", "sourceRefs": [22]},
            {"id": "nodeK", "label": "Aging Prevents Starvation", "summary": "Technique gradually increasing priority of processes waiting in lower queues.", "sourceRefs": [22]}
        ]'::jsonb,
        '{
            "coreDefinitions": [
                {"term": "Turnaround Time", "definition": "Interval from submission of process to its full completion (Wait time + Execution time)."},
                {"term": "Time Quantum (q)", "definition": "Fixed slice of CPU execution time allocated to a process in Round Robin scheduling (typically 10-100 ms)."},
                {"term": "Convoy Effect", "definition": "Pathological condition in FCFS where multiple short I/O bound jobs wait behind a single CPU-bound monopolizer."},
                {"term": "Aging", "definition": "Mechanism of gradually increasing priority of processes that wait in the system for a long time to prevent indefinite starvation."}
            ],
            "keyFormulas": [
                {"name": "Exponential Smoothing (Burst Prediction)", "formula": "tau_{n+1} = alpha * t_n + (1 - alpha) * tau_n", "context": "Estimates next CPU burst length where alpha in [0,1] weights recent history."},
                {"name": "Turnaround Time Calculation", "formula": "Turnaround = CompletionTime - ArrivalTime", "context": "Fundamental metric evaluated across all benchmark sets."},
                {"name": "Waiting Time Calculation", "formula": "WaitingTime = TurnaroundTime - BurstTime", "context": "Time spent by process idling in the ready queue."}
            ],
            "keyTakeaways": [
                "SJF/SRTF is provably optimal for minimizing average waiting time, but requires burst length estimation.",
                "Round Robin performance is critically dependent on quantum size: aim for 80% of bursts shorter than quantum.",
                "MLFQ achieves adaptive scheduling without prior knowledge of process burst times."
            ]
        }'::jsonb,
        TRUE,
        'os-process-scheduling-demo',
        'standard'
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Demo Quiz
    INSERT INTO public.quizzes (
        id, map_id, user_id, questions
    ) VALUES (
        demo_quiz_id,
        demo_map_id,
        demo_user_id,
        '[
            {
                "id": "q1",
                "question": "What is the primary drawback of the First-Come First-Served (FCFS) scheduling algorithm?",
                "options": [
                    "High context-switch overhead",
                    "The Convoy Effect where short jobs wait behind CPU-bound jobs",
                    "Requires prior knowledge of CPU burst duration",
                    "Violates preemptive safety constraints"
                ],
                "correct_index": 1,
                "explanation": "FCFS suffers from the Convoy Effect: short processes queue up behind long CPU-bound processes, lowering CPU and device utilization.",
                "node_ref": "nodeE"
            },
            {
                "id": "q2",
                "question": "In Round Robin scheduling, what happens if the time quantum (q) is chosen to be extremely large?",
                "options": [
                    "The system spends 90% of time in context switching",
                    "The scheduling algorithm degenerates into FCFS",
                    "The system achieves optimal Shortest Job First behavior",
                    "Processes experience deadlock"
                ],
                "correct_index": 1,
                "explanation": "If the time quantum is larger than any burst duration, each process runs to completion on its turn, behaving exactly like FCFS.",
                "node_ref": "nodeG"
            },
            {
                "id": "q3",
                "question": "Which scheduling algorithm is mathematically proven to achieve the minimal average waiting time for a given set of processes?",
                "options": [
                    "First-Come First-Served (FCFS)",
                    "Round Robin (RR)",
                    "Shortest Job First / SRTF",
                    "Priority Scheduling without Aging"
                ],
                "correct_index": 2,
                "explanation": "SJF/SRTF is provably optimal because scheduling shorter jobs ahead reduces the wait time of all subsequent jobs more than longer ones add.",
                "node_ref": "nodeH"
            },
            {
                "id": "q4",
                "question": "What role does the Dispatcher play in operating system CPU scheduling?",
                "options": [
                    "Selects which process in the ready queue to execute next",
                    "Gives CPU control to the selected process by switching context and modes",
                    "Compiles user source code into executable binary processes",
                    "Monitors disk I/O interrupts and memory page faults"
                ],
                "correct_index": 1,
                "explanation": "While the scheduler selects the process, the dispatcher actually transfers CPU control (context switch, user mode jump, program counter restore).",
                "node_ref": "nodeB"
            },
            {
                "id": "q5",
                "question": "How does Multi-Level Feedback Queue (MLFQ) prevent low-priority processes from experiencing indefinite starvation?",
                "options": [
                    "By using Aging to incrementally increase the priority of waiting processes",
                    "By killing long-running processes after a threshold",
                    "By converting all tasks to real-time priority",
                    "By strictly disabling preemption on low queues"
                ],
                "correct_index": 0,
                "explanation": "Aging gradually increments the priority of processes waiting in lower-tier queues so they eventually migrate up and execute.",
                "node_ref": "nodeK"
            }
        ]'::jsonb
    ) ON CONFLICT (id) DO NOTHING;
END $$;
