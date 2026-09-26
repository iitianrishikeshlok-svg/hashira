// ============================================================================
// File: shared/validators.ts
// VisualMind AI - Zod Request & Validation Schemas
// ============================================================================
import { z } from 'zod';

export const AcademicDomainEnum = z.enum([
  'ENGINEERING_CS',
  'MEDICINE_BIOLOGY',
  'BUSINESS_FINANCE',
  'PHYSICAL_SCIENCES',
  'GENERAL_ACADEMIC',
]);

export const DiagramTypeEnum = z.enum(['flowchart', 'mindmap', 'sequence', 'state']);
export const GranularityEnum = z.enum(['concise', 'standard', 'detailed']);

export const UploadDocumentSchema = z.object({
  academicDomain: AcademicDomainEnum.optional(),
  title: z.string().min(1).max(200).optional(),
});

export const GenerateMapSchema = z.object({
  documentId: z.string().uuid(),
  diagramType: DiagramTypeEnum.default('flowchart'),
  granularity: GranularityEnum.default('standard'),
  focusArea: z.string().max(200).optional(),
});

export const MapVisibilitySchema = z.object({
  isPublic: z.boolean(),
});

export const GenerateQuizSchema = z.object({
  mapId: z.string().uuid(),
  questionCount: z.number().int().min(3).max(10).default(5),
});
