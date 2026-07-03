import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadEnvFile } from './server/loadEnv.js';
import { fetchFromExternalApi } from './server/externalApi.js';
import { readCustomerSnapshot, writeCustomerSnapshot } from './server/customerSnapshot.js';

loadEnvFile();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

// Obrigatória — dados de clientes vêm sempre da API real, sem fallback pra
// mock (ver server/externalApi.js e .env.example).
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || null;
// Intervalo entre sincronizações periódicas com a API real.
const SYNC_INTERVAL_MINUTES = Number(process.env.SYNC_INTERVAL_MINUTES) || 60;

// In-memory store — reset quando o servidor reinicia
let store = { customers: [], cancellations: [], nonRenewals: [], updatedAt: null };

// In-memory store de pesquisas/respostas — mesma limitação (reset a cada restart),
// mas centralizado no servidor em vez de localStorage por navegador. Sem seed
// mockada: começa vazio e só popula com pesquisas disparadas de verdade.
let surveyStore = { surveys: [], responses: [] };

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

// Meses entre duas datas, arredondado pra baixo. Reflete só o ciclo de
// assinatura ATUAL (desde "Primeira Assinatura") — a API não expõe o
// histórico de ciclos anteriores caso o cliente já tenha cancelado e voltado
// a assinar em outro momento, então não dá pra somar através desses gaps
// retroativamente (ver conversa sobre "meses de assinatura somados").
function monthsBetween(startDateStr, endDateStr) {
  if (!startDateStr) return null;
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
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
    email: row['E-mail'] || null,
    phone: row['Telefone'] || null,
    tpv: {
      pix: { percent: Number(row['TPV Pix Percentual']) || 0, total: Number(row['TPV Pix Total']) || 0 },
      cartao: { percent: Number(row['TPV Cartão Percentual']) || 0, total: Number(row['TPV Cartão Total']) || 0 },
      boleto: { percent: Number(row['TPV Boleto Percentual']) || 0, total: Number(row['TPV Boleto Total']) || 0 },
    },
    trialPlan: row['Trial Plano'] || 'no',
    cancellationRequested: !!row['Cancelamento Solicitado'],
    hasPaymentFailure: !!row['Falha Pagamento'],
  };
}

// Trial: plan.trial_plan === "yes" — ainda não é cliente pagante, contagem
// à parte, não entra nas métricas de "ativos".
//
// Cancelado: falha de pagamento SEMPRE conta como cancelado (não houve
// renovação). Cancelamento por solicitação do cliente só passa a valer no
// fim do período já pago — até lá a conta continua ativa (regra confirmada
// com o time: "quando o cliente solicita o cancelamento, a conta é
// cancelada ao final do período contratado"). Usamos a data da última
// cobrança (fim do ciclo pago) como referência desse período.
//
// Ativo: todo o resto.
function deriveAccountStatus(c) {
  if (c.trialPlan === 'yes') return 'trial';
  if (c.hasPaymentFailure) return 'cancelled';
  if (c.cancellationRequested) {
    if (!c.lastChargeDate) return 'cancelled';
    return Date.now() > new Date(c.lastChargeDate).getTime() ? 'cancelled' : 'active';
  }
  return 'active';
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
  const accountStatus = deriveAccountStatus(c);
  const subscriptionMonths = monthsBetween(c.joinDate, accountStatus === 'cancelled' ? c.lastChargeDate : null);

  return { ...c, score, status, trend, engajamento, adocao, saudeFinanceira, accountStatus, subscriptionMonths };
}

// ─── Retenção de receita (NRR/GRR) ────────────────────────────────────────────

function calcRevenueRetention(customers, cancellations) {
  const withHistory = customers.filter(c => c.previousMrr !== null && c.previousMrr !== undefined);
  const churnedMrr = cancellations.reduce((a, c) => a + (Number(c.mrr) || 0), 0);
  const startingMrr = withHistory.reduce((a, c) => a + c.previousMrr, 0) + churnedMrr;

  // Clientes sem previousMrr nao tem historico anterior — por definicao, sao novos.
  const newMrr = customers
    .filter(c => c.previousMrr === null || c.previousMrr === undefined)
    .reduce((a, c) => a + c.mrr, 0);

  if (startingMrr <= 0) {
    return { nrr: 100, grr: 100, newMrr, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0 };
  }

  const expansionMrr = withHistory.reduce((a, c) => a + Math.max(0, c.mrr - c.previousMrr), 0);
  const contractionMrr = withHistory.reduce((a, c) => a + Math.max(0, c.previousMrr - c.mrr), 0);

  const nrr = ((startingMrr + expansionMrr - contractionMrr - churnedMrr) / startingMrr) * 100;
  const grr = ((startingMrr - contractionMrr - churnedMrr) / startingMrr) * 100;

  return { nrr, grr, newMrr, expansionMrr, contractionMrr, churnedMrr };
}

// ─── Fonte de dados: API externa (obrigatória, sem fallback pra mock) ───────

// isInitialLoad=true (boot): sem EXTERNAL_API_URL configurada, o servidor
// recusa a subir — não tem mais dado mockado pra usar de fallback. Falha na
// própria chamada à API (rede, credencial, etc.) não derruba o processo: o
// servidor sobe vazio e a sincronização periódica tenta de novo.
// isInitialLoad=false (sincronização periódica): falha MANTÉM o store
// atual — com clientes reais em produção, uma falha temporária da API não
// pode esvaziar os dados que já estavam servindo o painel.
async function loadStore(isInitialLoad) {
  if (!EXTERNAL_API_URL) {
    throw new Error(
      'EXTERNAL_API_URL não configurada. Configure EXTERNAL_API_URL/EXTERNAL_API_USER/EXTERNAL_API_PASS ' +
      '(veja .env.example) — o servidor não usa mais dados mockados.'
    );
  }

  try {
    const snapshot = readCustomerSnapshot();
    const previousScores = Object.fromEntries(Object.entries(snapshot).map(([id, s]) => [id, s.score]));
    const previousMrrs = Object.fromEntries(Object.entries(snapshot).map(([id, s]) => [id, s.mrr]));

    const data = await fetchFromExternalApi(EXTERNAL_API_URL, previousScores, previousMrrs);
    const customers = (data.customers || []).map(transformCustomer).map(enrichCustomer);

    store = {
      customers,
      cancellations: data.cancellations || [],
      nonRenewals: data.nonRenewals || [],
      updatedAt: new Date().toISOString(),
    };

    writeCustomerSnapshot(Object.fromEntries(customers.map((c) => [c.id, { score: c.score, mrr: c.mrr }])));
    console.log(`[loadStore] Sincronizado com a API externa: ${store.customers.length} clientes, ${store.cancellations.length} cancelamentos, ${store.nonRenewals.length} não renovados`);
  } catch (err) {
    console.error(`[loadStore] Falha ao sincronizar com a API externa: ${err.message}`);
    if (isInitialLoad) {
      console.warn('[loadStore] Carga inicial sem dados — o servidor sobe vazio; a próxima sincronização periódica tenta de novo.');
    } else {
      console.warn('[loadStore] Mantendo os dados da última sincronização bem-sucedida.');
    }
  }
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

app.get('/api/customers', (_req, res) => {
  res.json({ customers: store.customers, updatedAt: store.updatedAt });
});

app.get('/api/cancellations', (_req, res) => {
  res.json({ cancellations: store.cancellations, updatedAt: store.updatedAt });
});

app.get('/api/non-renewals', (_req, res) => {
  res.json({ nonRenewals: store.nonRenewals, updatedAt: store.updatedAt });
});

app.get('/api/stats', (_req, res) => {
  const { customers } = store;

  if (!customers.length) return res.json(null);

  // "Clientes ativos" (MRR Total, Média de Saúde etc.) considera só quem
  // tem plano pago e não teve a conta cancelada (ver deriveAccountStatus).
  // Trial é contagem à parte — ainda não é receita/cliente pagante.
  const activeCustomers = customers.filter(c => c.accountStatus === 'active');
  const cancelledCustomers = customers.filter(c => c.accountStatus === 'cancelled');
  const trialCount = customers.filter(c => c.accountStatus === 'trial').length;

  if (!activeCustomers.length) {
    return res.json({
      avgScore: 0, atRisk: 0, healthy: 0, totalMRR: 0, arr: 0, arpu: 0,
      logoChurnRate: 0, cancelledCount: cancelledCustomers.length, activeCount: 0, trialCount,
      multiAcquirerRate: 0, nrr: 100, grr: 100, newMrr: 0, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0,
      updatedAt: store.updatedAt,
    });
  }

  const totalMRR = activeCustomers.reduce((a, c) => a + c.mrr, 0);
  const count = activeCustomers.length;
  const avgScore = Math.round(activeCustomers.reduce((a, c) => a + c.score, 0) / count);
  const atRisk = activeCustomers.filter(c => c.status === 'At Risk').length;
  const healthy = activeCustomers.filter(c => c.status === 'Healthy').length;
  const multiAcquirerCount = activeCustomers.filter(c => c.multiAcquirer).length;

  const cancelledCount = cancelledCustomers.length;
  const activeAtStart = count + cancelledCount;
  const logoChurnRate = activeAtStart > 0 ? (cancelledCount / activeAtStart) * 100 : 0;

  const { nrr, grr, newMrr, expansionMrr, contractionMrr, churnedMrr } = calcRevenueRetention(activeCustomers, cancelledCustomers);

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
    trialCount,
    multiAcquirerRate: (multiAcquirerCount / count) * 100,
    nrr,
    grr,
    newMrr,
    expansionMrr,
    contractionMrr,
    churnedMrr,
    updatedAt: store.updatedAt,
  });
});

// ─── Pesquisas (NPS/CSAT) ──────────────────────────────────────────────────

app.post('/api/surveys', (req, res) => {
  surveyStore.surveys.unshift(req.body);
  res.json({ ok: true });
});

app.get('/api/surveys', (_req, res) => {
  res.json({ surveys: surveyStore.surveys });
});

app.post('/api/survey-responses', (req, res) => {
  const response = req.body;
  surveyStore.responses = surveyStore.responses.filter(r => r.token !== response.token);
  surveyStore.responses.push(response);
  surveyStore.surveys = surveyStore.surveys.map(s =>
    s.token === response.token ? { ...s, status: 'responded', score: response.score } : s
  );
  res.json({ ok: true });
});

app.get('/api/survey-responses', (_req, res) => {
  res.json({ responses: surveyStore.responses });
});

// Serve o frontend (build de produção)
app.use(express.static(join(__dirname, 'dist')));
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

await loadStore(true);

setInterval(() => loadStore(false), SYNC_INTERVAL_MINUTES * 60 * 1000);
console.log(`[loadStore] Sincronização periódica a cada ${SYNC_INTERVAL_MINUTES} minuto(s).`);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Health Score rodando em :${PORT}`));
