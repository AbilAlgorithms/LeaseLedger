import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LeaseLedger REST API v1 Active',
    version: '1.0.0',
    documentation: '/docs/API.md',
  });
});

export default router;
