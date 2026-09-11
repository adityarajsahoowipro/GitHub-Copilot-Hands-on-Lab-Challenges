import { Router } from 'express';
import { getMetrics } from '../controllers/dashboardController.js';

const router = Router();

router.get('/metrics', getMetrics);

export default router;
