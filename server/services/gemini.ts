// ============================================================================
// File: server/services/gemini.ts
// Official Google Gen AI Integration & Workforce Augmentation Engine
// ============================================================================
import { GoogleGenAI, Type } from "@google/genai";
import { RoleDecomposeRequest, WorkspaceExecuteRequest } from "../../shared/schema";

const apiKey = process.env.GEMINI_API_KEY || "";

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is missing. Intelligent architectural fallback enabled.");
}

const ai = new GoogleGenAI({ apiKey });

const SYSTEM_PROMPT = `You are ReskillAI-Engine, a Principal Workforce Transformation & AI Augmentation Architect. Your mandate is to prevent remote worker displacement by transforming traditional execution workers into high-value AI Orchestrators.

Core Principles:
1. Augmentation Over Automation: Always frame AI as a co-processor that elevates the human from executor to director and auditor.
2. Concrete Guidance: Provide specific prompt structures, validation checklists, and quality thresholds rather than generic advice.
3. Skill Evolution: Emphasize meta-skills like critical auditing, prompt engineering, domain context injection, and output safety verification.
4. Precision & Structure: Every output must adhere strictly to the JSON response schema specified in the API request.`;

const roleDecompositionSchema = {
  type: Type.OBJECT,
  properties: {
    roleTitle: { type: Type.STRING },
    orchestratorTitle: { type: Type.STRING },
    augmentationPotentialScore: { type: Type.NUMBER },
    taskBreakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          taskName: { type: Type.STRING },
          category: { type: Type.STRING, enum: ["AUTOMATABLE", "AUGMENTABLE", "HUMAN_CORE"] },
          timeSavedEstimatePercent: { type: Type.NUMBER },
          newOrchestratorRole: { type: Type.STRING },
          recommendedTools: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["taskName", "category", "timeSavedEstimatePercent", "newOrchestratorRole"],
      },
    },
    microSkillsToMaster: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["roleTitle", "orchestratorTitle", "augmentationPotentialScore", "taskBreakdown", "microSkillsToMaster"],
};

const coExecutionSchema = {
  type: Type.OBJECT,
  properties: {
    optimizedPrompt: { type: Type.STRING },
    contextInjectionsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
    auditChecklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          checkItem: { type: Type.STRING },
          riskIfIgnored: { type: Type.STRING },
        },
        required: ["checkItem", "riskIfIgnored"],
      },
    },
    expectedTimeSavedMinutes: { type: Type.NUMBER },
    orchestrationTip: { type: Type.STRING },
  },
  required: ["optimizedPrompt", "contextInjectionsNeeded", "auditChecklist", "expectedTimeSavedMinutes"],
};

// Domain-aware fallback generator when API key is unconfigured or rate-limited
function getSmartRoleDecompositionFallback(data: RoleDecomposeRequest) {
  const title = data.roleTitle.trim();
  const titleLower = title.toLowerCase();

  let orchestratorTitle = `AI-Augmented ${title} Orchestrator`;
  let score = 76.5;

  if (titleLower.includes("writer") || titleLower.includes("content") || titleLower.includes("technical")) {
    orchestratorTitle = "AI Documentation & Knowledge Architect";
    score = 82.0;
  } else if (titleLower.includes("support") || titleLower.includes("service") || titleLower.includes("customer")) {
    orchestratorTitle = "Customer Intelligence & AI Resolution Director";
    score = 79.5;
  } else if (titleLower.includes("analyst") || titleLower.includes("data") || titleLower.includes("research")) {
    orchestratorTitle = "AI Data Synthesis & Strategic Insights Lead";
    score = 84.0;
  } else if (titleLower.includes("qa") || titleLower.includes("test") || titleLower.includes("quality")) {
    orchestratorTitle = "Automated Quality Orchestrator & Synthetic Test Director";
    score = 88.0;
  } else if (titleLower.includes("product") || titleLower.includes("project") || titleLower.includes("manager")) {
    orchestratorTitle = "Product Delivery Orchestrator & Agentic Workflow Lead";
    score = 74.0;
  }

  return {
    roleTitle: data.roleTitle,
    orchestratorTitle,
    augmentationPotentialScore: score,
    taskBreakdown: [
      {
        taskName: `Drafting and Synthesizing ${title} Deliverables`,
        category: "AUGMENTABLE",
        timeSavedEstimatePercent: 70,
        newOrchestratorRole: "Direct generative AI templates with precise intent criteria; conduct peer review on structured artifacts.",
        recommendedTools: ["Gemini 2.5 Flash", "Cursor", "Notion AI", "Custom System Prompts"],
      },
      {
        taskName: "Routine Formatting, Standardization & Boilerplate Scrubbing",
        category: "AUTOMATABLE",
        timeSavedEstimatePercent: 92,
        newOrchestratorRole: "Configure automated pipeline filters and style linting rules so zero manual hours are lost on syntax.",
        recommendedTools: ["Prettier", "Python Orchestration Scripts", "Gemini Batch API"],
      },
      {
        taskName: "Cross-Functional Alignment, Strategic Intent & Stakeholder Nuance",
        category: "HUMAN_CORE",
        timeSavedEstimatePercent: 15,
        newOrchestratorRole: "Worker exercises deep emotional intelligence, ethical discernment, and high-stakes negotiation with stakeholders.",
        recommendedTools: ["Miro Collaboration", "Antigravity IDE", "Strategic Decision Logs"],
      },
      {
        taskName: "Fact-Checking, Hallucination Prevention & Output Auditing",
        category: "AUGMENTABLE",
        timeSavedEstimatePercent: 55,
        newOrchestratorRole: "Deploy automated multi-source verification checks while maintaining final human signature sign-off.",
        recommendedTools: ["Fact-Check Scrapers", "Confidence Scoring", "Gemini Grounding"],
      },
    ],
    microSkillsToMaster: [
      "Architecting Multi-Step Chain-of-Thought Meta Prompts",
      "Injecting Ground Truth Schemas & Domain Constraints",
      "Adversarial Hallucination Auditing & Red-Teaming",
      "Agentic Workflow Orchestration & Tool Use Protocols",
      "Human-in-the-Loop Quality Assurance Sign-off",
    ],
    sourceEngine: "ReskillAI Augmentation Engine (Architectural Simulation)",
  };
}

function getSmartCoExecutionFallback(data: WorkspaceExecuteRequest) {
  const promptTemplate = `### ROLE & OBJECTIVE
You are an expert AI execution co-processor operating under the direction of a Senior Human Orchestrator.
Your goal is to execute the following specific task: "${data.taskName}".

### HUMAN STRATEGIC INTENT
"${data.humanIntent}"

### TARGET SPECIFICATIONS & CONSTRAINTS
- Target Output Requirements: ${data.targetRequirements}
- Format: Clean markdown with executive summary, granular breakdown, actionable recommendations, and explicit risk mitigation.
- Tone: Crisp, authoritative, and enterprise-grade.
- Rules: Never fabricate metrics. If an assumption is made, tag it explicitly with [ASSUMPTION].

### EXECUTION STEPS
1. Analyze the context and parse the primary objectives.
2. Structure the core deliverable to meet the target requirements: "${data.targetRequirements}".
3. Provide an executive sign-off summary ready for human validation.`;

  const simulatedOutput = `### Executive Summary: ${data.taskName}
In direct alignment with your strategic intent ("${data.humanIntent.slice(0, 80)}..."), this deliverable has been synthesized and structured for immediate orchestrator review.

#### Key Deliverables & Synthesis
- **Primary Finding / Core Section:** Aligned precisely with "${data.targetRequirements}".
- **Operational Leverage:** Eliminated 3.5 hours of manual compilation; elevated focus to strategic judgment.
- **Risk Mitigation:** All assumptions are flagged for review in Section 3.

#### Recommended Next Actions for Human Director
1. Audit the numerical assertions against internal source-of-truth logs.
2. Inject confidential organizational context prior to executive distribution.
3. Validate client-facing tone against brand guidelines.`;

  return {
    optimizedPrompt: promptTemplate,
    contextInjectionsNeeded: [
      "Proprietary dataset or internal performance logs",
      "Enterprise style guide & tone specifications",
      "Stakeholder persona and primary KPI benchmarks",
      "Historical deliverable samples for few-shot framing",
    ],
    auditChecklist: [
      {
        checkItem: "Verify factual precision: Validate that all figures, statistics, and references trace back to authentic source documents.",
        riskIfIgnored: "Severe credibility damage and potential propagation of hallucinated statistics to leadership.",
      },
      {
        checkItem: "Context Alignment: Ensure organizational confidentiality and proprietary trade secrets are shielded from external exposure.",
        riskIfIgnored: "Compliance breach or accidental leak of privileged enterprise telemetry.",
      },
      {
        checkItem: "Tone & Voice Calibration: Confirm the output reads as authoritative and polished, stripping away typical AI filler words.",
        riskIfIgnored: "Deliverable appears synthetic, generic, or detached from organizational nuance.",
      },
      {
        checkItem: "Actionability Check: Confirm every recommendation is assigned a clear owner, timeline, and measurable outcome.",
        riskIfIgnored: "Deliverable remains purely theoretical with no operational traction.",
      },
    ],
    expectedTimeSavedMinutes: 90,
    orchestrationTip: "Always review the output with an auditor's skepticism. Injecting your personal domain knowledge in paragraph 1 increases stakeholder trust by 300%.",
    simulatedOutput,
    sourceEngine: "ReskillAI Copilot Engine (Architectural Simulation)",
  };
}

export async function decomposeRole(data: RoleDecomposeRequest) {
  if (!process.env.GEMINI_API_KEY) {
    console.info("Using smart role decomposition generator (no GEMINI_API_KEY detected).");
    return getSmartRoleDecompositionFallback(data);
  }

  try {
    const promptText = `Decompose the following remote job role into daily workflows. Identify tasks ripe for AI augmentation and provide a roadmap to transform the worker into an AI Orchestrator.

[ROLE CONTEXT]
- Role Title: ${data.roleTitle}
- Primary Responsibilities: ${data.responsibilities}
- Current Pain Points / Repetitive Work: ${data.painPoints || "None provided"}

Deliver a structured breakdown according to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: roleDecompositionSchema,
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed.sourceEngine = "Google Gemini 2.5 Flash";
    return parsed;
  } catch (err: any) {
    console.error("Gemini API call failed, falling back to smart generator:", err.message);
    const fallback = getSmartRoleDecompositionFallback(data);
    fallback.sourceEngine = `ReskillAI Engine (API Fallback: ${err.message?.slice(0, 60)})`;
    return fallback;
  }
}

export async function executeCoTask(data: WorkspaceExecuteRequest) {
  if (!process.env.GEMINI_API_KEY) {
    console.info("Using smart co-execution blueprint generator (no GEMINI_API_KEY detected).");
    return getSmartCoExecutionFallback(data);
  }

  try {
    const promptText = `Co-execute the following worker task. Generate an optimized mega-prompt for the worker to direct an AI, along with quality verification checklists to audit the output.

[TASK DETAILS]
- Task Name: ${data.taskName}
- Human Strategic Intent: ${data.humanIntent}
- Target Output Requirements: ${data.targetRequirements}

Provide orchestration blueprints following the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: coExecutionSchema,
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed.sourceEngine = "Google Gemini 2.5 Flash";
    if (!parsed.simulatedOutput) {
      parsed.simulatedOutput = `[Simulated Model Output generated for "${data.taskName}"]\n\nExecutive Draft aligned with requirement: "${data.targetRequirements}".\nHuman Intent: "${data.humanIntent}".\n\nNext Step: Run the human audit checklist before final distribution.`;
    }
    return parsed;
  } catch (err: any) {
    console.error("Gemini API call failed, falling back to smart generator:", err.message);
    const fallback = getSmartCoExecutionFallback(data);
    fallback.sourceEngine = `ReskillAI Engine (API Fallback: ${err.message?.slice(0, 60)})`;
    return fallback;
  }
}
