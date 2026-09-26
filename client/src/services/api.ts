// ============================================================================
// File: client/src/services/api.ts
// VisualMind AI Typed Client API Service
// ============================================================================
import type {
  DocumentRecord,
  KnowledgeMapRecord,
  QuizRecord,
  DiagramType,
  GranularityLevel,
  AcademicDomain,
} from '../../../shared/schema';

const API_SERVER = import.meta.env.VITE_API_URL 
  ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') 
  : '';
const API_BASE = `${API_SERVER}/api/v1`;

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('visualmind_token') || 'demo-token';
  return {
    Authorization: `Bearer ${token}`,
  };
}

export const api = {
  // Document endpoints
  async uploadDocument(file: File, options?: { title?: string; academicDomain?: AcademicDomain }): Promise<DocumentRecord> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.title) formData.append('title', options.title);
    if (options?.academicDomain) formData.append('academicDomain', options.academicDomain);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Document upload failed');
    }

    const data = await res.json();
    return data.document;
  },

  async listDocuments(): Promise<DocumentRecord[]> {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.documents || [];
  },

  async getDocument(id: string): Promise<DocumentRecord> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch document');
    const data = await res.json();
    return data.document;
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  async seedSampleDocuments(): Promise<void> {
    await fetch(`${API_BASE}/documents/seed-sample`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
  },

  // Knowledge Map endpoints
  async generateMap(params: {
    documentId: string;
    diagramType: DiagramType;
    granularity: GranularityLevel;
    focusArea?: string;
  }): Promise<KnowledgeMapRecord> {
    const res = await fetch(`${API_BASE}/maps/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Generation failed' }));
      throw new Error(err.error || 'Failed to generate visual knowledge map');
    }

    const data = await res.json();
    return data.map;
  },

  async listMaps(): Promise<KnowledgeMapRecord[]> {
    const res = await fetch(`${API_BASE}/maps`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch knowledge maps');
    const data = await res.json();
    return data.maps || [];
  },

  async getMap(id: string): Promise<KnowledgeMapRecord> {
    const res = await fetch(`${API_BASE}/maps/${id}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch knowledge map');
    const data = await res.json();
    return data.map;
  },

  async getPublicMap(publicSlug: string): Promise<KnowledgeMapRecord> {
    const res = await fetch(`${API_BASE}/maps/public/${publicSlug}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Map not found' }));
      throw new Error(err.error || 'Failed to fetch public map');
    }
    const data = await res.json();
    return data.map;
  },

  async toggleVisibility(id: string, isPublic: boolean): Promise<KnowledgeMapRecord> {
    const res = await fetch(`${API_BASE}/maps/${id}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ isPublic }),
    });
    if (!res.ok) throw new Error('Failed to update map visibility');
    const data = await res.json();
    return data.map;
  },

  // Active Recall Quiz endpoints
  async generateQuiz(mapId: string, questionCount: number = 5): Promise<QuizRecord> {
    const res = await fetch(`${API_BASE}/quizzes/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ mapId, questionCount }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Quiz generation failed' }));
      throw new Error(err.error || 'Failed to generate active recall quiz');
    }

    const data = await res.json();
    return data.quiz;
  },

  async getQuiz(mapId: string): Promise<QuizRecord | null> {
    const res = await fetch(`${API_BASE}/quizzes/${mapId}`, {
      headers: getAuthHeader(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch quiz');
    const data = await res.json();
    return data.quiz;
  },
};
