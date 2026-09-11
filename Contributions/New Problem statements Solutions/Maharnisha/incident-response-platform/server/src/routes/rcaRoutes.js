import { Router } from 'express';
import * as rcaController from '../controllers/rcaController.js';

// mergeParams lets this router read :incidentId from the parent incidentRoutes mount point.
const router = Router({ mergeParams: true });

router.post('/generate', rcaController.generateRca);
router.get('/', rcaController.getRca);
router.put('/', rcaController.updateRca);

export default router;
