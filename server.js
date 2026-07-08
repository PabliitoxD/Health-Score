import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadEnvFile } from './server/loadEnv.js';
import { fetchFromExternalApi } from './server/externalApi.js';
import { readCustomerSnapshot, writeCustomerSnapshot } from './server/customerSnapshot.js';
import { readStoreCache, writeStoreCache } from './server/storeCache.js';
import { readKnownCodes, writeKnownCodes } from './server/knownCodes.js';
import { readLeadCheckState, writeLeadCheckState } from './server/leadCheckState.js';

loadEnvFile();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));

// Obrigatória — dados de clientes vêm sempre da API real, sem fallback pra
// mock (ver server/externalApi.js e .env.example).
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || null;
// Intervalo entre sincronizações periódicas com a API real.
const SYNC_INTERVAL_MINUTES = Number(process.env.SYNC_INTERVAL_MINUTES) || 60;

// Clientes já classificados como "lead" (trial travado, nunca pagou de
// verdade) só têm o detalhe buscado de novo a cada 12h, em vez de a cada
// sincronização (hora em hora) — decisão tomada com o Pablo em 2026-07-08:
// 2x/dia é suficiente pra detectar uma conversão de lead pra pagante sem
// sobrecarregar a API externa com o detalhe de ~1000 contas que raramente
// mudam de estado. Ver leadCheckState.js e o uso de skipCodes em loadStore.
const LEAD_RECHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

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
      total: Number(row['TPV Total Valor']) || 0,
      totalTransactions: Number(row['TPV Total Transações']) || 0,
      pix: { percent: Number(row['TPV Pix Percentual']) || 0, total: Number(row['TPV Pix Total']) || 0, transactions: Number(row['TPV Pix Transações']) || 0 },
      cartao: { percent: Number(row['TPV Cartão Percentual']) || 0, total: Number(row['TPV Cartão Total']) || 0, transactions: Number(row['TPV Cartão Transações']) || 0 },
      boleto: { percent: Number(row['TPV Boleto Percentual']) || 0, total: Number(row['TPV Boleto Total']) || 0, transactions: Number(row['TPV Boleto Transações']) || 0 },
    },
    trialPlan: row['Trial Plano'] || 'no',
    cancellationRequested: !!row['Cancelamento Solicitado'],
    hasPaymentFailure: !!row['Falha Pagamento'],
    everPaid: !!row['Teve Pagamento'],
  };
}

// Janela de trial, em dias, contada por nós a partir da assinatura — não
// confiamos só no campo trial_plan da API porque ele não parece virar
// "finished"/"no" de forma confiável assim que os 7 dias acabam (conta que
// nunca converteu fica com trial_plan="yes" indefinidamente). Depois desse
// prazo, a conta some da tela de trial mesmo que a API ainda diga "yes".
const TRIAL_WINDOW_DAYS = 7;

// Trial: plan.trial_plan === "yes" E ainda dentro dos primeiros 7 dias desde
// a assinatura. Passado esse prazo, sai da tela de trial mesmo que a API
// ainda marque "yes" (ver TRIAL_WINDOW_DAYS acima).
//
// Lead: nunca teve uma cobrança paga de verdade (everPaid=false) — trial que
// não converteu, cadastro que ainda não completou a primeira cobrança, ou
// plano Parceiro. Conta só pra número de cadastros, não é "ativo" nem
// "cancelado" (nunca chegou a estar realmente ativo pra poder cancelar).
//
// Cancelado: só se aplica a quem JÁ foi um cliente pagante de verdade
// (everPaid=true). Três sinais, em ordem de confiabilidade:
// 1. Voltou pro Gratuito (mrr=0/tier="Gratuito") depois de já ter pago —
//    sinal mais confiável: descobrimos testando a conta 89106111 que a API
//    reseta o plano quando cancela de vez, SEM marcar isso em
//    cancellation.client_request nem em payment_failure.
// 2. Falha de pagamento (não houve renovação).
// 3. Solicitação do cliente — só passa a valer no fim do período já pago;
//    até lá a conta continua ativa (regra confirmada com o time: "quando o
//    cliente solicita o cancelamento, a conta é cancelada ao final do
//    período contratado").
//
// Ativo: todo o resto (já foi pagante e não tem cancelamento efetivado).
//
// Validação de sanidade pós-sync (ver validateAccountStatusHeuristics
// abaixo): "active" com trial_plan="yes" e nunca cobrado é exatamente o
// padrão do bug encontrado em 2026-07-08, onde 1017 contas em trial travado
// (a API nunca reverte trial_plan pra "no"/"finished" quando não convertem)
// eram contadas como clientes ativos só por já terem um plano pago
// selecionado (ver "Teve Pagamento" em server/externalApi.js).
function deriveAccountStatus(c) {
  const daysSinceJoin = c.joinDate ? Math.floor((Date.now() - new Date(c.joinDate).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const inTrialWindow = daysSinceJoin !== null && daysSinceJoin <= TRIAL_WINDOW_DAYS;

  if (c.trialPlan === 'yes' && inTrialWindow) return 'trial';
  if (!c.everPaid) return 'lead';

  const revertedToFree = c.tier === 'Gratuito' || c.mrr === 0;
  if (revertedToFree || c.hasPaymentFailure) return 'cancelled';

  if (c.cancellationRequested) {
    if (!c.lastChargeDate) return 'cancelled';
    return Date.now() > new Date(c.lastChargeDate).getTime() ? 'cancelled' : 'active';
  }
  return 'active';
}

// Roda a cada sincronização, depois de todos os clientes já enriquecidos com
// accountStatus. Não bloqueia nem corrige nada sozinho — só avisa no log se
// os números fugirem do padrão esperado, pra pegar cedo uma eventual
// repetição do bug de 2026-07-08 (ou uma mudança de comportamento da API
// externa que quebre a mesma suposição de novo).
function validateAccountStatusHeuristics(customers) {
  const activeNeverCharged = customers.filter(
    (c) => c.accountStatus === 'active' && c.trialPlan === 'yes' && !c.lastChargeDate
  );
  if (activeNeverCharged.length > 0) {
    console.warn(
      `[validate] ${activeNeverCharged.length} cliente(s) marcado(s) como "active" com trial_plan="yes" e sem nenhuma cobrança registrada — ` +
      `possível regressão do bug de contagem de ativos de 2026-07-08 (ver "Teve Pagamento" em server/externalApi.js). ` +
      `Exemplos: ${activeNeverCharged.slice(0, 5).map((c) => `${c.id} (${c.name})`).join(', ')}`
    );
  }

  const leadWithRealCharge = customers.filter(
    (c) => c.accountStatus === 'lead' && !!c.lastChargeDate
  );
  if (leadWithRealCharge.length > 0) {
    console.warn(
      `[validate] ${leadWithRealCharge.length} cliente(s) marcado(s) como "lead" mas com data de última cobrança preenchida — ` +
      `podem estar sendo excluídos indevidamente da contagem de ativos. ` +
      `Exemplos: ${leadWithRealCharge.slice(0, 5).map((c) => `${c.id} (${c.name})`).join(', ')}`
    );
  }
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

// A sincronização com a conta real leva vários minutos (paginação de contas +
// detalhe de cada cliente, throttled). Em vez de deixar o painel "no escuro"
// até o ciclo inteiro terminar, cada conta processada atualiza store.customers
// AO VIVO conforme chega (ver onAccount abaixo) — o dashboard já vai mostrando
// e refrescando clientes um a um durante a sincronização.
//
// Se a sincronização falhar no meio do caminho, desfazemos essas atualizações
// parciais e voltamos pro último estado bom conhecido (lastGoodStore) — falha
// numa sincronização (inicial ou periódica) nunca deve deixar o store numa
// mistura de dado novo pela metade e dado velho.
async function loadStore(isInitialLoad) {
  if (!EXTERNAL_API_URL) {
    throw new Error(
      'EXTERNAL_API_URL não configurada. Configure EXTERNAL_API_URL/EXTERNAL_API_USER/EXTERNAL_API_PASS ' +
      '(veja .env.example) — o servidor não usa mais dados mockados.'
    );
  }

  const lastGoodStore = store;

  try {
    const snapshot = readCustomerSnapshot();
    const previousScores = Object.fromEntries(Object.entries(snapshot).map(([id, s]) => [id, s.score]));
    const previousMrrs = Object.fromEntries(Object.entries(snapshot).map(([id, s]) => [id, s.mrr]));

    // Também serve de "estado anterior" pra reaproveitar leads pulados (ver
    // skipCodes abaixo) — só é mutado pelo onAccount conforme o detalhe de
    // cada conta É buscado de verdade, então quem for pulado neste ciclo
    // continua apontando pro objeto da sincronização anterior sem mudança.
    const liveCustomersById = new Map(lastGoodStore.customers.map((c) => [c.id, c]));

    // Sempre rechecamos o detalhe de qualquer código já confirmado como
    // pagante de verdade em algum momento — sem isso, uma conta que cancela
    // e volta pro Gratuito some da varredura da listagem pra sempre (ver
    // server/knownCodes.js e a descoberta na conta 89106111).
    const knownCodes = readKnownCodes();

    // Leads (trial travado, nunca pagou de verdade) checados há menos de
    // LEAD_RECHECK_INTERVAL_MS não têm o detalhe buscado de novo agora —
    // ver leadCheckState.js e a decisão tomada com o Pablo em 2026-07-08.
    const leadCheckState = readLeadCheckState();
    const skipCodes = new Set(
      lastGoodStore.customers
        .filter((c) => {
          if (c.accountStatus !== 'lead') return false;
          const lastChecked = leadCheckState[c.id];
          return !!lastChecked && Date.now() - new Date(lastChecked).getTime() < LEAD_RECHECK_INTERVAL_MS;
        })
        .map((c) => c.id)
    );

    const data = await fetchFromExternalApi(EXTERNAL_API_URL, previousScores, previousMrrs, (row) => {
      const enriched = enrichCustomer(transformCustomer(row));
      liveCustomersById.set(enriched.id, enriched);
      store = { ...lastGoodStore, customers: Array.from(liveCustomersById.values()) };
    }, knownCodes, skipCodes);

    const freshCustomers = (data.customers || []).map(transformCustomer).map(enrichCustomer);
    // Leads pulados entram na store de novo, sem alteração — só não tiveram
    // o detalhe rebuscado nesse ciclo.
    const reusedLeadCustomers = Array.from(skipCodes).map((code) => liveCustomersById.get(code)).filter(Boolean);
    const customers = [...freshCustomers, ...reusedLeadCustomers];
    validateAccountStatusHeuristics(customers);
    writeKnownCodes([...knownCodes, ...customers.filter((c) => c.everPaid).map((c) => c.id)]);

    // "Checado agora" só pra quem teve detalhe buscado de verdade; quem foi
    // pulado mantém o timestamp antigo (ainda dentro da janela). Quem deixou
    // de ser lead (converteu ou cancelou de vez) sai do controle.
    const now = new Date().toISOString();
    const nextLeadCheckState = { ...leadCheckState };
    freshCustomers.forEach((c) => {
      if (c.accountStatus === 'lead') nextLeadCheckState[c.id] = now;
      else delete nextLeadCheckState[c.id];
    });
    writeLeadCheckState(nextLeadCheckState);

    store = {
      customers,
      cancellations: data.cancellations || [],
      nonRenewals: data.nonRenewals || [],
      updatedAt: new Date().toISOString(),
    };

    writeCustomerSnapshot(Object.fromEntries(customers.map((c) => [c.id, { score: c.score, mrr: c.mrr }])));
    writeStoreCache(store);
    console.log(`[loadStore] Sincronizado com a API externa: ${store.customers.length} clientes, ${store.cancellations.length} cancelamentos, ${store.nonRenewals.length} não renovados`);
  } catch (err) {
    console.error(`[loadStore] Falha ao sincronizar com a API externa: ${err.message}`);
    store = lastGoodStore;
    if (isInitialLoad) {
      console.warn('[loadStore] Carga inicial sem sucesso — mantendo o cache em disco (se existir); a próxima sincronização periódica tenta de novo.');
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

// Cache em disco do último sync bem-sucedido — carrega ANTES de qualquer
// chamada de rede, pra o painel já subir com dado real (mesmo desatualizado)
// em vez de vazio enquanto sincroniza de novo.
const cachedStore = readStoreCache();
if (cachedStore) {
  store = cachedStore;
  console.log(`[loadStore] Cache em disco carregado: ${store.customers.length} clientes (última sincronização: ${store.updatedAt}).`);
}

// O servidor sobe e já responde requisições imediatamente — a sincronização
// roda em segundo plano, sem bloquear o boot. Antes disso, o deploy inteiro
// ficava fora do ar até o primeiro sync completo (~15-20min com dados reais),
// porque app.listen só era chamado depois do await.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Health Score rodando em :${PORT}`));

if (EXTERNAL_API_URL) {
  loadStore(true).then(() => {
    setInterval(() => loadStore(false), SYNC_INTERVAL_MINUTES * 60 * 1000);
    console.log(`[loadStore] Sincronização periódica a cada ${SYNC_INTERVAL_MINUTES} minuto(s).`);
  });
} else {
  console.error(
    '[loadStore] EXTERNAL_API_URL não configurada — servidor no ar só com o cache em disco (se existir), sem sincronização.'
  );
}
