// src/routes/askHomeBrainRoutes.ts
import { Router } from 'express';
import { askHomeBrain } from '../controllers/askHomeBrainController';

const router = Router();

// POST /api/askHomeBrain
router.post('/askHomeBrain', askHomeBrain);

export default router;