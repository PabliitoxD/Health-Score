// Adapter para a API real do dashboard (Basic Auth, paginação em
// /dashboard/accounts, detalhe completo em /dashboard/account/{code}).
//
// Campos confirmados testando a API real em 2026-07-03 (curl contra
// https://api.bravvius.com/4.0/...). Toda resposta vem envelopada em
// { success, error, return_type, message, data }.
//
// A listagem tem MUITO mais contas do que "clientes" no sentido de negócio
// (65935 contas na listagem completa vs. ~1054 clientes) — a maioria são
// cadastros no plano gratuito (id_fk_plan "0"). A própria listagem já traz
// id_fk_plan/plan_name, então filtramos ali ANTES de buscar o detalhe de
// cada conta — evita ~65 mil chamadas de detalhe desnecessárias.
//
// plan.renewals vem ordenado do mais recente pro mais antigo (confirmado
// testando a conta 83382758, com upgrades/downgrades reais no histórico) —
// renewals[0] é a cobrança atual (bate com plan.value), renewals[1] é a
// cobrança anterior, então usamos o valor dela como "MRR anterior". Quando
// não há pelo menos 2 renovações (cliente muito novo), caímos pro snapshot
// próprio entre sincronizações (server/customerSnapshot.js) — mesma lógica
// que já usamos pro "score anterior", que a API não tem de jeito nenhum.
//
// "Parceiro" é um plano especial (não é cliente pagante de verdade) — a
// listagem já entrega id_fk_plan/plan_name, então excluímos essas contas do
// sync completo. Como a listagem inteira é reprocessada a cada sincronização,
// se uma conta "Parceiro" assinar de verdade depois, ela aparece sozinha na
// sincronização seguinte — não precisa de nenhum controle extra pra isso.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS" (mais portável entre engines).
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  return dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
}

function buildAuthHeader() {
  const user = process.env.EXTERNAL_API_USER;
  const pass = process.env.EXTERNAL_API_PASS;
  if (!user || !pass) {
    throw new Error('EXTERNAL_API_USER/EXTERNAL_API_PASS não configuradas.');
  }
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

async function apiGet(baseUrl, path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: buildAuthHeader() },
  });
  if (res.status === 401) {
    throw new Error('Credenciais inválidas (401) — confira EXTERNAL_API_USER/EXTERNAL_API_PASS.');
  }
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${path}: HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(`API retornou success=false em ${path}: ${json.message || JSON.stringify(json.error)}`);
  }
  return json.data;
}

// Pagina GET /dashboard/accounts inteiro, retornando só os códigos das
// contas com plano pago/trial de verdade — filtra na listagem pra não
// precisar buscar o detalhe de todas as ~65 mil contas:
// - id_fk_plan "0" = sem plano (gratuito) — fora
// - plan_name "Parceiro" = plano especial, não é cliente — fora
async function fetchPaidAccountCodes(baseUrl, throttleMs) {
  const codes = [];
  let page = 1;
  let totalPages = null;

  do {
    const data = await apiGet(baseUrl, `/dashboard/accounts?page=${page}&expr=&status=`);
    totalPages = data.pages;

    data.items
      .filter((item) => item.id_fk_plan && item.id_fk_plan !== '0' && item.plan_name !== 'Parceiro')
      .forEach((item) => codes.push(item.code));

    if (page % 100 === 0 || page === totalPages) {
      console.log(`[externalApi] Listagem: página ${page}/${totalPages} — ${codes.length} clientes encontrados até agora`);
    }

    page += 1;
    if (page <= totalPages) await sleep(throttleMs);
  } while (page <= totalPages);

  return codes;
}

// plan.renewals[0] é a cobrança atual (mesmo valor de plan.value);
// plan.renewals[1], quando existe, é a cobrança do ciclo anterior — usamos
// o valor dela como MRR anterior (funciona pra renovação simples e pra
// upgrade/downgrade, já que o valor da renovação já reflete o plano vigente
// naquele ciclo). Ignoramos upgrades_downgrades pra esse cálculo: as linhas
// de lá incluem ajustes de desconto proporcional (valores negativos) que não
// representam o MRR de nenhum ciclo isoladamente.
function derivePreviousMrrFromHistory(plano) {
  const renewals = plano.renewals || [];
  if (renewals.length < 2) return null;
  const value = Number(renewals[1].value);
  return Number.isNaN(value) ? null : value;
}

// Achata o detalhe aninhado de uma conta pro mesmo formato de linha que
// transformCustomer (server.js) já espera.
function adaptAccountDetail(detail, previousScore, previousMrrSnapshot) {
  const producer = detail.producer || {};
  const plan = detail.plan || {};
  const tpv = detail.tpv || {};
  const acquirers = detail.acquirers || [];
  const lastProduct = detail.last_product || {};
  const cancelamento = detail.cancellation || {};
  const paymentFailure = cancelamento.payment_failure || {};
  const clientRequest = cancelamento.client_request || {};
  const hasPaymentFailure = (paymentFailure.pending_invoices || 0) > 0 || !!paymentFailure.last_error_date;

  const previousMrr = derivePreviousMrrFromHistory(plan) ?? previousMrrSnapshot;

  return {
    'Produtor': producer.code,
    'Razão Social': producer.name || producer.corporate_name || producer.personal_name,
    'Plano Atual': plan.name,
    'Valor Plano Atual': plan.value,
    'MRR Anterior': previousMrr,
    'Score Anterior': previousScore,
    'Último login': normalizeDate(detail.last_login?.registration_date),
    'Primeira Assinatura': normalizeDate(plan.subscription_date),
    'Adquirentes Cadastradas': acquirers.map((a) => a.object).filter(Boolean).join(', '),
    'Data Próxima Cobrança': plan.next_charge,
    'Data Última Cobrança': plan.renewals?.[0]?.expire_date || null,
    'Último Produto': lastProduct.name || null,
    'id_fk_plan': null,
    'E-mail': producer.email,
    'Telefone': producer.phone,
    'TPV Pix Percentual': tpv.pix?.percent,
    'TPV Pix Total': tpv.pix?.total_value,
    'TPV Cartão Percentual': tpv.cartao?.percent,
    'TPV Cartão Total': tpv.cartao?.total_value,
    'TPV Boleto Percentual': tpv.boleto?.percent,
    'TPV Boleto Total': tpv.boleto?.total_value,
    // Usados pra classificar a conta em trial/ativa/cancelada (ver deriveAccountStatus em server.js).
    'Trial Plano': plan.trial_plan || 'no',
    'Cancelamento Solicitado': !!clientRequest.cancelled,
    'Falha Pagamento': hasPaymentFailure,
  };
}

// Separa o bloco de cancelamento de uma conta em "cancelado" (solicitação do
// cliente, com motivo) ou "não renovado" (falha de pagamento) — os dois
// conceitos que o produto já modela como distintos.
function extractCancellation(detail, row) {
  const cancelamento = detail.cancellation || {};
  const paymentFailure = cancelamento.payment_failure || {};
  const clientRequest = cancelamento.client_request || {};
  const base = { id: row['Produtor'], name: row['Razão Social'], tier: row['Plano Atual'], mrr: row['Valor Plano Atual'] };

  const cancellation = clientRequest.cancelled
    ? { ...base, cancelDate: clientRequest.date, reason: clientRequest.reason }
    : null;

  const hasPaymentFailure = (paymentFailure.pending_invoices || 0) > 0 || !!paymentFailure.last_error_date;
  const nonRenewal = hasPaymentFailure
    ? { ...base, cycleEndDate: paymentFailure.last_error_date, reason: paymentFailure.last_error_reason || 'Falha no pagamento' }
    : null;

  return { cancellation, nonRenewal };
}

// previousScores/previousMrrs: { [codigoDoProdutor]: valor } — snapshot da
// sincronização anterior (ver server/customerSnapshot.js). "Score anterior"
// é métrica nossa (a API não tem). "MRR anterior" só cai nesse fallback
// quando a conta tem menos de 2 renovações no histórico (cliente muito novo).
export async function fetchFromExternalApi(baseUrl, previousScores = {}, previousMrrs = {}) {
  const throttleMs = Number(process.env.EXTERNAL_API_THROTTLE_MS) || 150;

  const codes = await fetchPaidAccountCodes(baseUrl, throttleMs);
  console.log(`[externalApi] Listagem concluída: ${codes.length} clientes com plano pago/trial pra buscar o detalhe.`);

  const customers = [];
  const cancellations = [];
  const nonRenewals = [];

  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i];
    const detail = await apiGet(baseUrl, `/dashboard/account/${code}`);
    const row = adaptAccountDetail(detail, previousScores[code] ?? null, previousMrrs[code] ?? null);
    customers.push(row);

    const { cancellation, nonRenewal } = extractCancellation(detail, row);
    if (cancellation) cancellations.push(cancellation);
    if (nonRenewal) nonRenewals.push(nonRenewal);

    if ((i + 1) % 50 === 0 || i + 1 === codes.length) {
      console.log(`[externalApi] Detalhe: ${i + 1}/${codes.length} clientes processados`);
    }

    await sleep(throttleMs);
  }

  return { customers, cancellations, nonRenewals };
}
