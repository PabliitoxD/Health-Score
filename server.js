import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadEnvFile } from './server/loadEnv.js';
import { startSync } from './server/services/syncEngine.js';
import authRoutes from './server/routes/auth.js';
import customersRoutes from './server/routes/customers.js';
import statsRoutes from './server/routes/stats.js';
import cancellationsRoutes from './server/routes/cancellations.js';
import surveysRoutes from './server/routes/surveys.js';

loadEnvFile();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

// ─── Rotas ───────────────────────────────────────────────────────────────────
// Cada aba do dashboard tem seu próprio módulo de rotas (ver server/routes/) —
// Dashboard/Clientes usam customers+stats, Cancelamentos e Pesquisas são
// autocontidos. A aba Empresa não tem rota própria: é uma agregação
// client-side dos recursos abaixo.

app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api', cancellationsRoutes);
app.use('/api', surveysRoutes);

// Serve o frontend (build de produção)
app.use(express.static(join(__dirname, 'dist')));
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// O servidor sobe e já responde requisições imediatamente — a sincronização
// roda em segundo plano, sem bloquear o boot. Antes disso, o deploy inteiro
// ficava fora do ar até o primeiro sync completo (~15-20min com dados reais),
// porque app.listen só era chamado depois do await.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Health Score rodando em :${PORT}`));

startSync();
