import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { WorkerProfile, TaskBreakdownItem } from "../../shared/schema";

export interface WorkerRecord {
  id: string;
  user_id: string;
  email: string;
  current_role: string;
  augmentation_score: number;
  hours_saved_this_month: number;
  created_at: string;
}

export interface TaskDecompositionRecord {
  id: string;
  worker_id: string;
  role_title: string;
  task_name: string;
  task_category: "AUTOMATABLE" | "AUGMENTABLE" | "HUMAN_CORE";
  automation_potential: number;
  recommended_strategy: string;
  recommended_tools: string[];
  created_at: string;
}

export interface CoExecutionSessionRecord {
  id: string;
  worker_id: string;
  task_id?: string;
  task_name: string;
  input_intent: string;
  generated_prompt: string;
  ai_output: string;
  human_refinements?: string;
  audit_checklist_completed: number;
  audit_checklist_total: number;
  time_saved_minutes: number;
  created_at: string;
}

interface DatabaseState {
  workers: WorkerRecord[];
  task_decompositions: TaskDecompositionRecord[];
  co_execution_sessions: CoExecutionSessionRecord[];
}

const DATA_FILE = path.resolve(process.cwd(), "server/db/store.json");

class DatabaseService {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Could not read db store, initializing fresh state:", e);
    }

    const defaultWorker: WorkerRecord = {
      id: "9f381f9a-8e2b-42ea-a4e6-8968d87532d1",
      user_id: "default_worker",
      email: "worker@remote-first.co",
      current_role: "Remote Senior Technical Writer",
      augmentation_score: 78.5,
      hours_saved_this_month: 34,
      created_at: new Date().toISOString(),
    };

    const initial: DatabaseState = {
      workers: [defaultWorker],
      task_decompositions: [
        {
          id: uuidv4(),
          worker_id: defaultWorker.id,
          role_title: defaultWorker.current_role,
          task_name: "API Reference Documentation Maintenance",
          task_category: "AUGMENTABLE",
          automation_potential: 65.0,
          recommended_strategy: "Use OpenAPI diff analyzer with Gemini 2.5 Flash to synthesize breaking change logs.",
          recommended_tools: ["Gemini 2.5 Flash", "Swagger Parser", "GitHub Actions"],
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: uuidv4(),
          worker_id: defaultWorker.id,
          role_title: defaultWorker.current_role,
          task_name: "Format Conversion & Markdown Linting",
          task_category: "AUTOMATABLE",
          automation_potential: 90.0,
          recommended_strategy: "Automated pre-commit LLM style transformer to reformat raw engineering notes.",
          recommended_tools: ["Vale Linter", "Prettier", "Custom Script"],
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: uuidv4(),
          worker_id: defaultWorker.id,
          role_title: defaultWorker.current_role,
          task_name: "Developer Information Architecture & User Empathy Review",
          task_category: "HUMAN_CORE",
          automation_potential: 20.0,
          recommended_strategy: "Human orchestrator retains total design authority over reader journey & conceptual clarity.",
          recommended_tools: ["Miro", "User Interviews", "Antigravity IDE"],
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
      ],
      co_execution_sessions: [
        {
          id: uuidv4(),
          worker_id: defaultWorker.id,
          task_name: "Q3 Release Changelog Synthesis",
          input_intent: "Condense 42 merged PRs into a clean, stakeholder-ready release summary highlighting breaking changes.",
          generated_prompt: "Act as a Lead Developer Relations Engineer. Synthesize the provided git commit list into 3 sections...",
          ai_output: "### Release 3.4.0 Highlights\n- **Breaking:** Authentication token format upgraded to JWT v2.\n- **New:** Co-execution agent endpoints added.\n- **Fixes:** 14 minor stability patches.",
          audit_checklist_completed: 4,
          audit_checklist_total: 4,
          time_saved_minutes: 120,
          created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        }
      ],
    };

    this.saveState(initial);
    return initial;
  }

  private saveState(state = this.state) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to persist db store:", e);
    }
  }

  getWorker(userId = "default_worker"): WorkerProfile {
    const worker = this.state.workers.find((w) => w.user_id === userId) || this.state.workers[0];
    return {
      id: worker.id,
      userId: worker.user_id,
      email: worker.email,
      currentRole: worker.current_role,
      augmentationScore: Number(worker.augmentation_score),
      hoursSavedThisMonth: Number(worker.hours_saved_this_month),
      completedTasksCount: this.state.co_execution_sessions.filter((s) => s.worker_id === worker.id).length,
    };
  }

  updateWorkerScore(userId: string, newScoreDelta: number, hoursDelta: number): WorkerProfile {
    const worker = this.state.workers.find((w) => w.user_id === userId) || this.state.workers[0];
    worker.augmentation_score = Math.min(99.5, Math.max(10, +(worker.augmentation_score + newScoreDelta).toFixed(1)));
    worker.hours_saved_this_month = Math.max(0, +(worker.hours_saved_this_month + hoursDelta).toFixed(1));
    this.saveState();
    return this.getWorker(userId);
  }

  saveTaskBreakdown(
    workerId: string,
    roleTitle: string,
    tasks: TaskBreakdownItem[]
  ): TaskDecompositionRecord[] {
    const records: TaskDecompositionRecord[] = tasks.map((t) => ({
      id: uuidv4(),
      worker_id: workerId,
      role_title: roleTitle,
      task_name: t.taskName,
      task_category: t.category,
      automation_potential: t.timeSavedEstimatePercent,
      recommended_strategy: t.newOrchestratorRole,
      recommended_tools: t.recommendedTools || ["Gemini 2.5 Flash"],
      created_at: new Date().toISOString(),
    }));

    this.state.task_decompositions.unshift(...records);
    // Keep max 50 recent
    if (this.state.task_decompositions.length > 50) {
      this.state.task_decompositions = this.state.task_decompositions.slice(0, 50);
    }
    this.saveState();
    return records;
  }

  saveSession(session: {
    workerId?: string;
    taskName: string;
    inputIntent: string;
    generatedPrompt: string;
    aiOutput: string;
    timeSavedMinutes: number;
    auditChecklistCompleted?: number;
    auditChecklistTotal?: number;
  }): CoExecutionSessionRecord {
    const worker = this.state.workers[0];
    const rec: CoExecutionSessionRecord = {
      id: uuidv4(),
      worker_id: session.workerId || worker.id,
      task_name: session.taskName,
      input_intent: session.inputIntent,
      generated_prompt: session.generatedPrompt,
      ai_output: session.aiOutput,
      audit_checklist_completed: session.auditChecklistCompleted || 0,
      audit_checklist_total: session.auditChecklistTotal || 0,
      time_saved_minutes: session.timeSavedMinutes,
      created_at: new Date().toISOString(),
    };

    this.state.co_execution_sessions.unshift(rec);
    if (this.state.co_execution_sessions.length > 50) {
      this.state.co_execution_sessions = this.state.co_execution_sessions.slice(0, 50);
    }

    // Update worker stats
    const hours = +(session.timeSavedMinutes / 60).toFixed(1);
    worker.hours_saved_this_month = +(worker.hours_saved_this_month + hours).toFixed(1);
    worker.augmentation_score = Math.min(99.0, +(worker.augmentation_score + 0.4).toFixed(1));

    this.saveState();
    return rec;
  }

  getSessions(workerId?: string): CoExecutionSessionRecord[] {
    const targetId = workerId || this.state.workers[0].id;
    return this.state.co_execution_sessions.filter((s) => s.worker_id === targetId);
  }

  getDecompositions(workerId?: string): TaskDecompositionRecord[] {
    const targetId = workerId || this.state.workers[0].id;
    return this.state.task_decompositions.filter((s) => s.worker_id === targetId);
  }
}

export const db = new DatabaseService();
