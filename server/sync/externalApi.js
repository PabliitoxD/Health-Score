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

// Pagina GET /dashboard/accounts, retornando só os códigos das contas com
// plano pago/trial de verdade — filtra na listagem pra não precisar buscar
// o detalhe de todas as ~65 mil contas:
// - id_fk_plan "0" = sem plano (gratuito) — fora
// - plan_name "Parceiro" = plano especial, não é cliente — fora
//
// A listagem vem ordenada por registration_date DECRESCENTE (confirmado
// testando a API real em 2026-07-08: página 1 trazia cadastros de hoje,
// página 1000 trazia nov/2024, página 2639 [última] trazia jun/2024). Como
// a esmagadora maioria das contas com plano pago já entra com o plano
// selecionado desde o cadastro (trial obrigatório escolhe um plano de
// cara), dá pra parar de paginar assim que a página trouxer só cadastros
// mais antigos que `sinceDate` — tudo antes disso já foi visto numa
// sincronização anterior. Decisão tomada com o Pablo em 2026-07-08: sem
// varredura completa periódica de segurança, só a incremental (risco
// aceito: uma conta muito antiga que vire paga sem nenhum cadastro novo
// não seria pega até rodarmos uma varredura completa do zero de novo).
async function fetchPaidAccountCodes(baseUrl, throttleMs, sinceDate = null) {
  const codes = [];
  let page = 1;
  let totalPages = null;
  let stoppedEarly = false;

  do {
    const data = await apiGet(baseUrl, `/dashboard/accounts?page=${page}&expr=&status=`);
    totalPages = data.pages;

    for (const item of data.items) {
      if (sinceDate && item.registration_date && new Date(item.registration_date.replace(' ', 'T')) < sinceDate) {
        stoppedEarly = true;
        break;
      }
      if (item.id_fk_plan && item.id_fk_plan !== '0' && item.plan_name !== 'Parceiro') {
        codes.push(item.code);
      }
    }

    if (stoppedEarly) break;

    if (page % 100 === 0 || page === totalPages) {
      console.log(`[externalApi] Listagem: página ${page}/${totalPages} — ${codes.length} clientes encontrados até agora`);
    }

    page += 1;
    if (page <= totalPages) await sleep(throttleMs);
  } while (page <= totalPages);

  console.log(
    sinceDate
      ? `[externalApi] Varredura incremental: parou na página ${page}/${totalPages} (cadastros mais novos que ${sinceDate.toISOString()}) — ${codes.length} clientes com plano pago encontrados.`
      : `[externalApi] Varredura completa: ${page}/${totalPages} páginas — ${codes.length} clientes com plano pago encontrados.`
  );

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
    'TPV Total Valor': tpv.total_value,
    'TPV Total Transações': tpv.total_transactions,
    'TPV Pix Percentual': tpv.pix?.percent,
    'TPV Pix Total': tpv.pix?.total_value,
    'TPV Pix Transações': tpv.pix?.transactions,
    'TPV Cartão Percentual': tpv.cartao?.percent,
    'TPV Cartão Total': tpv.cartao?.total_value,
    'TPV Cartão Transações': tpv.cartao?.transactions,
    'TPV Boleto Percentual': tpv.boleto?.percent,
    'TPV Boleto Total': tpv.boleto?.total_value,
    'TPV Boleto Transações': tpv.boleto?.transactions,
    // Usados pra classificar a conta em trial/ativa/cancelada/lead (ver
    // deriveAccountStatus em server.js).
    'Trial Plano': plan.trial_plan || 'no',
    'Cancelamento Solicitado': !!clientRequest.cancelled,
    'Falha Pagamento': hasPaymentFailure,
    // Prova de que a conta já teve pelo menos uma cobrança paga de verdade —
    // sem isso, "cancelado"/"ativo" não se aplicam (nunca foi cliente
    // pagante de fato, só um trial que não converteu ou um cadastro que
    // ainda não chegou a pagar a primeira cobrança).
    //
    // Três sinais, porque nenhum sozinho cobre todo mundo: contas antigas
    // (testado em 2024) vêm com "renewals": [] — a API não guarda histórico
    // de renovação tão longe, mesmo quando a conta pagou de verdade no
    // passado ou está pagando agora mesmo (achado cruzando a lista de 303
    // contas de referência fornecida pelo time — 2 delas tinham renewals
    // vazio apesar de já terem sido/serem pagantes).
    // Number(plan.value) > 0 sozinho NÃO prova pagamento: durante o trial a
    // conta já vem com o plano pago selecionado (e seu valor futuro) mesmo
    // sem nenhuma cobrança ter acontecido ainda — por isso exigimos também
    // trial_plan !== 'yes' nesse sinal (achado testando a API real em
    // 2026-07-08: 1017 contas com trial_plan="yes" e renewals=[] vinham
    // sendo contadas como "ativas" só por terem um plano pago associado).
    'Teve Pagamento':
      (plan.renewals || []).some((r) => r.status === 'paid') ||
      plan.trial_plan === 'finished' ||
      (Number(plan.value) > 0 && plan.trial_plan !== 'yes'),
  };
}

// Separa o bloco de cancelamento de uma conta em "cancelado" (solicitação do
// cliente, com motivo, OU conta que já pagou antes e voltou pro Gratuito) ou
// "não renovado" (falha de pagamento).
//
// Descoberta testando a conta 89106111 (tinha 2 renovações pagas no
// histórico): quando uma conta cancela de vez, a API reseta o plano pra
// "Gratuito" SEM marcar isso em cancellation.client_request.cancelled nem em
// payment_failure — os dois ficam vazios. Sem checar "voltou pro Gratuito
// depois de já ter pago", essas contas nunca apareceriam como canceladas.
//
// Nesse caso "silencioso" não existe nenhuma data de cancelamento explícita
// na API — client_request.date fica null. Sem uma data, o cancelamento
// nunca seria contado em nenhum filtro de período (Hoje/Semana/Mês), só na
// visão "Tudo". Prioridade da data efetiva:
// 1. client_request.date — quando o próprio cliente solicitou, a API já dá
//    a data certa.
// 2. Data da última cobrança real (row['Data Última Cobrança'], mesmo campo
//    usado como lastChargeDate em transformCustomer) — pra quem voltou pro
//    Gratuito sozinho, é a melhor aproximação de "quando parou de ser
//    pagante": vem da própria API, então é estável e não depende do nosso
//    cache. Corrigido em 2026-07-09 depois de notar que TODAS as contas
//    canceladas silenciosamente apareciam com a data de HOJE no relatório,
//    mesmo clientes cuja última cobrança foi meses atrás — o fallback
//    anterior (detectedAt, "quando NÓS notamos") empurrava a data pra frente
//    toda vez que o cache de detecção era perdido (ex: reset de deploy, ver
//    server/cancellationDates.js), mascarando a data real do cancelamento.
// 3. detectedAt (server/cancellationDates.js) — só sobra pra quem não tem
//    NENHUM histórico de cobrança (conta muito antiga, ver comentário sobre
//    'Teve Pagamento' em adaptAccountDetail acima) — decisão original
//    tomada com o Pablo em 2026-07-08.
function extractCancellation(detail, row, detectedAt) {
  const cancelamento = detail.cancellation || {};
  const paymentFailure = cancelamento.payment_failure || {};
  const clientRequest = cancelamento.client_request || {};
  const base = { id: row['Produtor'], name: row['Razão Social'], tier: row['Plano Atual'], mrr: row['Valor Plano Atual'] };

  const hasPaymentFailure = (paymentFailure.pending_invoices || 0) > 0 || !!paymentFailure.last_error_date;
  const revertedToFree = !!row['Teve Pagamento'] && (row['Plano Atual'] === 'Gratuito' || Number(row['Valor Plano Atual']) === 0);

  // applyDateFilter (frontend) monta a data como `cancelDate + 'T00:00:00'`
  // — só funciona com data pura (YYYY-MM-DD), igual ao padrão já usado pro
  // joinDate (ver transformCustomer em server.js). client_request.date vem
  // com hora ("YYYY-MM-DD HH:MM:SS") e detectedAt vem em ISO completo; sem
  // truncar os dois pra só a data, a concatenação gera Invalid Date e o
  // cancelamento nunca aparece em nenhum filtro de período (só em "Tudo").
  const rawCancelDate = clientRequest.date || row['Data Última Cobrança'] || detectedAt || null;
  const cancelDate = rawCancelDate ? normalizeDate(rawCancelDate).split('T')[0] : null;

  const cancellation = !hasPaymentFailure && (clientRequest.cancelled || revertedToFree)
    ? { ...base, cancelDate, reason: clientRequest.reason || 'Cancelamento efetivado' }
    : null;

  const nonRenewal = hasPaymentFailure
    ? { ...base, cycleEndDate: paymentFailure.last_error_date, reason: paymentFailure.last_error_reason || 'Falha no pagamento' }
    : null;

  return { cancellation, nonRenewal };
}

// Reconstrói a linha do tempo de assinatura/renovação/upgrade/downgrade de
// uma conta a partir de plan.renewals[] (um ciclo de cobrança por entrada,
// mais-recente-primeiro) e plan.upgrades_downgrades[] (eventos explícitos de
// troca de plano, linkados ao ciclo em que aconteceram pelo campo `code`).
// Ver o comentário sobre derivePreviousMrrFromHistory acima pra mais
// contexto sobre o formato de renewals.
//
// "Assinatura" usa plan.subscription_date — mesmo campo que já vira joinDate
// em transformCustomer (server/sync/engine.js), reaproveitando a semântica
// que o resto do painel já usa como "Cliente desde"/"Primeira Assinatura".
// O ciclo de renewals[] cujo expire_date cai nessa mesma data é o ciclo
// "fundador" (usado só pra achar o MRR da assinatura) — os ciclos DEPOIS
// dele é que viram eventos de Renovação/Upgrade/Downgrade, pra não duplicar
// o mesmo dia como dois eventos.
//
// upgrades_downgrades traz duas linhas por troca de plano (o valor do plano
// novo + uma linha negativa "Desconto no upgrade/downgrade", o desconto
// proporcional do ciclo) — só a linha com "Upgrade"/"Downgrade" na descrição
// interessa aqui, a de desconto é ignorada.
function extractHistoryEvents(detail, row) {
  const plan = detail.plan || {};
  const customerId = row['Produtor'];
  const name = row['Razão Social'];
  const tier = row['Plano Atual'];
  const renewals = plan.renewals || [];
  const upgradesDowngrades = plan.upgrades_downgrades || [];

  const upgradesDowngradesByCode = {};
  upgradesDowngrades.forEach((entry) => {
    if (!entry.code || /desconto/i.test(entry.description || '')) return;
    (upgradesDowngradesByCode[entry.code] ||= []).push(entry);
  });

  const joinDate = plan.subscription_date ? normalizeDate(plan.subscription_date).split('T')[0] : null;
  const chronological = [...renewals].reverse();
  const events = [];

  const foundingCycle = joinDate ? chronological.find((r) => r.expire_date === joinDate) : null;
  events.push({
    customerId,
    name,
    tier,
    type: 'assinatura',
    date: joinDate,
    mrr: foundingCycle ? Number(foundingCycle.value) : (Number(row['Valor Plano Atual']) || null),
    description: 'Assinatura',
    dedupKey: `${customerId}:assinatura:${joinDate}`,
  });

  // previousMrr acompanha o valor do ciclo anterior conforme percorremos em
  // ordem cronológica — dá pra calcular o delta de expansão/contração de
  // upgrade/downgrade sem precisar de outra fonte (usado no relatório
  // mensal, ver server/history/routes.js).
  let previousMrr = foundingCycle ? Number(foundingCycle.value) : null;

  chronological.forEach((r) => {
    if (!r.expire_date || (joinDate && r.expire_date <= joinDate)) return;

    const matches = upgradesDowngradesByCode[r.code] || [];
    const upgradeMatch = matches.find((e) => /upgrade/i.test(e.description || '') && !/downgrade/i.test(e.description || ''));
    const downgradeMatch = matches.find((e) => /downgrade/i.test(e.description || ''));

    const type = upgradeMatch ? 'upgrade' : downgradeMatch ? 'downgrade' : 'renovacao';
    const description = upgradeMatch?.description || downgradeMatch?.description || 'Renovação';
    const mrr = Number(r.value) || null;

    events.push({
      customerId,
      name,
      tier,
      type,
      date: r.expire_date,
      mrr,
      previousMrr,
      description,
      dedupKey: `${customerId}:${r.id || r.code}`,
    });

    previousMrr = mrr;
  });

  return events.filter((e) => !!e.date);
}

// previousScores/previousMrrs: { [codigoDoProdutor]: valor } — snapshot da
// sincronização anterior (ver server/customerSnapshot.js). "Score anterior"
// é métrica nossa (a API não tem). "MRR anterior" só cai nesse fallback
// quando a conta tem menos de 2 renovações no histórico (cliente muito novo).
//
// onAccount(row, cancellation, nonRenewal): chamado a cada conta processada,
// ANTES de terminar a sincronização inteira — permite ao chamador (server.js)
// ir atualizando o painel ao vivo, em vez de deixar tudo no escuro até o
// ciclo completo (que com ~1000+ contas reais leva vários minutos).
//
// knownCodes: códigos que já foram confirmados como pagantes de verdade em
// algum momento (ver server/knownCodes.js) — sempre incluídos no detalhe,
// mesmo que a varredura da listagem não os encontre mais (conta cancelada
// volta pro Gratuito e some da varredura por id_fk_plan/plan_name).
//
// skipCodes: códigos de clientes já classificados como "lead" (trial
// travado, nunca pagou) recentemente o suficiente pra não precisar buscar o
// detalhe de novo nesse ciclo (ver LEAD_RECHECK_INTERVAL_MS em server.js) —
// o chamador reaproveita o objeto da sincronização anterior pra esses
// códigos. Reduz em ~77% as chamadas de detalhe na maioria dos ciclos, sem
// deixar de detectar conversão de lead pra pagante (só com menos frequência).
//
// previousCancelDetectedAt: { [codigo]: dataISO } — data em que detectamos
// pela primeira vez o cancelamento "silencioso" de cada conta (ver
// server/cancellationDates.js e extractCancellation acima). Se o código
// ainda não tiver uma data registrada, usamos o horário desta própria
// sincronização (syncTimestamp) como o primeiro detected-at.
//
// sinceDate: corta a varredura da listagem só nas páginas com cadastros
// mais novos que essa data (ver fetchPaidAccountCodes acima e
// LISTING_SCAN_SAFETY_BUFFER_MS em server.js) — null faz a varredura
// completa (usado no primeiro carregamento, sem estado anterior).
//
// leadCodes: códigos de TODOS os clientes já classificados como "lead"
// (trial travado, nunca pagou), independente de estarem no meio do
// intervalo de recheck (LEAD_RECHECK_INTERVAL_MS). Sem isso, a varredura
// incremental por sinceDate faria um lead antigo (cadastro de muito tempo
// atrás) desaparecer da base assim que passasse da janela de skip — ele
// não está em knownCodes (nunca pagou) nem apareceria de novo na varredura
// (cadastro antigo demais pro corte por data).
export async function fetchFromExternalApi(baseUrl, previousScores = {}, previousMrrs = {}, onAccount = null, knownCodes = [], skipCodes = new Set(), previousCancelDetectedAt = {}, sinceDate = null, leadCodes = []) {
  const throttleMs = Number(process.env.EXTERNAL_API_THROTTLE_MS) || 150;
  const syncTimestamp = new Date().toISOString();

  const scannedCodes = await fetchPaidAccountCodes(baseUrl, throttleMs, sinceDate);
  const allCodes = Array.from(new Set([...scannedCodes, ...knownCodes, ...leadCodes]));
  const codes = allCodes.filter((code) => !skipCodes.has(code));
  console.log(
    `[externalApi] Listagem concluída: ${scannedCodes.length} na varredura + ${knownCodes.length} já conhecidos = ${allCodes.length} clientes; ` +
    `${allCodes.length - codes.length} pulados (lead recheck espaçado), ${codes.length} vão ter o detalhe buscado.`
  );

  const customers = [];
  const cancellations = [];
  const nonRenewals = [];
  const historyEvents = [];

  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i];
    const detail = await apiGet(baseUrl, `/dashboard/account/${code}`);
    const row = adaptAccountDetail(detail, previousScores[code] ?? null, previousMrrs[code] ?? null);
    customers.push(row);

    const detectedAt = previousCancelDetectedAt[code] || syncTimestamp;
    const { cancellation, nonRenewal } = extractCancellation(detail, row, detectedAt);
    if (cancellation) cancellations.push(cancellation);
    if (nonRenewal) nonRenewals.push(nonRenewal);

    const accountHistoryEvents = extractHistoryEvents(detail, row);
    if (cancellation) {
      accountHistoryEvents.push({
        customerId: cancellation.id, name: cancellation.name, tier: cancellation.tier,
        type: 'cancelamento', date: cancellation.cancelDate, mrr: Number(cancellation.mrr) || null,
        description: cancellation.reason, dedupKey: `${cancellation.id}:cancelamento:${cancellation.cancelDate}`,
      });
    }
    if (nonRenewal) {
      const cycleEndDate = nonRenewal.cycleEndDate ? normalizeDate(nonRenewal.cycleEndDate).split('T')[0] : null;
      accountHistoryEvents.push({
        customerId: nonRenewal.id, name: nonRenewal.name, tier: nonRenewal.tier,
        type: 'nao_renovacao', date: cycleEndDate, mrr: Number(nonRenewal.mrr) || null,
        description: nonRenewal.reason, dedupKey: `${nonRenewal.id}:nao_renovacao:${cycleEndDate}`,
      });
    }
    historyEvents.push(...accountHistoryEvents.filter((e) => !!e.date));

    if (onAccount) onAccount(row, cancellation, nonRenewal, accountHistoryEvents);

    if ((i + 1) % 50 === 0 || i + 1 === codes.length) {
      console.log(`[externalApi] Detalhe: ${i + 1}/${codes.length} clientes processados`);
    }

    await sleep(throttleMs);
  }

  return { customers, cancellations, nonRenewals, historyEvents };
}
