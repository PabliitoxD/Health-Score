import { fetchFromExternalApi } from '../externalApi.js';
import { readCustomerSnapshot, writeCustomerSnapshot } from '../customerSnapshot.js';
import { readStoreCache, writeStoreCache } from '../storeCache.js';
import { readKnownCodes, writeKnownCodes } from '../knownCodes.js';
import { readLeadCheckState, writeLeadCheckState } from '../leadCheckState.js';
import { readCancelledCheckState, writeCancelledCheckState } from '../cancelledCheckState.js';
import { readCancellationDetectedAt, writeCancellationDetectedAt } from '../cancellationDates.js';
import { readListingScanState, writeListingScanState } from '../listingScanState.js';

// Lidas dentro das funções (não no topo do módulo) de propósito: os módulos
// importados por server.js são avaliados ANTES do loadEnvFile() rodar (ver
// server.js) — ler process.env aqui em cima pegaria o valor de antes do
// .env carregar em desenvolvimento local (produção não usa .env, então lá
// nunca dava problema; ver server/loadEnv.js).
function getExternalApiUrl() {
  return process.env.EXTERNAL_API_URL || null;
}

// Clientes já classificados como "lead" (trial travado, nunca pagou de
// verdade) só têm o detalhe buscado de novo a cada 12h, em vez de a cada
// sincronização (hora em hora) — decisão tomada com o Pablo em 2026-07-08:
// 2x/dia é suficiente pra detectar uma conversão de lead pra pagante sem
// sobrecarregar a API externa com o detalhe de ~1000 contas que raramente
// mudam de estado. Ver leadCheckState.js e o uso de skipCodes em loadStore.
const LEAD_RECHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

// Contas já confirmadas como "cancelled" também não precisam ter o detalhe
// rebuscado a cada sincronização (hora em hora) — reativação é rara o
// suficiente pra ser detectada 1x/dia, sem custar chamada de API à toa pra
// quem já saiu de vez. Decisão tomada com o Pablo em 2026-07-09: contas
// canceladas dominavam a maior parte do tempo de sync que sobrava depois do
// skip de leads, sem nunca mudar de estado entre um ciclo e outro. Ver
// server/cancelledCheckState.js.
const CANCELLED_RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Margem de segurança subtraída da última varredura completa/incremental
// antes de usá-la como corte pra próxima varredura (ver sinceDate em
// loadStore e fetchPaidAccountCodes em server/externalApi.js) — cobre
// atraso na sincronização e qualquer diferença de relógio com a API
// externa. Bem maior que o intervalo de sync (1h) de propósito, pra nunca
// arriscar perder um cadastro novo por causa de alguns minutos de folga.
const LISTING_SCAN_SAFETY_BUFFER_MS = 3 * 60 * 60 * 1000;

// In-memory store — reset quando o servidor reinicia
let store = { customers: [], cancellations: [], nonRenewals: [], updatedAt: null };

// Cache em disco do último sync bem-sucedido — carrega ANTES de qualquer
// chamada de rede, pra o painel já subir com dado real (mesmo desatualizado)
// em vez de vazio enquanto sincroniza de novo.
const cachedStore = readStoreCache();
if (cachedStore) {
  store = cachedStore;
  console.log(`[loadStore] Cache em disco carregado: ${store.customers.length} clientes (última sincronização: ${store.updatedAt}).`);
}

export function getStore() {
  return store;
}

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

export function calcRevenueRetention(customers, cancellations) {
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
  const externalApiUrl = getExternalApiUrl();
  if (!externalApiUrl) {
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
    // LEAD_RECHECK_INTERVAL_MS e contas já canceladas checadas há menos de
    // CANCELLED_RECHECK_INTERVAL_MS não têm o detalhe buscado de novo agora —
    // ver leadCheckState.js/cancelledCheckState.js e a decisão tomada com o
    // Pablo em 2026-07-08 (leads) e 2026-07-09 (cancelados).
    const leadCheckState = readLeadCheckState();
    const cancelledCheckState = readCancelledCheckState();
    const skippableSince = { lead: LEAD_RECHECK_INTERVAL_MS, cancelled: CANCELLED_RECHECK_INTERVAL_MS };
    const checkStateByStatus = { lead: leadCheckState, cancelled: cancelledCheckState };
    const skipCodes = new Set(
      lastGoodStore.customers
        .filter((c) => {
          const interval = skippableSince[c.accountStatus];
          if (!interval) return false;
          const lastChecked = checkStateByStatus[c.accountStatus][c.id];
          return !!lastChecked && Date.now() - new Date(lastChecked).getTime() < interval;
        })
        .map((c) => c.id)
    );

    // Data em que detectamos pela primeira vez cada cancelamento "silencioso"
    // (sem client_request.date) — ver cancellationDates.js e o uso em
    // extractCancellation (server/externalApi.js). Fica estável entre
    // sincronizações em vez de avançar a cada hora que a conta continua
    // cancelada.
    const cancelDetectedAt = readCancellationDetectedAt();

    // Varredura incremental: só escaneia páginas com cadastros mais novos
    // que a última varredura (menos a margem de segurança) — ver
    // fetchPaidAccountCodes em server/externalApi.js. Sem estado anterior
    // (primeiro carregamento), sinceDate fica null e faz a varredura
    // completa uma única vez.
    const { lastScanAt } = readListingScanState();
    const sinceDate = lastScanAt ? new Date(new Date(lastScanAt).getTime() - LISTING_SCAN_SAFETY_BUFFER_MS) : null;
    const thisScanStartedAt = new Date().toISOString();

    // Todo lead já conhecido precisa continuar sendo rechecado
    // periodicamente mesmo com a varredura incremental — sem isso, um lead
    // de cadastro antigo sumiria da base assim que passasse da janela de
    // skip (ver leadCodes em fetchFromExternalApi).
    const leadCodes = lastGoodStore.customers.filter((c) => c.accountStatus === 'lead').map((c) => c.id);

    const data = await fetchFromExternalApi(externalApiUrl, previousScores, previousMrrs, (row) => {
      const enriched = enrichCustomer(transformCustomer(row));
      liveCustomersById.set(enriched.id, enriched);
      store = { ...lastGoodStore, customers: Array.from(liveCustomersById.values()) };
    }, knownCodes, skipCodes, cancelDetectedAt, sinceDate, leadCodes);
    writeListingScanState({ lastScanAt: thisScanStartedAt });

    const freshCustomers = (data.customers || []).map(transformCustomer).map(enrichCustomer);
    // Leads e cancelados pulados entram na store de novo, sem alteração — só
    // não tiveram o detalhe rebuscado nesse ciclo.
    const reusedSkippedCustomers = Array.from(skipCodes).map((code) => liveCustomersById.get(code)).filter(Boolean);
    const customers = [...freshCustomers, ...reusedSkippedCustomers];
    validateAccountStatusHeuristics(customers);
    writeKnownCodes([...knownCodes, ...customers.filter((c) => c.everPaid).map((c) => c.id)]);

    // Cancelamentos/não-renovações também precisam ser carregados adiante
    // pras contas puladas — sem isso, um cliente cancelado que não teve o
    // detalhe rebuscado nesse ciclo desapareceria do relatório de
    // cancelamentos (data.cancellations só cobre quem teve detalhe buscado
    // de verdade nesse ciclo).
    const lastCancellationById = new Map(lastGoodStore.cancellations.map((c) => [c.id, c]));
    const lastNonRenewalById = new Map(lastGoodStore.nonRenewals.map((c) => [c.id, c]));
    const reusedCancellations = Array.from(skipCodes).map((code) => lastCancellationById.get(code)).filter(Boolean);
    const reusedNonRenewals = Array.from(skipCodes).map((code) => lastNonRenewalById.get(code)).filter(Boolean);

    // "Checado agora" só pra quem teve detalhe buscado de verdade; quem foi
    // pulado mantém o timestamp antigo (ainda dentro da janela). Quem deixou
    // de ser lead/cancelado (converteu, reativou ou cancelou de vez) sai do
    // controle correspondente.
    const now = new Date().toISOString();
    const nextLeadCheckState = { ...leadCheckState };
    const nextCancelledCheckState = { ...cancelledCheckState };
    freshCustomers.forEach((c) => {
      if (c.accountStatus === 'lead') nextLeadCheckState[c.id] = now;
      else delete nextLeadCheckState[c.id];
      if (c.accountStatus === 'cancelled') nextCancelledCheckState[c.id] = now;
      else delete nextCancelledCheckState[c.id];
    });
    writeLeadCheckState(nextLeadCheckState);
    writeCancelledCheckState(nextCancelledCheckState);

    // Reconstrói a partir dos cancelamentos atuais (recém-buscados + os
    // reaproveitados de contas puladas) — quem reativou e não está mais
    // cancelado sai do controle sozinho (se cancelar nesse código de novo no
    // futuro, é tratado como uma detecção nova). Precisa incluir os
    // reaproveitados aqui também, senão a data de detecção de uma conta
    // pulada seria apagada e, quando ela finalmente for rechecada de novo, o
    // cancelamento silencioso ganharia uma data nova (a do recheck) em vez
    // de manter a data original.
    const allCancellations = [...(data.cancellations || []), ...reusedCancellations];
    const nextCancelDetectedAt = {};
    allCancellations.forEach((c) => {
      if (c.cancelDate) nextCancelDetectedAt[c.id] = c.cancelDate;
    });
    writeCancellationDetectedAt(nextCancelDetectedAt);

    store = {
      customers,
      cancellations: allCancellations,
      nonRenewals: [...(data.nonRenewals || []), ...reusedNonRenewals],
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

// Dispara a carga inicial e agenda a sincronização periódica. Chamado pelo
// bootstrap (server.js) DEPOIS de app.listen, pra não bloquear o boot do
// servidor com a sincronização inicial (~15-20min com dados reais).
export function startSync() {
  if (!getExternalApiUrl()) {
    console.error(
      '[loadStore] EXTERNAL_API_URL não configurada — servidor no ar só com o cache em disco (se existir), sem sincronização.'
    );
    return;
  }

  const syncIntervalMinutes = Number(process.env.SYNC_INTERVAL_MINUTES) || 60;
  loadStore(true).then(() => {
    setInterval(() => loadStore(false), syncIntervalMinutes * 60 * 1000);
    console.log(`[loadStore] Sincronização periódica a cada ${syncIntervalMinutes} minuto(s).`);
  });
}
