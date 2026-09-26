// ============================================================================
// File: server/routes.ts
// Express API Router with full database integration and Gemini services
// ============================================================================
import express, { Request, Response } from "express";
import { RoleDecomposeRequestSchema, WorkspaceExecuteRequestSchema } from "../shared/schema";
import { decomposeRole, executeCoTask } from "./services/gemini";
import { db } from "./db";

export const router = express.Router();

// Worker Profile
router.get("/worker/profile", async (_req: Request, res: Response) => {
  try {
    const profile = db.getWorker();
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch worker profile" });
  }
});

// Role Decomposition
router.post("/roles/decompose", async (req: Request, res: Response) => {
  try {
    const validatedData = RoleDecomposeRequestSchema.parse(req.body);
    const result = await decomposeRole(validatedData);

    // Save generated task breakdown to DB
    const worker = db.getWorker();
    if (result.taskBreakdown && Array.isArray(result.taskBreakdown)) {
      db.saveTaskBreakdown(worker.id, result.roleTitle || validatedData.roleTitle, result.taskBreakdown);
    }

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid role decomposition request" });
  }
});

// Workspace Task Co-Execution Blueprint
router.post("/workspace/execute", async (req: Request, res: Response) => {
  try {
    const validatedData = WorkspaceExecuteRequestSchema.parse(req.body);
    const result = await executeCoTask(validatedData);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to orchestrate task execution" });
  }
});

// Save or Log a Completed Co-Execution Session with Audit Results
router.post("/workspace/log-session", async (req: Request, res: Response) => {
  try {
    const { taskName, inputIntent, generatedPrompt, aiOutput, timeSavedMinutes, auditChecklistCompleted, auditChecklistTotal } = req.body;
    if (!taskName || !inputIntent) {
      return res.status(400).json({ error: "taskName and inputIntent are required" });
    }

    const session = db.saveSession({
      taskName,
      inputIntent,
      generatedPrompt: generatedPrompt || "",
      aiOutput: aiOutput || "",
      timeSavedMinutes: Number(timeSavedMinutes) || 60,
      auditChecklistCompleted: Number(auditChecklistCompleted) || 0,
      auditChecklistTotal: Number(auditChecklistTotal) || 0,
    });

    const updatedProfile = db.getWorker();
    res.json({ session, updatedProfile });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to log co-execution session" });
  }
});

// Recent Sessions & History
router.get("/worker/sessions", async (_req: Request, res: Response) => {
  try {
    const sessions = db.getSessions();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch sessions" });
  }
});

// Recent Task Decompositions
router.get("/worker/decompositions", async (_req: Request, res: Response) => {
  try {
    const decompositions = db.getDecompositions();
    res.json(decompositions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch decompositions" });
  }
});

// System Status
router.get("/system/status", async (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  res.json({
    geminiLive: hasKey,
    model: "gemini-2.5-flash",
    mode: hasKey ? "Live Google GenAI" : "High-Fidelity Architectural Simulator",
    engineVersion: "ReskillAI Engine v2.4.0",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});
