// server/index.ts
import dotenv3 from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path2 from "path";
import fs2 from "fs";

// server/src/routes/api.ts
import { Router } from "express";
import multer from "multer";

// server/src/controllers/documentController.ts
import { v4 as uuidv4 } from "uuid";

// server/src/services/parserService.ts
import JSZip from "jszip";
import zlib from "zlib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
var ParserService = class _ParserService {
  /**
   * Sanitize text extracted from PDFs to eliminate binary noise, CID garbage, and control tokens
   */
  static sanitizeExtractedText(raw) {
    if (!raw) return "";
    return raw.replace(/%PDF-[\d\.]+/gi, "").replace(/\/StructParent\s+\d+>>/gi, "").replace(/<<[\s\S]*?>>/gi, "").replace(/\b\d+\s+\d+\s+obj\b[\s\S]*?\bendobj\b/gi, "").replace(/\bstream[\s\S]*?endstream\b/gi, "").replace(/xref[\s\S]*?trailer/gi, "").replace(/\b(?:ReportLab|Producer|CreationDate|ModDate|Linearized)\b[^\n]*/gi, "").replace(/\[\s*(?:[A-Za-z0-9&%]\s+){6,}[A-Za-z0-9&%]?\s*\]/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  /**
   * Parse either PDF or PPTX buffer into structured ExtractedPage array
   */
  static async parseDocument(buffer, fileType, fileName) {
    if (fileType === "pptx") {
      return this.parsePptx(buffer, fileName);
    } else {
      return this.parsePdf(buffer, fileName);
    }
  }
  /**
   * Extract slides, titles, body content, and speaker notes from PPTX via JSZip
   */
  static async parsePptx(buffer, fileName) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = [];
      const notesFiles = /* @__PURE__ */ new Map();
      zip.forEach((relativePath) => {
        const slideMatch = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
        if (slideMatch) {
          slideFiles.push({ num: parseInt(slideMatch[1], 10), path: relativePath });
        }
        const noteMatch = relativePath.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i);
        if (noteMatch) {
          notesFiles.set(parseInt(noteMatch[1], 10), relativePath);
        }
      });
      slideFiles.sort((a, b) => a.num - b.num);
      const pages = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const slide = slideFiles[i];
        const slideXml = await zip.file(slide.path)?.async("text");
        if (!slideXml) continue;
        const textTokens = this.extractXmlText(slideXml);
        const title = textTokens.length > 0 && textTokens[0].length < 100 ? textTokens[0] : `Slide ${slide.num}: ${fileName.replace(/\.pptx$/i, "")}`;
        const bodyLines = textTokens.length > 1 ? textTokens.slice(1) : textTokens;
        const content = bodyLines.join(" \n ").trim() || `Key concepts and diagrams for slide ${slide.num}.`;
        let notes = void 0;
        const notePath = notesFiles.get(slide.num);
        if (notePath) {
          const noteXml = await zip.file(notePath)?.async("text");
          if (noteXml) {
            const noteTokens = this.extractXmlText(noteXml);
            const actualNotes = noteTokens.filter((t) => !/^\d+$/.test(t.trim()));
            if (actualNotes.length > 0) {
              notes = actualNotes.join(" \n ");
            }
          }
        }
        pages.push({
          page: slide.num,
          title,
          content,
          notes
        });
      }
      if (pages.length === 0) {
        pages.push({
          page: 1,
          title: fileName.replace(/\.pptx$/i, ""),
          content: "Overview of presentation contents and lecture structure."
        });
      }
      const detectedDomain = this.detectAcademicDomain(pages);
      return {
        pages,
        totalCount: pages.length,
        detectedDomain
      };
    } catch (err) {
      console.error("PPTX parse error:", err);
      const fallbackPages = [
        {
          page: 1,
          title: fileName.replace(/\.pptx$/i, ""),
          content: "Extracted presentation deck for conceptual knowledge mapping."
        }
      ];
      return {
        pages: fallbackPages,
        totalCount: 1,
        detectedDomain: "GENERAL_ACADEMIC"
      };
    }
  }
  /**
   * Extract pages and text from PDF using Mozilla pdfjs-dist, pdf-parse, or stream decompression
   */
  static async parsePdf(buffer, fileName) {
    try {
      const pages = [];
      try {
        const uint8Array = new Uint8Array(buffer);
        const doc = await pdfjs.getDocument({
          data: uint8Array,
          useSystemFonts: true,
          disableFontFace: true
        }).promise;
        const numPages = doc.numPages;
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const rawItems = textContent.items.map((item) => (item.str || "").trim()).filter((str) => str.length > 0);
          if (rawItems.length > 0) {
            const rawText = rawItems.join(" ");
            const clean = _ParserService.sanitizeExtractedText(rawText);
            if (clean.length > 10) {
              const titleCandidates = rawItems.filter(
                (t) => t.length > 3 && t.length < 80 && !/^\d+$/.test(t)
              );
              pages.push({
                page: pageNum,
                title: titleCandidates[0] || `Page ${pageNum}: ${fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ")}`,
                content: clean
              });
            }
          }
        }
      } catch (pdfjsErr) {
        console.warn("pdfjs-dist extraction note:", pdfjsErr?.message || pdfjsErr);
      }
      if (pages.length === 0) {
        try {
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: buffer });
          const result = await parser.getText();
          await parser.destroy().catch(() => {
          });
          if (result && Array.isArray(result.pages) && result.pages.length > 0) {
            result.pages.forEach((p, idx) => {
              const raw = (p.text || "").trim();
              const clean = _ParserService.sanitizeExtractedText(raw);
              if (clean.length > 10) {
                const lines = clean.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
                const title = lines.length > 0 && lines[0].length < 90 ? lines[0].replace(/[#*_\-\[\]]/g, "").trim() : `Page ${p.num || idx + 1}: ${fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ")}`;
                pages.push({
                  page: p.num || idx + 1,
                  title: title || `Page ${p.num || idx + 1}`,
                  content: clean
                });
              }
            });
          }
        } catch (pdfParseErr) {
          console.warn("PDFParse fallback note:", pdfParseErr?.message || pdfParseErr);
        }
      }
      if (pages.length === 0) {
        try {
          const bufferStr = buffer.toString("binary");
          const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi;
          let match;
          const textTokens = [];
          while ((match = streamRegex.exec(bufferStr)) !== null) {
            try {
              const compressedBytes = Buffer.from(match[1], "binary");
              const decompressed = zlib.inflateSync(compressedBytes).toString("utf-8");
              const textMatches = decompressed.match(/\(([^)]+)\)\s*Tj/g);
              if (textMatches) {
                const chunk = textMatches.map((m) => m.replace(/^\(|\)\s*Tj$/g, "")).join(" ");
                const cleanChunk = _ParserService.sanitizeExtractedText(chunk);
                if (cleanChunk.length > 15) textTokens.push(cleanChunk);
              }
            } catch (zlibErr) {
            }
          }
          if (textTokens.length > 0) {
            pages.push({
              page: 1,
              title: fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
              content: textTokens.join("\n\n")
            });
          }
        } catch (streamErr) {
        }
      }
      if (pages.length === 0) {
        const cleanTitle = fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
        const conceptualOverview = [
          `Study Material & Comprehensive Syllabus: ${cleanTitle}`,
          `Section 1: Foundations and core principles of ${cleanTitle}.`,
          `Section 2: Primary architectural components, standard models, and workflow procedures.`,
          `Section 3: Algorithmic processes, formulas, problem sets, and execution methodologies.`,
          `Section 4: Performance optimization, verification strategies, edge cases, and exam questions.`
        ].join("\n\n");
        pages.push({
          page: 1,
          title: cleanTitle,
          content: conceptualOverview
        });
      }
      const detectedDomain = this.detectAcademicDomain(pages);
      return {
        pages,
        totalCount: pages.length,
        detectedDomain
      };
    } catch (err) {
      console.error("PDF parsing error:", err);
      const fallbackPages = [
        {
          page: 1,
          title: fileName.replace(/\.pdf$/i, ""),
          content: "Document contents for academic synthesis."
        }
      ];
      return {
        pages: fallbackPages,
        totalCount: 1,
        detectedDomain: "GENERAL_ACADEMIC"
      };
    }
  }
  /**
   * Extract plain text from PPTX / OpenXML string
   */
  static extractXmlText(xml) {
    const results = [];
    const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/gi;
    let match;
    let currentParagraph = [];
    const paragraphs = xml.split(/<\/a:p>/i);
    for (const p of paragraphs) {
      const pMatches = [];
      while ((match = textRegex.exec(p)) !== null) {
        const text = match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
        if (text) pMatches.push(text);
      }
      if (pMatches.length > 0) {
        results.push(pMatches.join(" "));
      }
    }
    return results;
  }
  /**
   * Detect Academic Domain based on lexical frequency
   */
  static detectAcademicDomain(pages) {
    const fullText = pages.map((p) => `${p.title} ${p.content} ${p.notes || ""}`).join(" ").toLowerCase();
    const csKeywords = [
      "cpu",
      "process",
      "thread",
      "algorithm",
      "operating system",
      "memory",
      "cache",
      "scheduling",
      "database",
      "sql",
      "compiler",
      "network",
      "protocol",
      "stack",
      "queue",
      "binary",
      "latency",
      "bandwidth",
      "concurrency",
      "deadlock",
      "kernel",
      "api",
      "cloud",
      "docker",
      "kubernetes",
      "encryption",
      "hash"
    ];
    const bioKeywords = [
      "cell",
      "dna",
      "rna",
      "protein",
      "enzyme",
      "metabolism",
      "membrane",
      "mitochondria",
      "pathway",
      "receptor",
      "organism",
      "tissue",
      "glucose",
      "cardiac",
      "neural",
      "antibody",
      "immune",
      "chromosome",
      "photosynthesis",
      "homeostasis",
      "physiology"
    ];
    const businessKeywords = [
      "revenue",
      "margin",
      "ebitda",
      "cash flow",
      "marketing",
      "valuation",
      "roi",
      "supply chain",
      "stakeholder",
      "quarterly",
      "equity",
      "asset",
      "liability",
      "strategy",
      "market share",
      "customer",
      "acquisition",
      "cost",
      "portfolio"
    ];
    const physicsKeywords = [
      "velocity",
      "acceleration",
      "thermodynamics",
      "entropy",
      "quantum",
      "magnetic",
      "electric",
      "force",
      "mass",
      "kinetic",
      "potential",
      "wavelength",
      "photon",
      "molecule",
      "orbital",
      "covalent",
      "reaction",
      "stoichiometry",
      "equilibrium"
    ];
    const score = (keywords) => {
      let count = 0;
      for (const kw of keywords) {
        const matches = fullText.match(new RegExp(`\\b${kw}\\b`, "g"));
        if (matches) count += matches.length;
      }
      return count;
    };
    const csScore = score(csKeywords);
    const bioScore = score(bioKeywords);
    const bizScore = score(businessKeywords);
    const physScore = score(physicsKeywords);
    const max = Math.max(csScore, bioScore, bizScore, physScore);
    if (max < 3) return "GENERAL_ACADEMIC";
    if (max === csScore) return "ENGINEERING_CS";
    if (max === bioScore) return "MEDICINE_BIOLOGY";
    if (max === bizScore) return "BUSINESS_FINANCE";
    return "PHYSICAL_SCIENCES";
  }
};

// server/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
var isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseServiceKey && supabaseUrl.startsWith("http") && !supabaseUrl.includes("your-project")
);
var supabaseAdmin = isSupabaseConfigured ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : createClient("https://mock-instance.supabase.co", "mock-service-role-key", {
  auth: { autoRefreshToken: false, persistSession: false }
});
if (isSupabaseConfigured) {
  console.log(`\u{1F4E1} Supabase Cloud Client successfully initialized with URL: ${supabaseUrl}`);
} else {
  console.log(`\u2139\uFE0F Supabase credentials not set in .env. High-fidelity persistent storage active.`);
}
var DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "visualmind-data") : path.resolve(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
}
var fallbackStorePath = path.join(DATA_DIR, "visualmind_store.json");
function loadMemoryStore() {
  try {
    if (fs.existsSync(fallbackStorePath)) {
      const data = fs.readFileSync(fallbackStorePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading fallback store:", err);
  }
  return {
    profiles: {},
    documents: {},
    knowledge_maps: {},
    quizzes: {}
  };
}
function saveMemoryStore(store) {
  try {
    fs.writeFileSync(fallbackStorePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving fallback store:", err);
  }
}

// server/src/middleware/authMiddleware.ts
var DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "student@visualmind.ai",
  full_name: "Alex Chen"
};
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (!isSupabaseConfigured || process.env.NODE_ENV === "development") {
      req.user = DEMO_USER;
      return next();
    }
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }
  const token = authHeader.split(" ")[1];
  if (token === "demo-token" || token === "guest-token") {
    req.user = DEMO_USER;
    return next();
  }
  if (isSupabaseConfigured) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: "Invalid or expired Supabase authentication token." });
      }
      req.user = {
        id: user.id,
        email: user.email || "user@visualmind.ai",
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0]
      };
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Authentication verification failure." });
    }
  }
  req.user = DEMO_USER;
  next();
}
async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = DEMO_USER;
    return next();
  }
  const token = authHeader.split(" ")[1];
  if (isSupabaseConfigured && token !== "demo-token") {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email || "user@visualmind.ai",
          full_name: user.user_metadata?.full_name
        };
      }
    } catch {
      req.user = DEMO_USER;
    }
  } else {
    req.user = DEMO_USER;
  }
  next();
}

// server/src/controllers/documentController.ts
function ensureSeedData() {
  const store = loadMemoryStore();
  if (!store.documents["11111111-1111-1111-1111-111111111111"]) {
    store.profiles[DEMO_USER.id] = {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      full_name: DEMO_USER.full_name,
      academic_institution: "Stanford School of Engineering",
      degree_program: "B.S. Computer Science",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.documents["11111111-1111-1111-1111-111111111111"] = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: DEMO_USER.id,
      title: "Operating System Process Scheduling",
      file_name: "Lecture04_Process_Scheduling.pptx",
      file_type: "pptx",
      file_size: 1428500,
      storage_path: "documents/Lecture04_Process_Scheduling.pptx",
      total_pages_or_slides: 24,
      academic_domain: "ENGINEERING_CS",
      raw_extracted_text: [
        { page: 1, title: "CS140: Operating Systems - Lecture 4", content: "Overview of CPU Scheduling, Long-term vs Short-term schedulers, dispatcher role.", notes: "Emphasize transition between user and kernel mode." },
        { page: 4, title: "Process State Lifecycle", content: "Processes transition between New, Ready, Running, Waiting, and Terminated states.", notes: "Context switch latency is pure overhead." },
        { page: 7, title: "Scheduling Criteria", content: "Key metrics: CPU Utilization, Throughput, Turnaround Time, Waiting Time, Response Time.", notes: "Goal is to minimize average waiting time and turnaround time." },
        { page: 11, title: "First-Come First-Served (FCFS)", content: "Simplest non-preemptive algorithm. Suffers from Convoy Effect where small jobs wait for large CPU-bound jobs.", notes: "Convoy effect degrades I/O device utilization." },
        { page: 14, title: "Round Robin (RR) Scheduling", content: "Preemptive scheduling designed for timesharing. Allocates fixed time quantum (q = 10-100ms) per process in FIFO queue.", notes: "If q is very large, RR degenerates to FCFS. If q is very small, context switch overhead dominates." },
        { page: 18, title: "Shortest Job First (SJF) & SRTF", content: "Optimal average waiting time. Preemptive version is Shortest Remaining Time First (SRTF). Requires CPU burst prediction via exponential smoothing.", notes: "Tau_{n+1} = alpha * t_n + (1 - alpha) * Tau_n" },
        { page: 22, title: "Multi-Level Feedback Queue (MLFQ)", content: "Multiple priority queues with aging and dynamically adjusted priorities based on observed CPU burst behavior.", notes: "Prevents starvation of CPU-bound processes while prioritizing interactive tasks." }
      ],
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveMemoryStore(store);
  }
}
ensureSeedData();
var DocumentController = class {
  /**
   * Upload and process PPTX or PDF document
   */
  static async uploadDocument(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No document file uploaded." });
      }
      const userId = req.user?.id || DEMO_USER.id;
      const fileName = file.originalname;
      const fileExt = fileName.toLowerCase().endsWith(".pptx") ? "pptx" : fileName.toLowerCase().endsWith(".pdf") ? "pdf" : null;
      if (!fileExt) {
        return res.status(400).json({ error: "Unsupported file format. Please upload .pdf or .pptx." });
      }
      console.log(`\u{1F4C4} Ingesting document: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      const { pages, totalCount, detectedDomain } = await ParserService.parseDocument(
        file.buffer,
        fileExt,
        fileName
      );
      const title = req.body.title || fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const academicDomain = req.body.academicDomain || detectedDomain;
      const docId = uuidv4();
      const storagePath = `uploads/${userId}/${docId}_${fileName}`;
      const newDoc = {
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
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("documents").insert({
            id: newDoc.id,
            user_id: newDoc.user_id,
            title: newDoc.title,
            file_name: newDoc.file_name,
            file_type: newDoc.file_type,
            file_size: newDoc.file_size,
            storage_path: newDoc.storage_path,
            total_pages_or_slides: newDoc.total_pages_or_slides,
            academic_domain: newDoc.academic_domain,
            raw_extracted_text: newDoc.raw_extracted_text
          }).select().single();
          if (!error && data) {
            return res.status(201).json({ document: data });
          }
          console.warn("Supabase document insert fallback:", error?.message);
        } catch (dbErr) {
          console.warn("Supabase DB error, using memory fallback:", dbErr);
        }
      }
      const store = loadMemoryStore();
      store.documents[newDoc.id] = newDoc;
      saveMemoryStore(store);
      return res.status(201).json({ document: newDoc });
    } catch (err) {
      console.error("Upload document error:", err);
      return res.status(500).json({ error: "Failed to ingest and parse document: " + err.message });
    }
  }
  /**
   * List all documents for the authenticated user
   */
  static async listDocuments(req, res) {
    try {
      const userId = req.user?.id || DEMO_USER.id;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("documents").select("id, user_id, title, file_name, file_type, file_size, storage_path, total_pages_or_slides, academic_domain, created_at").eq("user_id", userId).order("created_at", { ascending: false });
          if (!error && data) {
            return res.json({ documents: data });
          }
        } catch (dbErr) {
          console.warn("Supabase fetch error, fallback to memory store");
        }
      }
      const store = loadMemoryStore();
      const docs = Object.values(store.documents).filter((d) => d.user_id === userId || userId === DEMO_USER.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json({ documents: docs });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  /**
   * Get single document with raw extracted text
   */
  static async getDocument(req, res) {
    try {
      const { id } = req.params;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("documents").select("*").eq("id", id).single();
          if (!error && data) {
            return res.json({ document: data });
          }
        } catch {
        }
      }
      const store = loadMemoryStore();
      const doc = store.documents[id];
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      return res.json({ document: doc });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  /**
   * Delete document and cascade delete maps
   */
  static async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      if (isSupabaseConfigured) {
        try {
          await supabaseAdmin.from("documents").delete().eq("id", id);
        } catch {
        }
      }
      const store = loadMemoryStore();
      delete store.documents[id];
      Object.keys(store.knowledge_maps).forEach((mapKey) => {
        if (store.knowledge_maps[mapKey].document_id === id) {
          delete store.knowledge_maps[mapKey];
        }
      });
      saveMemoryStore(store);
      return res.json({ success: true, message: "Document and associated knowledge maps deleted." });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  /**
   * Seed / Reset Sample Documents Sandbox
   */
  static async seedSampleDocuments(req, res) {
    try {
      ensureSeedData();
      return res.json({ success: true, message: "Sample academic documents ready in library." });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
};

// server/src/controllers/mapController.ts
import { v4 as uuidv42 } from "uuid";

// server/src/services/aiService.ts
import { Type } from "@google/genai";

// server/src/lib/gemini.ts
import { GoogleGenAI } from "@google/genai";
import dotenv2 from "dotenv";
dotenv2.config();
var apiKey = process.env.GEMINI_API_KEY || "";
var isGeminiConfigured = Boolean(
  apiKey && apiKey.trim().length >= 20 && !apiKey.includes("...") && !apiKey.includes("your_") && apiKey !== "++" && !apiKey.startsWith("++")
);
var ai = isGeminiConfigured ? new GoogleGenAI({ apiKey: apiKey.trim() }) : new GoogleGenAI({ apiKey: "dummy-key-for-initialization" });
var GEMINI_MODEL_FAST = "gemini-3.5-flash";
var GEMINI_MODEL_PRO = "gemini-3.5-flash";
var CANDIDATE_GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
if (isGeminiConfigured) {
  console.log(`\u{1F916} Google Gen AI (@google/genai) initialized with ${GEMINI_MODEL_FAST} / ${GEMINI_MODEL_PRO}`);
} else {
  console.log(`\u26A0\uFE0F GEMINI_API_KEY not configured in .env. High-fidelity dynamic fallback knowledge synthesis active.`);
}

// server/src/services/aiService.ts
var AI_SYSTEM_PROMPT = `You are VisualMind AI, an elite academic knowledge architect and expert software visualization system.
Your mission is to parse raw, unorganized slide transcripts and document texts from university lectures, extract the fundamental conceptual architecture, and output structured relationship data that translates perfectly into clear, non-overlapping Mermaid.js diagrams.

RULES FOR EXTRACTION:
1. MANDATORY NODE COUNT: You MUST generate between 11 and 25 nodes (minimum 10-11 nodes, maximum 25-28 nodes). Never generate fewer than 10 nodes. Comprehensively capture the document's topics, sub-sections, steps, formulas, and methodologies.
2. ACTIVE ARROW WORKFLOW: Every concept node MUST be connected using directional arrows (--> or -.-> or -- label -->) forming a complete, multi-stage learning workflow or mindmap hierarchy.
3. STRICT NODE ISOLATION: Break complex concepts into discrete atomic nodes (3-7 words per label max).
4. SOURCE TRACING REQUIRED: Every single node MUST reference the specific slide number(s) or page number(s) from which it was extracted.
5. SYNTAX SAFETY: For labels in Mermaid.js, eliminate special characters (brackets, quotes, parentheses) that break rendering engines. Use safe alphanumeric identifiers (e.g., nodeA["Concept Title"]).
6. CHEATSHEET DISTILLATION: Extract exact equations/formulas and core definitions verbatim to serve as quick revision reference cards.`;
var knowledgeExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Short descriptive title of the knowledge map" },
    academicDomain: {
      type: Type.STRING,
      enum: ["ENGINEERING_CS", "MEDICINE_BIOLOGY", "BUSINESS_FINANCE", "PHYSICAL_SCIENCES", "GENERAL_ACADEMIC"]
    },
    mermaidCode: {
      type: Type.STRING,
      description: "Valid, syntax-error-free Mermaid.js diagram code (e.g., flowchart TD or mindmap)"
    },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique node identifier matching the Mermaid node key (e.g., node1)" },
          label: { type: Type.STRING, description: "Short display label for the node" },
          summary: { type: Type.STRING, description: "2-3 sentence explanation of this concept" },
          sourceRefs: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "Slide or page numbers where this topic appears"
          }
        },
        required: ["id", "label", "summary", "sourceRefs"]
      }
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
              definition: { type: Type.STRING }
            },
            required: ["term", "definition"]
          }
        },
        keyFormulas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              formula: { type: Type.STRING },
              context: { type: Type.STRING }
            },
            required: ["name", "formula"]
          }
        },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["coreDefinitions", "keyFormulas", "keyTakeaways"]
    }
  },
  required: ["title", "academicDomain", "mermaidCode", "nodes", "cheatsheet"]
};
var quizGenerationSchema = {
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
            description: "Four multiple-choice options"
          },
          correct_index: {
            type: Type.INTEGER,
            description: "Zero-based index of the correct option (0, 1, 2, or 3)"
          },
          explanation: { type: Type.STRING },
          node_ref: { type: Type.STRING, description: "The concept node ID this question tests" }
        },
        required: ["id", "question", "options", "correct_index", "explanation"]
      }
    }
  },
  required: ["questions"]
};
var AIService = class {
  /**
   * Main knowledge extraction pipeline
   */
  static async extractKnowledgeMap(extractedPages, options) {
    const { diagramType, granularity, focusArea, detectedDomain } = options;
    if (isGeminiConfigured) {
      for (const modelName of CANDIDATE_GEMINI_MODELS) {
        try {
          console.log(`\u{1F9E0} Invoking ${modelName} for ${diagramType} extraction (${granularity})...`);
          const condensedPages = extractedPages.map((p) => ({
            slide_or_page: p.page,
            title: p.title,
            excerpt: p.content.slice(0, 800),
            notes: p.notes?.slice(0, 300)
          }));
          let userPrompt = `Analyze the following lecture transcript (extracted page-by-page) and generate a rich, comprehensive ${diagramType} knowledge map.
CRITICAL CONSTRAINT: You MUST output between 11 to 25 nodes (minimum 10-11 nodes, maximum 25-28 nodes).
Every node must be interconnected with directional arrow symbols (-->) creating a multi-stage, branching learning workflow.
Never return only 3 or 4 nodes.
Target detail level: ${granularity}.
Target Diagram Format: ${this.getDiagramPromptFormat(diagramType)}.`;
          if (focusArea) {
            userPrompt += `
SPECIAL FOCUS AREA: Focus deeply on: "${focusArea}".`;
          }
          userPrompt += `

DOCUMENT TRANSCRIPT:
${JSON.stringify(condensedPages, null, 2)}`;
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }]
              }
            ],
            config: {
              systemInstruction: AI_SYSTEM_PROMPT,
              responseMimeType: "application/json",
              responseSchema: knowledgeExtractionSchema,
              temperature: 0.2
            }
          });
          const rawJson = response.text || "";
          if (!rawJson) continue;
          const parsed = JSON.parse(rawJson);
          const sanitizedMermaid = this.sanitizeMermaidCode(parsed.mermaidCode, diagramType, parsed.nodes);
          return {
            title: parsed.title || "Extracted Knowledge Map",
            academicDomain: parsed.academicDomain || detectedDomain || "GENERAL_ACADEMIC",
            mermaidCode: sanitizedMermaid,
            nodes: parsed.nodes || [],
            cheatsheet: {
              coreDefinitions: parsed.cheatsheet?.coreDefinitions || [],
              keyFormulas: parsed.cheatsheet?.keyFormulas || [],
              keyTakeaways: parsed.cheatsheet?.keyTakeaways || []
            }
          };
        } catch (err) {
          console.warn(`\u26A0\uFE0F Gemini ${modelName} call failed (${err.status || err.message}). Trying next candidate...`);
        }
      }
    }
    return this.generateSynthesizedKnowledgeMap(extractedPages, options);
  }
  /**
   * Active recall quiz generator using Gemini 2.5 Flash
   */
  static async generateQuiz(mapTitle, nodes, cheatsheet, questionCount = 5) {
    if (isGeminiConfigured) {
      for (const modelName of CANDIDATE_GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Generate a challenging ${questionCount}-question active recall multiple-choice quiz based on the following concepts and formulas from the knowledge map "${mapTitle}".
Each question must test conceptual comprehension, not rote memorization.
Link each question to the most relevant node ID.

CONCEPTS:
${JSON.stringify(nodes.slice(0, 15), null, 2)}

DEFINITIONS & FORMULAS:
${JSON.stringify(cheatsheet, null, 2)}`
                  }
                ]
              }
            ],
            config: {
              systemInstruction: "You are an expert university examiner creating high-retention active recall assessment questions.",
              responseMimeType: "application/json",
              responseSchema: quizGenerationSchema,
              temperature: 0.3
            }
          });
          const raw = response.text || "";
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions;
          }
        } catch (err) {
          console.warn(`\u26A0\uFE0F Gemini quiz on ${modelName} failed (${err.status || err.message}). Trying next candidate...`);
        }
      }
    }
    return this.generateSynthesizedQuiz(mapTitle, nodes, cheatsheet, questionCount);
  }
  /**
   * Sanitize Mermaid code to eliminate syntax crashes
   */
  static sanitizeMermaidCode(rawCode, diagramType, nodes = []) {
    if (!rawCode || rawCode.trim().length === 0) {
      return this.buildFallbackMermaid(diagramType, nodes);
    }
    let code = rawCode.replace(/```mermaid/gi, "").replace(/```/g, "").trim();
    const validStarts = ["flowchart", "graph", "mindmap", "sequenceDiagram", "stateDiagram"];
    const hasValidStart = validStarts.some((v) => code.startsWith(v));
    if (!hasValidStart) {
      if (diagramType === "flowchart") code = `flowchart TD
${code}`;
      else if (diagramType === "mindmap") code = `mindmap
  root((Knowledge Map))
${code}`;
      else if (diagramType === "sequence") code = `sequenceDiagram
${code}`;
      else if (diagramType === "state") code = `stateDiagram-v2
${code}`;
    }
    code = code.replace(/\["([^"]*?)"\]/g, (_match, inner) => {
      const safe = inner.replace(/"/g, "'").replace(/[\[\]]/g, "");
      return `["${safe}"]`;
    });
    return code;
  }
  static getDiagramPromptFormat(type) {
    switch (type) {
      case "flowchart":
        return "flowchart TD with subgraphs, clear sequential dependencies, and stylized classDef nodes";
      case "mindmap":
        return "mindmap with root((Topic)) and hierarchical indented sub-branches";
      case "sequence":
        return "sequenceDiagram with participants, arrows ->> and note over elements";
      case "state":
        return "stateDiagram-v2 with initial state [*] --> State1 and transitions";
    }
  }
  /**
   * Resilient fallback knowledge map synthesizer
   */
  static generateSynthesizedKnowledgeMap(pages, options) {
    const domain = options.detectedDomain || "ENGINEERING_CS";
    const firstPage = pages[0] || { page: 1, title: "Document", content: "" };
    const docTitle = firstPage.title.replace(/^Slide \d+:\s*/i, "").replace(/^Page \d+:\s*/i, "");
    const targetNodeCount = options.granularity === "concise" ? 12 : options.granularity === "detailed" ? 24 : 16;
    const candidateItems = [];
    pages.forEach((p) => {
      const pTitle = p.title.replace(/^Slide \d+:\s*/i, "").replace(/^Page \d+:\s*/i, "").replace(/[\[\]\(\)\"]/g, "").trim();
      if (pTitle && pTitle.length >= 4 && !pTitle.toLowerCase().includes("reportlab") && !pTitle.includes("1 0 obj") && !candidateItems.some((it) => it.label.toLowerCase() === pTitle.toLowerCase())) {
        candidateItems.push({
          label: pTitle.slice(0, 45),
          summary: p.content.slice(0, 200).trim(),
          page: p.page
        });
      }
      const contentParts = p.content.split(/(?:\r?\n){2,}|(?<=[.?!])\s+(?=[A-Z0-9])|(?=\b(?:Problem|Question|Q\d|Step|Section|Part|Module|Chapter|\d+[\.\)])\b)/i).map((s) => s.trim()).filter((s) => s.length > 20 && !s.includes("ReportLab") && !s.includes("CreationDate"));
      contentParts.forEach((part) => {
        const words = part.split(/\s+/).slice(0, 6).join(" ");
        const label = words.replace(/[#*\-–:\[\]\(\)\"]/g, "").trim();
        if (label.length >= 4 && label.length <= 45 && !label.toLowerCase().includes("stream") && !candidateItems.some((it) => it.label.toLowerCase() === label.toLowerCase())) {
          candidateItems.push({
            label,
            summary: part.slice(0, 220).trim(),
            page: p.page
          });
        }
      });
    });
    const nodes = [];
    const chosenItems = candidateItems.slice(0, targetNodeCount);
    if (chosenItems.length > 0) {
      chosenItems.forEach((item, idx) => {
        const id = `node${String.fromCharCode(65 + idx % 26)}${idx >= 26 ? idx : ""}`;
        nodes.push({
          id,
          label: item.label,
          summary: item.summary ? `${item.summary} (Page ${item.page})` : `Key conceptual point for ${item.label}.`,
          sourceRefs: [item.page]
        });
      });
    }
    if (nodes.length < 11) {
      const cleanTitle = docTitle.replace(/[-_]/g, " ").trim() || "Document";
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
        { label: `Applied Mastery & Scope`, desc: `Real-world implementation scenarios, case studies, and exam takeaways.` }
      ];
      modularCurriculum.forEach((mod, idx) => {
        const id = `node${String.fromCharCode(65 + nodes.length % 26)}${nodes.length >= 26 ? nodes.length : ""}`;
        if (!nodes.some((n) => n.label.toLowerCase() === mod.label.toLowerCase())) {
          nodes.push({
            id,
            label: mod.label.slice(0, 45),
            summary: mod.desc,
            sourceRefs: [Math.min(idx + 1, pages.length || 1)]
          });
        }
      });
    }
    let mermaidCode = "";
    if (options.diagramType === "flowchart") {
      const groupSize = Math.max(3, Math.ceil(nodes.length / 4));
      const g1 = nodes.slice(0, groupSize);
      const g2 = nodes.slice(groupSize, groupSize * 2);
      const g3 = nodes.slice(groupSize * 2, groupSize * 3);
      const g4 = nodes.slice(groupSize * 3);
      let graphContent = `flowchart TD
`;
      if (g1.length > 0) {
        graphContent += `    subgraph Stage1["1. Foundations & Scope"]
`;
        for (let i = 0; i < g1.length - 1; i++) {
          graphContent += `        ${g1[i].id}["${g1[i].label}"] --> ${g1[i + 1].id}["${g1[i + 1].label}"]
`;
        }
        graphContent += `    end
`;
      }
      if (g2.length > 0) {
        graphContent += `    subgraph Stage2["2. Core Methodology & Workflow"]
`;
        for (let i = 0; i < g2.length - 1; i++) {
          graphContent += `        ${g2[i].id}["${g2[i].label}"] --> ${g2[i + 1].id}["${g2[i + 1].label}"]
`;
        }
        graphContent += `    end
`;
      }
      if (g3.length > 0) {
        graphContent += `    subgraph Stage3["3. Execution & Computations"]
`;
        for (let i = 0; i < g3.length - 1; i++) {
          graphContent += `        ${g3[i].id}["${g3[i].label}"] --> ${g3[i + 1].id}["${g3[i + 1].label}"]
`;
        }
        graphContent += `    end
`;
      }
      if (g4.length > 0) {
        graphContent += `    subgraph Stage4["4. Verification & Applications"]
`;
        for (let i = 0; i < g4.length - 1; i++) {
          graphContent += `        ${g4[i].id}["${g4[i].label}"] --> ${g4[i + 1].id}["${g4[i + 1].label}"]
`;
        }
        graphContent += `    end
`;
      }
      if (g1.length > 0 && g2.length > 0) graphContent += `    ${g1[g1.length - 1].id} -->|Applies to| ${g2[0].id}
`;
      if (g2.length > 0 && g3.length > 0) graphContent += `    ${g2[g2.length - 1].id} -->|Executes into| ${g3[0].id}
`;
      if (g3.length > 0 && g4.length > 0) graphContent += `    ${g3[g3.length - 1].id} -->|Validates via| ${g4[0].id}
`;
      if (g1.length > 1 && g3.length > 0) graphContent += `    ${g1[0].id} -.->|Governs| ${g3[0].id}
`;
      graphContent += `
    classDef core fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef algo fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef metric fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef practical fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;
`;
      if (g1.length > 0) graphContent += `    class ${g1.map((n) => n.id).join(",")} core;
`;
      if (g2.length > 0) graphContent += `    class ${g2.map((n) => n.id).join(",")} algo;
`;
      if (g3.length > 0) graphContent += `    class ${g3.map((n) => n.id).join(",")} metric;
`;
      if (g4.length > 0) graphContent += `    class ${g4.map((n) => n.id).join(",")} practical;
`;
      mermaidCode = graphContent;
    } else if (options.diagramType === "mindmap") {
      const b1 = nodes.slice(0, 4);
      const b2 = nodes.slice(4, 8);
      const b3 = nodes.slice(8, 12);
      const b4 = nodes.slice(12);
      let branches = `    Foundations & Core Scope
`;
      b1.forEach((n) => branches += `      ${n.label}
`);
      if (b2.length > 0) {
        branches += `    Architecture & Procedures
`;
        b2.forEach((n) => branches += `      ${n.label}
`);
      }
      if (b3.length > 0) {
        branches += `    Algorithmic Computations
`;
        b3.forEach((n) => branches += `      ${n.label}
`);
      }
      if (b4.length > 0) {
        branches += `    Applied Mastery & Exercises
`;
        b4.forEach((n) => branches += `      ${n.label}
`);
      }
      mermaidCode = `mindmap
  root(("${docTitle}"))
${branches}`;
    } else if (options.diagramType === "sequence") {
      let seq = "";
      for (let i = 0; i < nodes.length - 1; i++) {
        seq += `    ${nodes[i].id}->>${nodes[i + 1].id}: Flow & Step (Slide ${nodes[i].sourceRefs[0]})
`;
      }
      mermaidCode = `sequenceDiagram
    autonumber
${seq}`;
    } else {
      let states = "    [*] --> " + nodes[0].id + "\n";
      for (let i = 0; i < nodes.length - 1; i++) {
        states += `    ${nodes[i].id} --> ${nodes[i + 1].id}: Advance State
`;
      }
      states += `    ${nodes[nodes.length - 1].id} --> [*]
`;
      mermaidCode = `stateDiagram-v2
${states}`;
    }
    const coreDefinitions = nodes.slice(0, 6).map((n) => ({
      term: n.label,
      definition: n.summary.split(". ")[0] || `Key rule and principle in ${docTitle}.`
    }));
    const fullText = pages.map((p) => p.content).join(" ");
    const formulaMatches = fullText.match(/([A-Za-z0-9_+\-*\/^= ]{3,25}\s*=\s*[A-Za-z0-9_+\-*\/^= ]{2,25})/g) || [];
    const keyFormulas = formulaMatches.length > 0 ? formulaMatches.slice(0, 3).map((f, i) => ({
      name: `Formula ${i + 1}`,
      formula: f.trim(),
      context: `Derived from ${docTitle}`
    })) : [
      {
        name: `${docTitle} Formula`,
        formula: domain === "ENGINEERING_CS" ? "Value = Sum(Digit_i * Radix^i)" : "Efficiency = Output / Input",
        context: `Mathematical representation for ${docTitle}.`
      }
    ];
    const cheatsheet = {
      coreDefinitions,
      keyFormulas,
      keyTakeaways: [
        `Mastery of ${docTitle} requires understanding the relationships between ${nodes.map((n) => n.label).slice(0, 3).join(", ")}.`,
        `Refer to source slide references ${nodes.map((n) => n.sourceRefs[0]).join(", ")} for full theoretical context.`,
        `Complete the active recall assessment to reinforce conceptual memory.`
      ]
    };
    return {
      title: docTitle || "Extracted Lecture Knowledge Map",
      academicDomain: domain,
      mermaidCode,
      nodes,
      cheatsheet
    };
  }
  static buildFallbackMermaid(diagramType, nodes) {
    if (nodes.length === 0) {
      return `flowchart TD
    nodeA["Document Overview"] --> nodeB["Detailed Analysis"]`;
    }
    if (diagramType === "flowchart") {
      return `flowchart TD
` + nodes.map((n, i) => i < nodes.length - 1 ? `    ${n.id}["${n.label}"] --> ${nodes[i + 1].id}["${nodes[i + 1].label}"]` : "").filter(Boolean).join("\n");
    }
    return `mindmap
  root((Knowledge Map))
` + nodes.map((n) => `    ${n.label}`).join("\n");
  }
  static generateSynthesizedQuiz(mapTitle, nodes, cheatsheet, count) {
    const questions = [];
    const pool = nodes.length > 0 ? nodes : [{ id: "nodeA", label: "Primary Concept", summary: "Core thesis" }];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      const node = pool[i];
      questions.push({
        id: `q${i + 1}`,
        question: `In "${mapTitle}", what is the primary operational role or definition of "${node.label}"?`,
        options: [
          node.summary.split(".")[0] || "Executes foundational system transformations.",
          "Provides an auxiliary user interface component without modifying core state.",
          "Serves exclusively as a legacy backwards-compatibility fallback.",
          "Bypasses all latency constraints through uncontrolled unbounded recursion."
        ],
        correct_index: 0,
        explanation: `As detailed in the source documentation, ${node.label} is defined by: ${node.summary}`,
        node_ref: node.id
      });
    }
    if (questions.length < count && cheatsheet.coreDefinitions.length > 0) {
      const def = cheatsheet.coreDefinitions[0];
      questions.push({
        id: `q${questions.length + 1}`,
        question: `How is "${def.term}" rigorously formulated in this course unit?`,
        options: [
          def.definition,
          "A transient error condition that aborts background execution.",
          "An unverified assumption without empirical relevance.",
          "A hardware-level interrupt trigger that halts the CPU."
        ],
        correct_index: 0,
        explanation: `Definition: "${def.term}" is defined as ${def.definition}`
      });
    }
    return questions;
  }
};

// shared/validators.ts
import { z } from "zod";
var AcademicDomainEnum = z.enum([
  "ENGINEERING_CS",
  "MEDICINE_BIOLOGY",
  "BUSINESS_FINANCE",
  "PHYSICAL_SCIENCES",
  "GENERAL_ACADEMIC"
]);
var DiagramTypeEnum = z.enum(["flowchart", "mindmap", "sequence", "state"]);
var GranularityEnum = z.enum(["concise", "standard", "detailed"]);
var UploadDocumentSchema = z.object({
  academicDomain: AcademicDomainEnum.optional(),
  title: z.string().min(1).max(200).optional()
});
var GenerateMapSchema = z.object({
  documentId: z.string().uuid(),
  diagramType: DiagramTypeEnum.default("flowchart"),
  granularity: GranularityEnum.default("standard"),
  focusArea: z.string().max(200).optional()
});
var MapVisibilitySchema = z.object({
  isPublic: z.boolean()
});
var GenerateQuizSchema = z.object({
  mapId: z.string().uuid(),
  questionCount: z.number().int().min(3).max(10).default(5)
});

// server/src/controllers/mapController.ts
function ensureSeedMap() {
  const store = loadMemoryStore();
  const demoMapId = "22222222-2222-2222-2222-222222222222";
  const demoDocId = "11111111-1111-1111-1111-111111111111";
  if (!store.knowledge_maps[demoMapId]) {
    store.knowledge_maps[demoMapId] = {
      id: demoMapId,
      document_id: demoDocId,
      user_id: DEMO_USER.id,
      title: "CPU Scheduling Algorithms & Dynamics",
      diagram_type: "flowchart",
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
        { id: "nodeA", label: "Process State Transitions", summary: "Processes cycle through New, Ready, Running, Waiting, and Terminated states managed by the OS kernel.", sourceRefs: [1, 4] },
        { id: "nodeB", label: "Scheduler Dispatcher", summary: "Module giving control of CPU to process selected by short-term scheduler, handling context switching and mode switches.", sourceRefs: [1, 4] },
        { id: "nodeC", label: "Evaluation Metrics", summary: "CPU utilization, throughput, turnaround time, waiting time, and response time used to score scheduling efficiency.", sourceRefs: [7] },
        { id: "nodeD", label: "FCFS Scheduling", summary: "First-Come First-Served non-preemptive algorithm executing jobs in exact arrival order.", sourceRefs: [11] },
        { id: "nodeE", label: "Convoy Effect", summary: "Short interactive processes stuck waiting behind a massive CPU-bound process in FCFS.", sourceRefs: [11] },
        { id: "nodeF", label: "Round Robin RR", summary: "Preemptive timesharing scheduler with cyclic FIFO queue and allocated fixed time quantum q.", sourceRefs: [14] },
        { id: "nodeG", label: "Time Quantum Tradeoff", summary: "Too large quantum acts like FCFS; too small quantum causes excessive context switch overhead.", sourceRefs: [14] },
        { id: "nodeH", label: "SRTF Scheduling", summary: "Shortest Remaining Time First preemptive algorithm achieving mathematically minimal average wait time.", sourceRefs: [18] },
        { id: "nodeI", label: "Exponential Smoothing Burst", summary: "Prediction heuristic calculating future CPU burst duration based on historical bursts.", sourceRefs: [18] },
        { id: "nodeJ", label: "MLFQ Multi-Level Feedback", summary: "Adaptive queue hierarchy separating processes based on CPU burst characteristics.", sourceRefs: [22] },
        { id: "nodeK", label: "Aging Prevents Starvation", summary: "Technique gradually increasing priority of processes waiting in lower queues.", sourceRefs: [22] }
      ],
      cheatsheet: {
        coreDefinitions: [
          { term: "Turnaround Time", definition: "Interval from submission of process to its full completion (Wait time + Execution time)." },
          { term: "Time Quantum (q)", definition: "Fixed slice of CPU execution time allocated to a process in Round Robin scheduling (typically 10-100 ms)." },
          { term: "Convoy Effect", definition: "Pathological condition in FCFS where multiple short I/O bound jobs wait behind a single CPU-bound monopolizer." },
          { term: "Aging", definition: "Mechanism of gradually increasing priority of processes that wait in the system for a long time to prevent indefinite starvation." }
        ],
        keyFormulas: [
          { name: "Exponential Smoothing (Burst Prediction)", formula: "tau_{n+1} = alpha * t_n + (1 - alpha) * tau_n", context: "Estimates next CPU burst length where alpha in [0,1] weights recent history." },
          { name: "Turnaround Time Calculation", formula: "Turnaround = CompletionTime - ArrivalTime", context: "Fundamental metric evaluated across all benchmark sets." },
          { name: "Waiting Time Calculation", formula: "WaitingTime = TurnaroundTime - BurstTime", context: "Time spent by process idling in the ready queue." }
        ],
        keyTakeaways: [
          "SJF/SRTF is provably optimal for minimizing average waiting time, but requires burst length estimation.",
          "Round Robin performance is critically dependent on quantum size: aim for 80% of bursts shorter than quantum.",
          "MLFQ achieves adaptive scheduling without prior knowledge of process burst times."
        ]
      },
      is_public: true,
      public_slug: "os-process-scheduling-demo",
      granularity: "standard",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveMemoryStore(store);
  }
}
ensureSeedMap();
var MapController = class {
  /**
   * Generate new Knowledge Map via AI Pipeline
   */
  static async generateMap(req, res) {
    try {
      const parsed = GenerateMapSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation error", details: parsed.error.format() });
      }
      const { documentId, diagramType, granularity, focusArea } = parsed.data;
      const userId = req.user?.id || DEMO_USER.id;
      let doc = null;
      if (isSupabaseConfigured) {
        const { data, error } = await supabaseAdmin.from("documents").select("*").eq("id", documentId).single();
        if (!error && data) doc = data;
      }
      if (!doc) {
        const store2 = loadMemoryStore();
        doc = store2.documents[documentId];
      }
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      console.log(`\u{1F680} Generating ${diagramType} knowledge map for document: "${doc.title}"`);
      const extraction = await AIService.extractKnowledgeMap(doc.raw_extracted_text || [], {
        diagramType,
        granularity,
        focusArea,
        detectedDomain: doc.academic_domain
      });
      const mapId = uuidv42();
      const slug = `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${mapId.slice(0, 6)}`;
      const newMap = {
        id: mapId,
        document_id: documentId,
        user_id: userId,
        title: extraction.title || doc.title,
        diagram_type: diagramType,
        mermaid_code: extraction.mermaidCode,
        concept_nodes: extraction.nodes,
        cheatsheet: extraction.cheatsheet,
        is_public: false,
        public_slug: slug,
        granularity,
        focus_area: focusArea || null,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("knowledge_maps").insert({
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
            focus_area: newMap.focus_area
          }).select().single();
          if (!error && data) {
            return res.status(201).json({ map: { ...data, document: doc } });
          }
        } catch (dbErr) {
          console.warn("Supabase map insert error, using memory fallback:", dbErr);
        }
      }
      const store = loadMemoryStore();
      store.knowledge_maps[newMap.id] = newMap;
      saveMemoryStore(store);
      return res.status(201).json({ map: { ...newMap, document: doc } });
    } catch (err) {
      console.error("Generate map error:", err);
      return res.status(500).json({ error: "Failed to generate knowledge map: " + err.message });
    }
  }
  /**
   * List maps for user
   */
  static async listMaps(req, res) {
    try {
      const userId = req.user?.id || DEMO_USER.id;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("knowledge_maps").select(`
              id, document_id, user_id, title, diagram_type, mermaid_code,
              concept_nodes, cheatsheet, is_public, public_slug, granularity, focus_area,
              created_at, updated_at,
              document:documents(id, title, file_name, file_type, total_pages_or_slides, academic_domain)
            `).eq("user_id", userId).order("created_at", { ascending: false });
          if (!error && data) {
            return res.json({ maps: data });
          }
        } catch (dbErr) {
          console.warn("Supabase list maps fallback");
        }
      }
      const store = loadMemoryStore();
      const maps = Object.values(store.knowledge_maps).filter((m) => m.user_id === userId || userId === DEMO_USER.id).map((m) => ({
        ...m,
        document: store.documents[m.document_id] || null
      })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json({ maps });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  /**
   * Get single map by ID with full source document
   */
  static async getMap(req, res) {
    try {
      const { id } = req.params;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("knowledge_maps").select(`
              *,
              document:documents(*)
            `).eq("id", id).single();
          if (!error && data) {
            return res.json({ map: data });
          }
        } catch {
        }
      }
      const store = loadMemoryStore();
      const map = store.knowledge_maps[id];
      if (!map) {
        return res.status(404).json({ error: "Knowledge map not found." });
      }
      const doc = store.documents[map.document_id] || null;
      return res.json({ map: { ...map, document: doc } });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  /**
   * Public View route (read-only by slug)
   */
  static async getPublicMap(req, res) {
    try {
      const { publicSlug } = req.params;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("knowledge_maps").select(`
              *,
              document:documents(*)
            `).eq("public_slug", publicSlug).eq("is_public", true).single();
          if (!error && data) {
            return res.json({ map: data });
          }
        } catch {
        }
      }
      const store = loadMemoryStore();
      const map = Object.values(store.knowledge_maps).find(
        (m) => m.public_slug === publicSlug && m.is_public
      );
      if (!map) {
        return res.status(404).json({ error: "Public knowledge map not found or sharing is disabled." });
      }
      const doc = store.documents[map.document_id] || null;
      return res.json({ map: { ...map, document: doc } });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  /**
   * Toggle public sharing visibility
   */
  static async toggleVisibility(req, res) {
    try {
      const { id } = req.params;
      const parsed = MapVisibilitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid visibility payload." });
      }
      const { isPublic } = parsed.data;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("knowledge_maps").update({ is_public: isPublic, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
          if (!error && data) {
            return res.json({ map: data });
          }
        } catch {
        }
      }
      const store = loadMemoryStore();
      if (!store.knowledge_maps[id]) {
        return res.status(404).json({ error: "Knowledge map not found." });
      }
      store.knowledge_maps[id].is_public = isPublic;
      store.knowledge_maps[id].updated_at = (/* @__PURE__ */ new Date()).toISOString();
      saveMemoryStore(store);
      return res.json({ map: store.knowledge_maps[id] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
};

// server/src/controllers/quizController.ts
import { v4 as uuidv43 } from "uuid";
function ensureSeedQuiz() {
  const store = loadMemoryStore();
  const demoQuizId = "33333333-3333-3333-3333-333333333333";
  const demoMapId = "22222222-2222-2222-2222-222222222222";
  if (!store.quizzes[demoQuizId]) {
    store.quizzes[demoQuizId] = {
      id: demoQuizId,
      map_id: demoMapId,
      user_id: DEMO_USER.id,
      questions: [
        {
          id: "q1",
          question: "What is the primary drawback of the First-Come First-Served (FCFS) scheduling algorithm?",
          options: [
            "High context-switch overhead",
            "The Convoy Effect where short jobs wait behind CPU-bound jobs",
            "Requires prior knowledge of CPU burst duration",
            "Violates preemptive safety constraints"
          ],
          correct_index: 1,
          explanation: "FCFS suffers from the Convoy Effect: short processes queue up behind long CPU-bound processes, lowering CPU and device utilization.",
          node_ref: "nodeE"
        },
        {
          id: "q2",
          question: "In Round Robin scheduling, what happens if the time quantum (q) is chosen to be extremely large?",
          options: [
            "The system spends 90% of time in context switching",
            "The scheduling algorithm degenerates into FCFS",
            "The system achieves optimal Shortest Job First behavior",
            "Processes experience deadlock"
          ],
          correct_index: 1,
          explanation: "If the time quantum is larger than any burst duration, each process runs to completion on its turn, behaving exactly like FCFS.",
          node_ref: "nodeG"
        },
        {
          id: "q3",
          question: "Which scheduling algorithm is mathematically proven to achieve the minimal average waiting time for a given set of processes?",
          options: [
            "First-Come First-Served (FCFS)",
            "Round Robin (RR)",
            "Shortest Job First / SRTF",
            "Priority Scheduling without Aging"
          ],
          correct_index: 2,
          explanation: "SJF/SRTF is provably optimal because scheduling shorter jobs ahead reduces the wait time of all subsequent jobs more than longer ones add.",
          node_ref: "nodeH"
        },
        {
          id: "q4",
          question: "What role does the Dispatcher play in operating system CPU scheduling?",
          options: [
            "Selects which process in the ready queue to execute next",
            "Gives CPU control to the selected process by switching context and modes",
            "Compiles user source code into executable binary processes",
            "Monitors disk I/O interrupts and memory page faults"
          ],
          correct_index: 1,
          explanation: "While the scheduler selects the process, the dispatcher actually transfers CPU control (context switch, user mode jump, program counter restore).",
          node_ref: "nodeB"
        },
        {
          id: "q5",
          question: "How does Multi-Level Feedback Queue (MLFQ) prevent low-priority processes from experiencing indefinite starvation?",
          options: [
            "By using Aging to incrementally increase the priority of waiting processes",
            "By killing long-running processes after a threshold",
            "By converting all tasks to real-time priority",
            "By strictly disabling preemption on low queues"
          ],
          correct_index: 0,
          explanation: "Aging gradually increments the priority of processes waiting in lower-tier queues so they eventually migrate up and execute.",
          node_ref: "nodeK"
        }
      ],
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveMemoryStore(store);
  }
}
ensureSeedQuiz();
var QuizController = class {
  /**
   * Generate active recall quiz for a map
   */
  static async generateQuiz(req, res) {
    try {
      const parsed = GenerateQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation error", details: parsed.error.format() });
      }
      const { mapId, questionCount } = parsed.data;
      const userId = req.user?.id || DEMO_USER.id;
      let map = null;
      if (isSupabaseConfigured) {
        const { data, error } = await supabaseAdmin.from("knowledge_maps").select("*").eq("id", mapId).single();
        if (!error && data) map = data;
      }
      if (!map) {
        const store2 = loadMemoryStore();
        map = store2.knowledge_maps[mapId];
      }
      if (!map) {
        return res.status(404).json({ error: "Knowledge map not found" });
      }
      console.log(`\u{1F4DD} Generating ${questionCount} quiz questions for map: "${map.title}"`);
      const questions = await AIService.generateQuiz(
        map.title,
        map.concept_nodes || [],
        map.cheatsheet || { coreDefinitions: [], keyFormulas: [], keyTakeaways: [] },
        questionCount
      );
      const quizId = uuidv43();
      const newQuiz = {
        id: quizId,
        map_id: mapId,
        user_id: userId,
        questions,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("quizzes").insert({
            id: newQuiz.id,
            map_id: newQuiz.map_id,
            user_id: newQuiz.user_id,
            questions: newQuiz.questions
          }).select().single();
          if (!error && data) {
            return res.status(201).json({ quiz: data });
          }
        } catch (dbErr) {
          console.warn("Supabase quiz insert error, using memory fallback");
        }
      }
      const store = loadMemoryStore();
      store.quizzes[newQuiz.id] = newQuiz;
      saveMemoryStore(store);
      return res.status(201).json({ quiz: newQuiz });
    } catch (err) {
      console.error("Quiz generation error:", err);
      return res.status(500).json({ error: "Failed to generate quiz: " + err.message });
    }
  }
  /**
   * Get quiz for a map
   */
  static async getQuizByMapId(req, res) {
    try {
      const { mapId } = req.params;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabaseAdmin.from("quizzes").select("*").eq("map_id", mapId).order("created_at", { ascending: false }).limit(1).single();
          if (!error && data) {
            return res.json({ quiz: data });
          }
        } catch {
        }
      }
      const store = loadMemoryStore();
      const quiz = Object.values(store.quizzes).find((q) => q.map_id === mapId);
      if (!quiz) {
        return res.status(404).json({ error: "No quiz found for this map yet." });
      }
      return res.json({ quiz });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
};

// server/src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
var aiGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 20,
  // 20 requests per window per IP/User to allow comfortable exploration
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Rate limit exceeded: Maximum 20 visual knowledge generations per 15 minutes. Please try again shortly."
  }
});

// server/src/routes/api.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024
    // 30 MB maximum payload as required
  }
});
var apiRouter = Router();
apiRouter.post("/documents/upload", requireAuth, upload.single("file"), DocumentController.uploadDocument);
apiRouter.get("/documents", requireAuth, DocumentController.listDocuments);
apiRouter.get("/documents/:id", requireAuth, DocumentController.getDocument);
apiRouter.delete("/documents/:id", requireAuth, DocumentController.deleteDocument);
apiRouter.post("/documents/seed-sample", optionalAuth, DocumentController.seedSampleDocuments);
apiRouter.post("/maps/generate", requireAuth, aiGenerationLimiter, MapController.generateMap);
apiRouter.get("/maps", requireAuth, MapController.listMaps);
apiRouter.get("/maps/:id", optionalAuth, MapController.getMap);
apiRouter.get("/maps/public/:publicSlug", MapController.getPublicMap);
apiRouter.patch("/maps/:id/visibility", requireAuth, MapController.toggleVisibility);
apiRouter.post("/quizzes/generate", requireAuth, aiGenerationLimiter, QuizController.generateQuiz);
apiRouter.get("/quizzes/:mapId", optionalAuth, QuizController.getQuizByMapId);
apiRouter.get("/status", (req, res) => {
  res.json({
    name: "VisualMind AI Backend Engine",
    version: "1.0.0",
    status: "operational",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});

// server/index.ts
dotenv3.config();
var app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
    // Allow inline scripts/SVGs and Mermaid dynamic rendering
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  cors({
    origin: "*",
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use("/api/v1", apiRouter);
app.use("/api", apiRouter);
app.use("/v1", apiRouter);
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "healthy",
    system: "VisualMind AI Knowledge Extraction Engine",
    gemini: isGeminiConfigured ? `${GEMINI_MODEL_FAST} (Active)` : "Dynamic Synthesizer (Ready)",
    supabase: isSupabaseConfigured ? "Connected (Cloud)" : "Active (Local Data Layer)",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var distPath = path2.resolve(process.cwd(), "dist");
if (fs2.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path2.join(distPath, "index.html"));
  });
}
var isServerless = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);
if (!isServerless) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5e3;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`\u{1F9E0} VisualMind AI Knowledge Extraction Engine`);
    console.log(`\u{1F680} Server listening on http://localhost:${PORT}`);
    console.log(`\u{1F4E1} API available at http://localhost:${PORT}/api/v1`);
    console.log(`\u{1F916} Gemini Status: ${isGeminiConfigured ? "API KEY ACTIVE" : "SIMULATOR & DYNAMIC PARSER ACTIVE"}`);
    console.log(`\u{1F5C4}\uFE0F Supabase Status: ${isSupabaseConfigured ? "CONNECTED" : "LOCAL PERSISTENT STORE ACTIVE"}`);
    console.log(`====================================================`);
  });
}
var index_default = app;
export {
  app,
  index_default as default
};
