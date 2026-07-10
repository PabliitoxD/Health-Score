import { Router } from 'express';
import { checkCredentials } from '../middleware/requireAuth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!checkCredentials(username, password)) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  res.json({ ok: true });
});

export default router;
