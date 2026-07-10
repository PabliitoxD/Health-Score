import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getStore } from '../sync/engine.js';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  const store = getStore();
  res.json({ customers: store.customers, updatedAt: store.updatedAt });
});

export default router;
