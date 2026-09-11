import { Router } from 'express';

const router = Router();

// Health check uses a flat shape (no nested "data") to match the required response contract.
router.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Incident Response Platform API is running' });
});

export default router;
