import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LeaseLedger REST API v1 Active',
    version: '1.0.0',
    documentation: '/docs/API.md',
  });
});

export default router;
