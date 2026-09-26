// ============================================================================
// File: server/src/routes/api.ts
// VisualMind AI RESTful API Router (/api/v1)
// ============================================================================
import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/documentController';
import { MapController } from '../controllers/mapController';
import { QuizController } from '../controllers/quizController';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware';
import { aiGenerationLimiter } from '../middleware/rateLimiter';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB maximum payload as required
  },
});

export const apiRouter = Router();

// ============================================================================
// DOCUMENT ROUTES
// ============================================================================
apiRouter.post('/documents/upload', requireAuth, upload.single('file'), DocumentController.uploadDocument);
apiRouter.get('/documents', requireAuth, DocumentController.listDocuments);
apiRouter.get('/documents/:id', requireAuth, DocumentController.getDocument);
apiRouter.delete('/documents/:id', requireAuth, DocumentController.deleteDocument);
apiRouter.post('/documents/seed-sample', optionalAuth, DocumentController.seedSampleDocuments);

// ============================================================================
// KNOWLEDGE MAP ROUTES
// ============================================================================
apiRouter.post('/maps/generate', requireAuth, aiGenerationLimiter, MapController.generateMap);
apiRouter.get('/maps', requireAuth, MapController.listMaps);
apiRouter.get('/maps/:id', optionalAuth, MapController.getMap);
apiRouter.get('/maps/public/:publicSlug', MapController.getPublicMap);
apiRouter.patch('/maps/:id/visibility', requireAuth, MapController.toggleVisibility);

// ============================================================================
// QUIZ ROUTES
// ============================================================================
apiRouter.post('/quizzes/generate', requireAuth, aiGenerationLimiter, QuizController.generateQuiz);
apiRouter.get('/quizzes/:mapId', optionalAuth, QuizController.getQuizByMapId);

// ============================================================================
// SYSTEM & HEALTH STATUS
// ============================================================================
apiRouter.get('/status', (req, res) => {
  res.json({
    name: 'VisualMind AI Backend Engine',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});
