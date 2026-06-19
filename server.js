import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || 'changeme';

// In-memory store — reset quando o servidor reinicia
let store = { customers: [], cancellations: [], updatedAt: null };

// ─── Transformação dos dados brutos da Query 1 ───────────────────────────────

function daysBetween(dateStr) {
  if (!dateStr) return 999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function transformCustomer(row) {
  const acquirersRaw = row['Adquirentes Cadastradas'] || '';
  const acquirerList = acquirersRaw.split(',').map(s => s.trim()).filter(Boolean);

  return {
    id: row['Produtor'],
    name: row['Razão Social'],
    tier: row['Plano Atual'] || 'Sem Plano',
    mrr: Number(row['Valor Plano Atual']) || 0,
    lastLoginDays: daysBetween(row['Último login']),
    joinDate: row['Primeira Assinatura']
      ? row['Primeira Assinatura'].split('T')[0]
      : null,
    multiAcquirer: acquirerList.length > 1,
    acquirers: acquirerList,
    nextCharge: row['Data Próxima Cobrança'] || null,
    daysToNextCharge: daysUntil(row['Data Próxima Cobrança']),
    lastChargeDate: row['Data Última Cobrança'] || null,
    lastProduct: row['Último Produto'] || null,
    id_fk_plan: row['id_fk_plan'],
  };
}

// ─── Cálculo do Health Score ──────────────────────────────────────────────────

function calcEngajamento(lastLoginDays) {
  if (lastLoginDays === 0) return 100;
  if (lastLoginDays <= 1) return 85;
  if (lastLoginDays <= 3) return 70;
  if (lastLoginDays <= 7) return 50;
  if (lastLoginDays <= 14) return 25;
  return 0;
}

function calcAdocao(multiAcquirer) {
  return multiAcquirer ? 100 : 30;
}

// Saúde baseada na proximidade da próxima cobrança
function calcSaudeFinanceira(daysToNextCharge) {
  if (daysToNextCharge === null) return 50;
  if (daysToNextCharge > 15) return 100;
  if (daysToNextCharge > 7) return 80;
  if (daysToNextCharge > 0) return 60;
  if (daysToNextCharge === 0) return 30;
  return 0; // vencida
}

function enrichCustomer(c) {
  const engajamento = calcEngajamento(c.lastLoginDays);
  const adocao = calcAdocao(c.multiAcquirer);
  const saudeFinanceira = calcSaudeFinanceira(c.daysToNextCharge);

  const score = Math.round(
    engajamento * 0.40 +
    adocao * 0.35 +
    saudeFinanceira * 0.25
  );

  const status = score >= 75 ? 'Healthy' : score >= 50 ? 'Attention' : 'At Risk';

  return { ...c, score, status, engajamento, adocao, saudeFinanceira };
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

// Recebe os dados do servidor com as duas queries
app.post('/webhook', (req, res) => {
  const { token, customers, cancellations } = req.body;

  if (token !== WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  store = {
    customers: (customers || []).map(transformCustomer).map(enrichCustomer),
    cancellations: cancellations || [],
    updatedAt: new Date().toISOString(),
  };

  console.log(`[webhook] ${store.customers.length} clientes, ${store.cancellations.length} cancelamentos`);
  res.json({ ok: true, customers: store.customers.length, cancellations: store.cancellations.length });
});

app.get('/api/customers', (_req, res) => {
  res.json({ customers: store.customers, updatedAt: store.updatedAt });
});

app.get('/api/stats', (_req, res) => {
  const { customers, cancellations } = store;

  if (!customers.length) return res.json(null);

  const totalMRR = customers.reduce((a, c) => a + c.mrr, 0);
  const count = customers.length;
  const avgScore = Math.round(customers.reduce((a, c) => a + c.score, 0) / count);
  const atRisk = customers.filter(c => c.status === 'At Risk').length;
  const healthy = customers.filter(c => c.status === 'Healthy').length;
  const multiAcquirerCount = customers.filter(c => c.multiAcquirer).length;

  const cancelledCount = cancellations.length;
  const activeAtStart = count + cancelledCount;
  const logoChurnRate = activeAtStart > 0 ? (cancelledCount / activeAtStart) * 100 : 0;

  res.json({
    avgScore,
    atRisk,
    healthy,
    totalMRR,
    arr: totalMRR * 12,
    arpu: totalMRR / count,
    logoChurnRate,
    cancelledCount,
    activeCount: count,
    multiAcquirerRate: (multiAcquirerCount / count) * 100,
    updatedAt: store.updatedAt,
  });
});

// Serve o frontend (build de produção)
app.use(express.static(join(__dirname, 'dist')));
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Health Score rodando em :${PORT}`));
