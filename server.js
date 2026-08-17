import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadEnvFile } from './server/loadEnv.js';
import { startSync } from './server/sync/engine.js';
import authRoutes from './server/auth/routes.js';
import customersRoutes from './server/customers/routes.js';
import dashboardRoutes from './server/dashboard/routes.js';
import cancellationsRoutes from './server/cancellations/routes.js';
import surveysRoutes from './server/surveys/routes.js';
import historyRoutes from './server/history/routes.js';

loadEnvFile();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

// ─── Rotas ───────────────────────────────────────────────────────────────────
// Cada aba do dashboard tem sua própria pasta em server/ com rotas + estado
// específico (ver server/{dashboard,customers,cancellations,surveys}/) — a
// aba Empresa não tem pasta própria: é uma agregação client-side dos
// recursos das outras abas, sem nenhum endpoint exclusivo. server/sync/
// concentra o motor de sincronização com a API externa (usado por
// Dashboard/Clientes/Cancelamentos); server/middleware/ e server/auth/ são
// infraestrutura compartilhada, não abas.

app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/stats', dashboardRoutes);
app.use('/api', cancellationsRoutes);
app.use('/api', surveysRoutes);
app.use('/api', historyRoutes);

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
