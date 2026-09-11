import { Router } from 'express';
import * as incidentController from '../controllers/incidentController.js';
import rcaRoutes from './rcaRoutes.js';

const router = Router();

// Evaluate-SLA is a fixed path and must be declared before the dynamic :incidentId GET route.
router.post('/evaluate-sla', incidentController.evaluateSla);

router.post('/', incidentController.createIncident);
router.get('/', incidentController.listIncidents);
router.get('/:incidentId', incidentController.getIncident);
router.patch('/:incidentId', incidentController.updateIncident);

router.get('/:incidentId/related', incidentController.getRelatedIncidents);
router.post('/:incidentId/link/:relatedIncidentId', incidentController.linkIncidents);

router.use('/:incidentId/rca', rcaRoutes);

export default router;
