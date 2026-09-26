// ============================================================================
// File: server/src/services/parserService.ts
// Document Ingestion Pipeline for PDF & PPTX with Slide & Note Extraction
// ============================================================================
import JSZip from 'jszip';
import { createRequire } from 'module';
import type { ExtractedPage, AcademicDomain } from '../../../shared/schema';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule?.default || pdfParseModule;

export class ParserService {
  /**
   * Parse either PDF or PPTX buffer into structured ExtractedPage array
   */
  static async parseDocument(
    buffer: Buffer,
    fileType: 'pdf' | 'pptx',
    fileName: string
  ): Promise<{ pages: ExtractedPage[]; totalCount: number; detectedDomain: AcademicDomain }> {
    if (fileType === 'pptx') {
      return this.parsePptx(buffer, fileName);
    } else {
      return this.parsePdf(buffer, fileName);
    }
  }

  /**
   * Extract slides, titles, body content, and speaker notes from PPTX via JSZip
   */
  static async parsePptx(
    buffer: Buffer,
    fileName: string
  ): Promise<{ pages: ExtractedPage[]; totalCount: number; detectedDomain: AcademicDomain }> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles: { num: number; path: string }[] = [];
      const notesFiles: Map<number, string> = new Map();

      // Find all slide XML files and notes XML files
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

      // Sort slides numerically
      slideFiles.sort((a, b) => a.num - b.num);

      const pages: ExtractedPage[] = [];

      for (let i = 0; i < slideFiles.length; i++) {
        const slide = slideFiles[i];
        const slideXml = await zip.file(slide.path)?.async('text');
        if (!slideXml) continue;

        // Extract text tokens from <a:t>...</a:t>
        const textTokens = this.extractXmlText(slideXml);

        // First non-empty token or line is typically the slide title
        const title = textTokens.length > 0 && textTokens[0].length < 100
          ? textTokens[0]
          : `Slide ${slide.num}: ${fileName.replace(/\.pptx$/i, '')}`;

        // Remaining tokens represent body content
        const bodyLines = textTokens.length > 1 ? textTokens.slice(1) : textTokens;
        const content = bodyLines.join(' \n ').trim() || `Key concepts and diagrams for slide ${slide.num}.`;

        // Extract speaker notes if present
        let notes: string | undefined = undefined;
        const notePath = notesFiles.get(slide.num);
        if (notePath) {
          const noteXml = await zip.file(notePath)?.async('text');
          if (noteXml) {
            const noteTokens = this.extractXmlText(noteXml);
            // Filter out slide number watermark tokens
            const actualNotes = noteTokens.filter((t) => !/^\d+$/.test(t.trim()));
            if (actualNotes.length > 0) {
              notes = actualNotes.join(' \n ');
            }
          }
        }

        pages.push({
          page: slide.num,
          title,
          content,
          notes,
        });
      }

      // Fallback if empty or corrupted zip
      if (pages.length === 0) {
        pages.push({
          page: 1,
          title: fileName.replace(/\.pptx$/i, ''),
          content: 'Overview of presentation contents and lecture structure.',
        });
      }

      const detectedDomain = this.detectAcademicDomain(pages);
      return {
        pages,
        totalCount: pages.length,
        detectedDomain,
      };
    } catch (err: any) {
      console.error('PPTX parse error:', err);
      // Resilient fallback with readable message
      const fallbackPages: ExtractedPage[] = [
        {
          page: 1,
          title: fileName.replace(/\.pptx$/i, ''),
          content: 'Extracted presentation deck for conceptual knowledge mapping.',
        },
      ];
      return {
        pages: fallbackPages,
        totalCount: 1,
        detectedDomain: 'GENERAL_ACADEMIC',
      };
    }
  }

  /**
   * Extract pages and text from PDF using pdf-parse
   */
  static async parsePdf(
    buffer: Buffer,
    fileName: string
  ): Promise<{ pages: ExtractedPage[]; totalCount: number; detectedDomain: AcademicDomain }> {
    try {
      const data = await pdfParse(buffer);
      const rawText = data.text || '';
      
      // Page separation: PDF standard uses form feed \f or \x0c
      const rawPages = rawText.split(/\f|\x0c/).filter((p) => p.trim().length > 0);

      const pages: ExtractedPage[] = [];

      if (rawPages.length > 0) {
        rawPages.forEach((pageContent, idx) => {
          const lines = pageContent
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          const title = lines.length > 0 && lines[0].length < 120
            ? lines[0]
            : `Page ${idx + 1}: ${fileName.replace(/\.pdf$/i, '')}`;

          pages.push({
            page: idx + 1,
            title,
            content: lines.slice(1).join('\n') || pageContent,
          });
        });
      } else {
        // Single chunk fallback
        const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
        pages.push({
          page: 1,
          title: lines[0] || fileName.replace(/\.pdf$/i, ''),
          content: lines.slice(1, 100).join('\n') || rawText,
        });
      }

      const detectedDomain = this.detectAcademicDomain(pages);
      return {
        pages,
        totalCount: pages.length,
        detectedDomain,
      };
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      const fallbackPages: ExtractedPage[] = [
        {
          page: 1,
          title: fileName.replace(/\.pdf$/i, ''),
          content: 'Document contents for academic synthesis.',
        },
      ];
      return {
        pages: fallbackPages,
        totalCount: 1,
        detectedDomain: 'GENERAL_ACADEMIC',
      };
    }
  }

  /**
   * Extract plain text from PPTX / OpenXML string
   */
  private static extractXmlText(xml: string): string[] {
    const results: string[] = [];
    const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/gi;
    let match;
    let currentParagraph: string[] = [];

    // Also look for paragraph breaks <a:p>
    const paragraphs = xml.split(/<\/a:p>/i);
    for (const p of paragraphs) {
      const pMatches: string[] = [];
      while ((match = textRegex.exec(p)) !== null) {
        const text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim();
        if (text) pMatches.push(text);
      }
      if (pMatches.length > 0) {
        results.push(pMatches.join(' '));
      }
    }

    return results;
  }

  /**
   * Detect Academic Domain based on lexical frequency
   */
  static detectAcademicDomain(pages: ExtractedPage[]): AcademicDomain {
    const fullText = pages.map((p) => `${p.title} ${p.content} ${p.notes || ''}`).join(' ').toLowerCase();

    const csKeywords = [
      'cpu', 'process', 'thread', 'algorithm', 'operating system', 'memory', 'cache',
      'scheduling', 'database', 'sql', 'compiler', 'network', 'protocol', 'stack',
      'queue', 'binary', 'latency', 'bandwidth', 'concurrency', 'deadlock', 'kernel',
      'api', 'cloud', 'docker', 'kubernetes', 'encryption', 'hash'
    ];

    const bioKeywords = [
      'cell', 'dna', 'rna', 'protein', 'enzyme', 'metabolism', 'membrane', 'mitochondria',
      'pathway', 'receptor', 'organism', 'tissue', 'glucose', 'cardiac', 'neural',
      'antibody', 'immune', 'chromosome', 'photosynthesis', 'homeostasis', 'physiology'
    ];

    const businessKeywords = [
      'revenue', 'margin', 'ebitda', 'cash flow', 'marketing', 'valuation', 'roi',
      'supply chain', 'stakeholder', 'quarterly', 'equity', 'asset', 'liability',
      'strategy', 'market share', 'customer', 'acquisition', 'cost', 'portfolio'
    ];

    const physicsKeywords = [
      'velocity', 'acceleration', 'thermodynamics', 'entropy', 'quantum', 'magnetic',
      'electric', 'force', 'mass', 'kinetic', 'potential', 'wavelength', 'photon',
      'molecule', 'orbital', 'covalent', 'reaction', 'stoichiometry', 'equilibrium'
    ];

    const score = (keywords: string[]) => {
      let count = 0;
      for (const kw of keywords) {
        const matches = fullText.match(new RegExp(`\\b${kw}\\b`, 'g'));
        if (matches) count += matches.length;
      }
      return count;
    };

    const csScore = score(csKeywords);
    const bioScore = score(bioKeywords);
    const bizScore = score(businessKeywords);
    const physScore = score(physicsKeywords);

    const max = Math.max(csScore, bioScore, bizScore, physScore);
    if (max < 3) return 'GENERAL_ACADEMIC';
    if (max === csScore) return 'ENGINEERING_CS';
    if (max === bioScore) return 'MEDICINE_BIOLOGY';
    if (max === bizScore) return 'BUSINESS_FINANCE';
    return 'PHYSICAL_SCIENCES';
  }
}
