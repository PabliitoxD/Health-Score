import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mockCustomersRaw, mockCancellations } from './server/fixtures/mockCustomers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

// Quando definida, os dados passam a vir da API real em vez do mock.
// Contrato esperado: GET <EXTERNAL_API_URL> retornando { customers: [...], cancellations: [...] }
// no mesmo formato bruto usado em server/fixtures/mockCustomers.js.
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || null;

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
  const previousMrrRaw = row['MRR Anterior'];
  const previousScoreRaw = row['Score Anterior'];

  return {
    id: row['Produtor'],
    name: row['Razão Social'],
    tier: row['Plano Atual'] || 'Sem Plano',
    mrr: Number(row['Valor Plano Atual']) || 0,
    previousMrr: previousMrrRaw === null || previousMrrRaw === undefined ? null : Number(previousMrrRaw),
    previousScore: previousScoreRaw === null || previousScoreRaw === undefined ? null : Number(previousScoreRaw),
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

// Tendência do score em relação ao snapshot anterior (sem histórico = estável)
function calcTrend(score, previousScore) {
  if (previousScore === null || previousScore === undefined) return 'stable';
  const delta = score - previousScore;
  if (delta >= 3) return 'up';
  if (delta <= -3) return 'down';
  return 'stable';
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
  const trend = calcTrend(score, c.previousScore);

  return { ...c, score, status, trend, engajamento, adocao, saudeFinanceira };
}

// ─── Retenção de receita (NRR/GRR) ────────────────────────────────────────────

function calcRevenueRetention(customers, cancellations) {
  const withHistory = customers.filter(c => c.previousMrr !== null && c.previousMrr !== undefined);
  const churnedMrr = cancellations.reduce((a, c) => a + (Number(c.mrr) || 0), 0);
  const startingMrr = withHistory.reduce((a, c) => a + c.previousMrr, 0) + churnedMrr;

  if (startingMrr <= 0) {
    return { nrr: 100, grr: 100, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0 };
  }

  const expansionMrr = withHistory.reduce((a, c) => a + Math.max(0, c.mrr - c.previousMrr), 0);
  const contractionMrr = withHistory.reduce((a, c) => a + Math.max(0, c.previousMrr - c.mrr), 0);

  const nrr = ((startingMrr + expansionMrr - contractionMrr - churnedMrr) / startingMrr) * 100;
  const grr = ((startingMrr - contractionMrr - churnedMrr) / startingMrr) * 100;

  return { nrr, grr, expansionMrr, contractionMrr, churnedMrr };
}

// ─── Fonte de dados: API externa (quando configurada) ou mock ───────────────

// Stub — implementar quando a URL da API real estiver disponível.
// Deve devolver { customers, cancellations } no mesmo formato bruto do mock.
async function fetchFromExternalApi(url) {
  throw new Error(
    `Integração com API externa ainda não implementada (EXTERNAL_API_URL=${url}). ` +
    'Implemente fetchFromExternalApi() em server.js.'
  );
}

async function loadStore() {
  let rawCustomers = mockCustomersRaw;
  let rawCancellations = mockCancellations;

  if (EXTERNAL_API_URL) {
    try {
      const data = await fetchFromExternalApi(EXTERNAL_API_URL);
      rawCustomers = data.customers || [];
      rawCancellations = data.cancellations || [];
    } catch (err) {
      console.error(`[loadStore] Falha ao buscar API externa: ${err.message}`);
      console.warn('[loadStore] Usando dados mockados como fallback.');
    }
  } else {
    console.warn('[loadStore] EXTERNAL_API_URL não configurada — usando dados mockados.');
  }

  store = {
    customers: rawCustomers.map(transformCustomer).map(enrichCustomer),
    cancellations: rawCancellations,
    updatedAt: new Date().toISOString(),
  };

  console.log(`[loadStore] ${store.customers.length} clientes, ${store.cancellations.length} cancelamentos carregados`);
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

app.get('/api/customers', (_req, res) => {
  res.json({ customers: store.customers, updatedAt: store.updatedAt });
});

app.get('/api/cancellations', (_req, res) => {
  res.json({ cancellations: store.cancellations, updatedAt: store.updatedAt });
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

  const { nrr, grr, expansionMrr, contractionMrr, churnedMrr } = calcRevenueRetention(customers, cancellations);

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
    nrr,
    grr,
    expansionMrr,
    contractionMrr,
    churnedMrr,
    updatedAt: store.updatedAt,
  });
});

// Serve o frontend (build de produção)
app.use(express.static(join(__dirname, 'dist')));
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

await loadStore();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Health Score rodando em :${PORT}`));
