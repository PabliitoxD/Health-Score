import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Landmark, TrendingDown, Percent, Sparkles,
  ArrowUpCircle, ArrowDownCircle, UserMinus, Smile, Gem, Star,
  UserPlus, Users, RefreshCw, XCircle, UserX, Tag,
  Wallet, QrCode, CreditCard, Receipt, CalendarClock,
} from 'lucide-react';
import { getCustomers, getCancellations, getNonRenewals } from '../services/api';
import { getResponses } from '../utils/surveyStorage';
import { SURVEY_META } from '../utils/surveyEligibility';
import { computeNps, computeCsat } from '../utils/surveyKpis';
import { computeRevenueRetention, computeLogoChurn, computePlanBreakdown, computeTpv } from '../utils/kpis';
import { applyDateFilter, applyAsOfFilter } from '../utils/dateFilter';
import { formatCurrency, formatPercent } from '../utils/formatters';
import GlassCard from './ui/GlassCard';
import FilterBar from './FilterBar';
import MetricDetailModal from './MetricDetailModal';

const MetricCard = ({ icon, iconBg, iconColor, label, value, hint, onClick }) => (
  <GlassCard
    variant="default"
    className={`p-5 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-brand-500/30 transition-shadow' : ''}`}
    onClick={onClick}
  >
    <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-3 ${iconBg} ${iconColor}`}>
      {icon}
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-1">{label}</p>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</h3>
    {hint && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
  </GlassCard>
);

const ReasonDetailTable = ({ title, icon, rows }) => (
  <GlassCard variant="default" className="p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
    </div>
    {rows.length === 0 ? (
      <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">Nenhum cancelamento no período</p>
    ) : (
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <th className="pb-2 font-semibold w-24">ID</th>
              <th className="pb-2 font-semibold w-1/4">Cliente</th>
              <th className="pb-2 font-semibold">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-2 pr-2 text-slate-500 dark:text-slate-400 break-words">{row.id}</td>
                <td className="py-2 pr-2 text-slate-600 dark:text-slate-400 break-words">{row.name}</td>
                <td className="py-2 text-slate-600 dark:text-slate-400 break-words">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </GlassCard>
);

const BreakdownTable = ({ title, icon, keyLabel = 'Plano', data }) => (
  <GlassCard variant="default" className="p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
    </div>
    {data.breakdown.length === 0 ? (
      <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">Nenhum dado no período</p>
    ) : (
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <th className="pb-2 font-semibold">{keyLabel}</th>
            <th className="pb-2 font-semibold text-right">Qtd</th>
            <th className="pb-2 font-semibold text-right">MRR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.breakdown.map((row) => (
            <tr key={row.key}>
              <td className="py-2 text-slate-600 dark:text-slate-400">{row.key}</td>
              <td className="py-2 text-right font-medium text-slate-900 dark:text-white">{row.count}</td>
              <td className="py-2 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(row.mrr)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 dark:border-slate-700">
            <td className="py-2 font-bold text-slate-900 dark:text-white">Total</td>
            <td className="py-2 text-right font-bold text-slate-900 dark:text-white">{data.total.count}</td>
            <td className="py-2 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(data.total.mrr)}</td>
          </tr>
        </tbody>
      </table>
    )}
  </GlassCard>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">{children}</h2>
);

const npsCategory = (score) => (score >= 9 ? 'Promotor' : score >= 7 ? 'Neutro' : 'Detrator');

const ACCOUNT_STATUS_LABELS = { trial: 'Trial', active: 'Ativo', cancelled: 'Cancelado', lead: 'Lead' };

const CompanyView = () => {
  const [customers, setCustomers] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [nonRenewals, setNonRenewals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [dateFilter, setDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [customersData, cancellationsData, nonRenewalsData, responsesData] = await Promise.all([
          getCustomers(),
          getCancellations(),
          getNonRenewals(),
          getResponses(),
        ]);
        setCustomers(customersData);
        setCancellations(cancellationsData || []);
        setNonRenewals(nonRenewalsData || []);
        setResponses(responsesData || []);
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Coorte de cadastro: só quem entrou DENTRO do período (não "até o fim
  // dele") — usada exclusivamente pra "Clientes Cadastrados" (newRegistrations
  // abaixo), que é uma contagem de NOVOS cadastros no período, diferente de
  // "quem está ativo nesse período" (ver dateFilteredAll).
  const newInPeriod = useMemo(
    () => applyDateFilter(customers, dateFilter, customDateRange, 'joinDate'),
    [customers, dateFilter, customDateRange]
  );

  // "Ativo até o fim do período" (applyAsOfFilter), não "entrou dentro do
  // período" — um cliente antigo continua contando em "Este Mês" mesmo tendo
  // assinado há mais tempo. Base pra clientes ativos, TPV e qualquer outra
  // métrica que representa "quem é cliente agora", não coorte de novos.
  // Decisão tomada com o Pablo em 2026-07-08.
  const dateFilteredAll = useMemo(
    () => applyAsOfFilter(customers, dateFilter, customDateRange, 'joinDate'),
    [customers, dateFilter, customDateRange]
  );

  // Cadastro (headcount): primeira "assinatura" dentro do período — sem
  // filtrar por accountStatus, trial e lead contam aqui, como qualquer
  // outro cadastro (só não são "clientes ativos").
  const newRegistrations = useMemo(
    () => newInPeriod.filter((c) => c.previousMrr === null || c.previousMrr === undefined),
    [newInPeriod]
  );

  // Só clientes realmente ativos (já pagantes, sem cancelamento efetivado) —
  // mesma base que o Dashboard usa pra MRR Total/ARPU/contagem de "ativos".
  // Trial e lead (nunca tiveram pagamento) não entram aqui.
  const activeCustomers = useMemo(
    () => dateFilteredAll.filter((c) => c.accountStatus === 'active'),
    [dateFilteredAll]
  );

  // New MRR/Novas Assinaturas: só entre quem já é cliente ativo de verdade
  // (primeira cobrança paga já aconteceu) — cadastro em trial/lead ainda não
  // é receita.
  const newCustomers = useMemo(
    () => activeCustomers.filter((c) => c.previousMrr === null || c.previousMrr === undefined),
    [activeCustomers]
  );

  // Clientes existentes filtrados pela data da ÚLTIMA COBRANÇA — é quando a
  // renovação de fato aconteceu, joinDate não serve pra esse grupo (clientes
  // antigos raramente entraram dentro de um filtro estreito).
  const retainedCustomers = useMemo(
    () => applyDateFilter(
      customers.filter((c) => c.accountStatus === 'active' && c.previousMrr !== null && c.previousMrr !== undefined),
      dateFilter, customDateRange, 'lastChargeDate'
    ),
    [customers, dateFilter, customDateRange]
  );

  const cancellationsInPeriod = useMemo(
    () => applyDateFilter(cancellations, dateFilter, customDateRange, 'cancelDate'),
    [cancellations, dateFilter, customDateRange]
  );

  const nonRenewalsInPeriod = useMemo(
    () => applyDateFilter(nonRenewals, dateFilter, customDateRange, 'cycleEndDate'),
    [nonRenewals, dateFilter, customDateRange]
  );

  const responsesInPeriod = useMemo(() => {
    // respondedAt vem como datetime ISO completo — normaliza pra data pura
    // antes de aplicar o mesmo filtro usado nos outros campos.
    const normalized = responses.map((r) => ({ ...r, respondedDate: r.respondedAt ? r.respondedAt.split('T')[0] : null }));
    return applyDateFilter(normalized, dateFilter, customDateRange, 'respondedDate');
  }, [responses, dateFilter, customDateRange]);

  // Pra resolver nome de cliente em respostas de pesquisa, que só guardam customerId.
  const customerById = useMemo(() => {
    const map = {};
    customers.forEach((c) => { map[c.id] = c; });
    return map;
  }, [customers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando indicadores da empresa...</p>
      </div>
    );
  }

  const count = activeCustomers.length;
  const totalMRR = activeCustomers.reduce((a, c) => a + c.mrr, 0);
  const arpu = count ? totalMRR / count : 0;
  const logoChurnRate = computeLogoChurn(count, cancellationsInPeriod.length);

  const { nrr, grr, newMrr, expansionMrr, contractionMrr, churnedMrr } =
    computeRevenueRetention(newCustomers, retainedCustomers, cancellationsInPeriod);

  const nps = computeNps(responsesInPeriod);
  const csat = computeCsat(responsesInPeriod);
  const ltv = logoChurnRate > 0 ? arpu / (logoChurnRate / 100) : null;

  const newSubsBreakdown = computePlanBreakdown(newCustomers);
  const renewalsBreakdown = computePlanBreakdown(retainedCustomers);
  const cancellationsBreakdown = computePlanBreakdown(cancellationsInPeriod);
  const nonRenewalsBreakdown = computePlanBreakdown(nonRenewalsInPeriod);
  const cancellationsByReasonList = [...cancellationsInPeriod].sort(
    (a, b) => new Date(b.cancelDate || 0) - new Date(a.cancelDate || 0)
  );
  const tpv = computeTpv(dateFilteredAll);

  // Renovações nos próximos 3 dias: clientes ativos com a próxima cobrança
  // já agendada pra daqui até 3 dias. Não segue o filtro de período (que
  // olha pra trás, por data de entrada/cobrança) — é sempre uma janela pra
  // frente a partir de hoje.
  const upcomingRenewals = customers.filter(
    (c) => c.accountStatus === 'active' && c.daysToNextCharge !== null && c.daysToNextCharge >= 0 && c.daysToNextCharge <= 3
  );

  // ─── Detalhamento por card (abre no modal ao clicar) ────────────────────

  const startingMrr = retainedCustomers.reduce((a, c) => a + c.previousMrr, 0) + churnedMrr;
  const expandedCustomers = retainedCustomers.filter((c) => c.mrr > c.previousMrr);
  const contractedCustomers = retainedCustomers.filter((c) => c.mrr < c.previousMrr);
  const csatResponses = responsesInPeriod.filter((r) => r.type !== 'nps');
  const npsResponses = responsesInPeriod.filter((r) => r.type === 'nps');

  const tpvMethodDetail = (methodKey, methodLabel) => ({
    title: `TPV ${methodLabel}`,
    formula: `Soma do TPV (volume transacionado) gerado via ${methodLabel} por todos os clientes no período selecionado.`,
    columns: [
      { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' },
      { key: 'value', label: 'Valor', align: 'right' }, { key: 'percent', label: '% do Cliente', align: 'right' },
    ],
    rows: dateFilteredAll
      .filter((c) => c.tpv[methodKey].total > 0)
      .map((c) => ({ name: c.name, tier: c.tier, value: formatCurrency(c.tpv[methodKey].total), percent: formatPercent(c.tpv[methodKey].percent) })),
    totalRow: { value: formatCurrency(tpv[methodKey].total) },
    emptyText: 'Nenhum TPV no período',
  });

  const details = {
    mrrTotal: {
      title: 'MRR Total',
      formula: 'Soma do MRR de todos os clientes ativos no período selecionado.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' }, { key: 'value', label: 'MRR', align: 'right' },
      ],
      rows: activeCustomers.map((c) => ({ name: c.name, tier: c.tier, value: formatCurrency(c.mrr) })),
      totalRow: { value: formatCurrency(totalMRR) },
    },
    arr: {
      title: 'ARR',
      formula: 'Receita Anual Recorrente: projeção do MRR Total para 12 meses.',
      summary: [
        { label: 'MRR Total', value: formatCurrency(totalMRR) },
        { label: 'ARR (× 12)', value: formatCurrency(totalMRR * 12) },
      ],
    },
    churn: {
      title: 'Churn',
      formula: 'Percentual de clientes cancelados em relação ao total ativo no início do período (ativos + cancelados).',
      summary: [
        { label: 'Clientes Ativos', value: count },
        { label: 'Cancelados', value: cancellationsInPeriod.length },
        { label: 'Churn Rate', value: formatPercent(logoChurnRate) },
      ],
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' }, { key: 'reason', label: 'Motivo' },
      ],
      rows: cancellationsInPeriod.map((c) => ({ name: c.name, tier: c.tier, reason: c.reason })),
      emptyText: 'Nenhum cancelamento no período',
    },
    grr: {
      title: 'GRR',
      formula: 'Gross Revenue Retention: receita retida de clientes existentes, descontando apenas contração e churn (sem contar expansão). Referência saudável: acima de 90%.',
      summary: [
        { label: 'MRR Inicial', value: formatCurrency(startingMrr) },
        { label: 'Contração MRR', value: formatCurrency(contractionMrr) },
        { label: 'Churn MRR', value: formatCurrency(churnedMrr) },
        { label: 'GRR', value: formatPercent(grr) },
      ],
    },
    newMrr: {
      title: 'New MRR',
      formula: 'Soma do MRR de clientes sem histórico anterior (primeira assinatura) cujo cadastro caiu no período.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' }, { key: 'value', label: 'MRR', align: 'right' },
      ],
      rows: newCustomers.map((c) => ({ name: c.name, tier: c.tier, value: formatCurrency(c.mrr) })),
      totalRow: { value: formatCurrency(newMrr) },
      emptyText: 'Nenhuma assinatura nova no período',
    },
    expansionMrr: {
      title: 'Expansion MRR',
      formula: 'Soma do aumento de MRR de clientes existentes que fizeram upgrade no período (renovação com valor maior que o anterior).',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' },
        { key: 'from', label: 'Anterior', align: 'right' }, { key: 'to', label: 'Atual', align: 'right' },
      ],
      rows: expandedCustomers.map((c) => ({ name: c.name, tier: c.tier, from: formatCurrency(c.previousMrr), to: formatCurrency(c.mrr) })),
      totalRow: { to: formatCurrency(expansionMrr) },
      emptyText: 'Nenhuma expansão no período',
    },
    contractionMrr: {
      title: 'Contraction MRR',
      formula: 'Soma da queda de MRR de clientes existentes que fizeram downgrade no período (renovação com valor menor que o anterior).',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' },
        { key: 'from', label: 'Anterior', align: 'right' }, { key: 'to', label: 'Atual', align: 'right' },
      ],
      rows: contractedCustomers.map((c) => ({ name: c.name, tier: c.tier, from: formatCurrency(c.previousMrr), to: formatCurrency(c.mrr) })),
      totalRow: { to: formatCurrency(contractionMrr) },
      emptyText: 'Nenhuma contração no período',
    },
    churnMrr: {
      title: 'Churn MRR',
      formula: 'Soma do MRR perdido com os cancelamentos do período.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' }, { key: 'value', label: 'MRR', align: 'right' },
      ],
      rows: cancellationsInPeriod.map((c) => ({ name: c.name, tier: c.tier, value: formatCurrency(c.mrr) })),
      totalRow: { value: formatCurrency(churnedMrr) },
      emptyText: 'Nenhum cancelamento no período',
    },
    csat: {
      title: 'CSAT',
      formula: 'Percentual de respostas de pesquisa CSAT com nota 4 ou 5 (satisfeito/muito satisfeito), sobre o total de respostas CSAT no período.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'type', label: 'Tipo' },
        { key: 'score', label: 'Nota', align: 'right' }, { key: 'status', label: 'Status', align: 'right' },
      ],
      rows: csatResponses.map((r) => ({
        name: customerById[r.customerId]?.name || r.customerId,
        type: SURVEY_META[r.type]?.label || r.type,
        score: `${r.score}/5`,
        status: r.score >= 4 ? 'Satisfeito' : 'Insatisfeito',
      })),
      emptyText: 'Nenhuma resposta CSAT no período',
    },
    ltv: {
      title: 'LTV',
      formula: 'Lifetime Value estimado: receita média por cliente (ARPU) dividida pela taxa de churn do período.',
      summary: [
        { label: 'ARPU', value: formatCurrency(arpu) },
        { label: 'Churn Rate', value: formatPercent(logoChurnRate) },
        { label: 'LTV', value: ltv !== null ? formatCurrency(ltv) : '—' },
      ],
    },
    nps: {
      title: 'NPS',
      formula: 'Percentual de promotores (nota 9-10) menos percentual de detratores (nota 0-6), sobre o total de respostas NPS no período.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'score', label: 'Nota', align: 'right' }, { key: 'category', label: 'Categoria', align: 'right' },
      ],
      rows: npsResponses.map((r) => ({
        name: customerById[r.customerId]?.name || r.customerId,
        score: `${r.score}/10`,
        category: npsCategory(r.score),
      })),
      emptyText: 'Nenhuma resposta NPS no período',
    },
    registered: {
      title: 'Clientes Cadastrados',
      formula: 'Todo cadastro novo (sem histórico anterior) cujo cadastro caiu no período — inclui trial e lead, é contagem de cadastro, não de cliente ativo.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' }, { key: 'accountStatus', label: 'Status' }, { key: 'joinDate', label: 'Entrada', align: 'right' },
      ],
      rows: newRegistrations.map((c) => ({ name: c.name, tier: c.tier, accountStatus: ACCOUNT_STATUS_LABELS[c.accountStatus] ?? c.accountStatus, joinDate: c.joinDate })),
      emptyText: 'Nenhum cadastro no período',
    },
    active: {
      title: 'Total de Clientes Ativos',
      formula: 'Clientes com plano pago e sem cancelamento efetivado no período selecionado. Trial e lead (nunca tiveram pagamento) não entram aqui.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' }, { key: 'status', label: 'Status' }, { key: 'value', label: 'MRR', align: 'right' },
      ],
      rows: activeCustomers.map((c) => ({ name: c.name, tier: c.tier, status: c.status, value: formatCurrency(c.mrr) })),
      totalRow: { value: formatCurrency(totalMRR) },
      emptyText: 'Nenhum cliente ativo no período',
    },
    tpvTotal: {
      title: 'TPV Total',
      formula: 'Soma do volume total transacionado (Pix + Cartão + Boleto) por todos os clientes no período selecionado.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' },
        { key: 'pix', label: 'Pix', align: 'right' }, { key: 'cartao', label: 'Cartão', align: 'right' },
        { key: 'boleto', label: 'Boleto', align: 'right' }, { key: 'total', label: 'Total', align: 'right' },
      ],
      rows: dateFilteredAll.map((c) => ({
        name: c.name, tier: c.tier,
        pix: formatCurrency(c.tpv.pix.total), cartao: formatCurrency(c.tpv.cartao.total), boleto: formatCurrency(c.tpv.boleto.total),
        total: formatCurrency(c.tpv.pix.total + c.tpv.cartao.total + c.tpv.boleto.total),
      })),
      totalRow: {
        pix: formatCurrency(tpv.pix.total), cartao: formatCurrency(tpv.cartao.total),
        boleto: formatCurrency(tpv.boleto.total), total: formatCurrency(tpv.grandTotal),
      },
      emptyText: 'Nenhum TPV no período',
    },
    tpvPix: tpvMethodDetail('pix', 'Pix'),
    tpvCartao: tpvMethodDetail('cartao', 'Cartão'),
    tpvBoleto: tpvMethodDetail('boleto', 'Boleto'),
    upcomingRenewals: {
      title: 'Renovações nos Próximos 3 Dias',
      formula: 'Clientes ativos com a próxima cobrança agendada para os próximos 3 dias a partir de hoje.',
      columns: [
        { key: 'name', label: 'Cliente' }, { key: 'tier', label: 'Plano' }, { key: 'phone', label: 'Contato' },
        { key: 'nextCharge', label: 'Próxima Cobrança', align: 'right' }, { key: 'value', label: 'MRR', align: 'right' },
      ],
      rows: upcomingRenewals.map((c) => ({ name: c.name, tier: c.tier, phone: c.phone || '—', nextCharge: c.nextCharge, value: formatCurrency(c.mrr) })),
      totalRow: { value: formatCurrency(upcomingRenewals.reduce((a, c) => a + c.mrr, 0)) },
      emptyText: 'Nenhuma renovação nos próximos 3 dias',
    },
  };

  const cards = [
    {
      icon: <DollarSign size={18} />, iconBg: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-600 dark:text-brand-400',
      label: 'MRR Total', value: formatCurrency(totalMRR), onClick: () => setSelectedDetail(details.mrrTotal),
    },
    {
      icon: <Landmark size={18} />, iconBg: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-600 dark:text-brand-400',
      label: 'ARR', value: formatCurrency(totalMRR * 12), onClick: () => setSelectedDetail(details.arr),
    },
    {
      icon: <TrendingDown size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Churn', value: formatPercent(logoChurnRate), onClick: () => setSelectedDetail(details.churn),
    },
    {
      icon: <Percent size={18} />,
      iconBg: grr >= 90 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: grr >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      label: 'GRR', value: formatPercent(grr), onClick: () => setSelectedDetail(details.grr),
    },
    {
      icon: <Sparkles size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'New MRR', value: formatCurrency(newMrr), onClick: () => setSelectedDetail(details.newMrr),
    },
    {
      icon: <ArrowUpCircle size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Expansion MRR', value: formatCurrency(expansionMrr), onClick: () => setSelectedDetail(details.expansionMrr),
    },
    {
      icon: <ArrowDownCircle size={18} />, iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'Contraction MRR', value: formatCurrency(contractionMrr), onClick: () => setSelectedDetail(details.contractionMrr),
    },
    {
      icon: <UserMinus size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Churn MRR', value: formatCurrency(churnedMrr), onClick: () => setSelectedDetail(details.churnMrr),
    },
    {
      icon: <Smile size={18} />,
      iconBg: csat !== null && csat >= 70 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: csat !== null && csat >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      label: 'CSAT', value: csat !== null ? `${csat}%` : '—',
      hint: csat === null ? 'Sem respostas no período' : undefined,
      onClick: () => setSelectedDetail(details.csat),
    },
    {
      icon: <Gem size={18} />, iconBg: 'bg-accent-500/10', iconColor: 'text-accent-600 dark:text-accent-400',
      label: 'LTV', value: ltv !== null ? formatCurrency(ltv) : '—',
      hint: ltv === null ? 'Sem churn no período' : 'ARPU ÷ Churn Rate',
      onClick: () => setSelectedDetail(details.ltv),
    },
    {
      icon: <Star size={18} />,
      iconBg: nps !== null && nps >= 50 ? 'bg-emerald-50 dark:bg-emerald-500/10' : nps !== null && nps >= 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: nps !== null && nps >= 50 ? 'text-emerald-600 dark:text-emerald-400' : nps !== null && nps >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400',
      label: 'NPS', value: nps !== null ? `${nps >= 0 ? '+' : ''}${nps}` : '—',
      hint: nps === null ? 'Sem respostas no período' : undefined,
      onClick: () => setSelectedDetail(details.nps),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Empresa</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Indicadores financeiros e de satisfação da empresa.
          </p>
        </div>

        <FilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {cards.map((card, i) => <MetricCard key={i} {...card} />)}
        </div>

        <div className="mb-10">
          <SectionTitle>Aquisição &amp; Renovação</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard
              icon={<UserPlus size={18} />} iconBg="bg-emerald-50 dark:bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400"
              label="Clientes Cadastrados" value={newRegistrations.length} onClick={() => setSelectedDetail(details.registered)}
            />
            <MetricCard
              icon={<Users size={18} />} iconBg="bg-violet-50 dark:bg-violet-500/10" iconColor="text-violet-600 dark:text-violet-400"
              label="Total de Clientes Ativos" value={count} onClick={() => setSelectedDetail(details.active)}
            />
            <MetricCard
              icon={<CalendarClock size={18} />} iconBg="bg-cyan-50 dark:bg-cyan-500/10" iconColor="text-cyan-600 dark:text-cyan-400"
              label="Renovações em até 3 Dias" value={upcomingRenewals.length} onClick={() => setSelectedDetail(details.upcomingRenewals)}
            />
            <BreakdownTable title="Novas Assinaturas por Plano" icon={<UserPlus size={16} />} keyLabel="Plano" data={newSubsBreakdown} />
            <BreakdownTable title="Renovações por Plano" icon={<RefreshCw size={16} />} keyLabel="Plano" data={renewalsBreakdown} />
          </div>
        </div>

        <div className="mb-10">
          <SectionTitle>Cancelamento</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <BreakdownTable title="Cancelamentos por Plano" icon={<XCircle size={16} />} keyLabel="Plano" data={cancellationsBreakdown} />
            <BreakdownTable title="Não Renovados por Plano" icon={<UserX size={16} />} keyLabel="Plano" data={nonRenewalsBreakdown} />
          </div>
          <ReasonDetailTable title="Cancelamentos por Motivo" icon={<Tag size={16} />} rows={cancellationsByReasonList} />
        </div>

        <div>
          <SectionTitle>TPV Gerado</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              icon={<Wallet size={18} />} iconBg="bg-brand-50 dark:bg-brand-500/10" iconColor="text-brand-600 dark:text-brand-400"
              label="TPV Total" value={formatCurrency(tpv.grandTotal)} onClick={() => setSelectedDetail(details.tpvTotal)}
            />
            <MetricCard
              icon={<QrCode size={18} />} iconBg="bg-emerald-50 dark:bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400"
              label="TPV Pix" value={formatCurrency(tpv.pix.total)} hint={formatPercent(tpv.pix.percent)} onClick={() => setSelectedDetail(details.tpvPix)}
            />
            <MetricCard
              icon={<CreditCard size={18} />} iconBg="bg-brand-50 dark:bg-brand-500/10" iconColor="text-brand-600 dark:text-brand-400"
              label="TPV Cartão" value={formatCurrency(tpv.cartao.total)} hint={formatPercent(tpv.cartao.percent)} onClick={() => setSelectedDetail(details.tpvCartao)}
            />
            <MetricCard
              icon={<Receipt size={18} />} iconBg="bg-amber-50 dark:bg-amber-500/10" iconColor="text-amber-600 dark:text-amber-400"
              label="TPV Boleto" value={formatCurrency(tpv.boleto.total)} hint={formatPercent(tpv.boleto.percent)} onClick={() => setSelectedDetail(details.tpvBoleto)}
            />
          </div>
        </div>
      </div>

      {selectedDetail && (
        <MetricDetailModal {...selectedDetail} onClose={() => setSelectedDetail(null)} />
      )}
    </div>
  );
};

export default CompanyView;
