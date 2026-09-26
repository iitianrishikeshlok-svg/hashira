// ============================================================================
// File: shared/schema.ts
// VisualMind AI - Core Domain Types & Data Contracts
// ============================================================================

export type AcademicDomain =
  | 'ENGINEERING_CS'
  | 'MEDICINE_BIOLOGY'
  | 'BUSINESS_FINANCE'
  | 'PHYSICAL_SCIENCES'
  | 'GENERAL_ACADEMIC';

export type DiagramType = 'flowchart' | 'mindmap' | 'sequence' | 'state';

export type GranularityLevel = 'concise' | 'standard' | 'detailed';

export type AcademicLevel = 'Undergraduate' | 'High School' | 'Graduate/Postgrad';

export interface ExtractedPage {
  page: number;
  title: string;
  content: string;
  notes?: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  summary: string;
  sourceRefs: number[];
}

export interface CoreDefinition {
  term: string;
  definition: string;
}

export interface KeyFormula {
  name: string;
  formula: string;
  context?: string;
}

export interface CheatsheetData {
  coreDefinitions: CoreDefinition[];
  keyFormulas: KeyFormula[];
  keyTakeaways: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  node_ref?: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_type: 'pdf' | 'pptx';
  file_size: number;
  storage_path: string;
  total_pages_or_slides: number;
  academic_domain: AcademicDomain;
  raw_extracted_text: ExtractedPage[];
  created_at: string;
}

export interface KnowledgeMapRecord {
  id: string;
  document_id: string;
  user_id: string;
  title: string;
  diagram_type: DiagramType;
  mermaid_code: string;
  concept_nodes: ConceptNode[];
  cheatsheet: CheatsheetData;
  is_public: boolean;
  public_slug?: string | null;
  granularity?: GranularityLevel;
  focus_area?: string | null;
  created_at: string;
  updated_at: string;
  // joined document fields if present
  document?: Partial<DocumentRecord>;
}

export interface QuizRecord {
  id: string;
  map_id: string;
  user_id: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string | null;
  academic_institution?: string;
  degree_program?: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}
