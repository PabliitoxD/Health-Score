import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Landmark, TrendingDown, Percent, Sparkles,
  ArrowUpCircle, ArrowDownCircle, UserMinus, Smile, Gem, Star,
  UserPlus, Users, RefreshCw, XCircle, UserX, Tag,
} from 'lucide-react';
import { getCustomers, getCancellations, getNonRenewals } from '../services/api';
import { getResponses } from '../utils/surveyStorage';
import { computeNps, computeCsat } from '../utils/surveyKpis';
import { computeRevenueRetention, computeLogoChurn, computePlanBreakdown, computeBreakdown } from '../utils/kpis';
import { applyDateFilter } from '../utils/dateFilter';
import { formatCurrency, formatPercent } from '../utils/formatters';
import GlassCard from './ui/GlassCard';
import FilterBar from './FilterBar';

const MetricCard = ({ icon, iconBg, iconColor, label, value, hint }) => (
  <GlassCard variant="default" className="p-5">
    <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-3 ${iconBg} ${iconColor}`}>
      {icon}
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-1">{label}</p>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</h3>
    {hint && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
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

const CompanyView = () => {
  const [customers, setCustomers] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [nonRenewals, setNonRenewals] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Todos os clientes (novos + existentes) filtrados por joinDate — mesma base
  // que o Dashboard usa pra MRR Total/ARPU/contagem.
  const dateFilteredAll = useMemo(
    () => applyDateFilter(customers, dateFilter, customDateRange, 'joinDate'),
    [customers, dateFilter, customDateRange]
  );

  // Clientes sem previousMrr = primeira assinatura, dentro de dateFilteredAll.
  const newCustomers = useMemo(
    () => dateFilteredAll.filter((c) => c.previousMrr === null || c.previousMrr === undefined),
    [dateFilteredAll]
  );

  // Clientes existentes filtrados pela data da ÚLTIMA COBRANÇA — é quando a
  // renovação de fato aconteceu, joinDate não serve pra esse grupo (clientes
  // antigos raramente entraram dentro de um filtro estreito).
  const retainedCustomers = useMemo(
    () => applyDateFilter(
      customers.filter((c) => c.previousMrr !== null && c.previousMrr !== undefined),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando indicadores da empresa...</p>
      </div>
    );
  }

  const count = dateFilteredAll.length;
  const totalMRR = dateFilteredAll.reduce((a, c) => a + c.mrr, 0);
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
  const cancellationsByReason = computeBreakdown(cancellationsInPeriod, { groupField: 'reason' });

  const cards = [
    {
      icon: <DollarSign size={18} />, iconBg: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-600 dark:text-brand-400',
      label: 'MRR Total', value: formatCurrency(totalMRR),
    },
    {
      icon: <Landmark size={18} />, iconBg: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-600 dark:text-brand-400',
      label: 'ARR', value: formatCurrency(totalMRR * 12),
    },
    {
      icon: <TrendingDown size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Churn', value: formatPercent(logoChurnRate),
    },
    {
      icon: <Percent size={18} />,
      iconBg: grr >= 90 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: grr >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      label: 'GRR', value: formatPercent(grr),
    },
    {
      icon: <Sparkles size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'New MRR', value: formatCurrency(newMrr),
    },
    {
      icon: <ArrowUpCircle size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Expansion MRR', value: formatCurrency(expansionMrr),
    },
    {
      icon: <ArrowDownCircle size={18} />, iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'Contraction MRR', value: formatCurrency(contractionMrr),
    },
    {
      icon: <UserMinus size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Churn MRR', value: formatCurrency(churnedMrr),
    },
    {
      icon: <Smile size={18} />,
      iconBg: csat !== null && csat >= 70 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: csat !== null && csat >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      label: 'CSAT', value: csat !== null ? `${csat}%` : '—',
      hint: csat === null ? 'Sem respostas no período' : undefined,
    },
    {
      icon: <Gem size={18} />, iconBg: 'bg-accent-500/10', iconColor: 'text-accent-600 dark:text-accent-400',
      label: 'LTV', value: ltv !== null ? formatCurrency(ltv) : '—',
      hint: ltv === null ? 'Sem churn no período' : 'ARPU ÷ Churn Rate',
    },
    {
      icon: <Star size={18} />,
      iconBg: nps !== null && nps >= 50 ? 'bg-emerald-50 dark:bg-emerald-500/10' : nps !== null && nps >= 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: nps !== null && nps >= 50 ? 'text-emerald-600 dark:text-emerald-400' : nps !== null && nps >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400',
      label: 'NPS', value: nps !== null ? `${nps >= 0 ? '+' : ''}${nps}` : '—',
      hint: nps === null ? 'Sem respostas no período' : undefined,
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
              label="Clientes Cadastrados" value={newCustomers.length}
            />
            <MetricCard
              icon={<Users size={18} />} iconBg="bg-violet-50 dark:bg-violet-500/10" iconColor="text-violet-600 dark:text-violet-400"
              label="Total de Clientes Ativos" value={count}
            />
            <BreakdownTable title="Novas Assinaturas por Plano" icon={<UserPlus size={16} />} keyLabel="Plano" data={newSubsBreakdown} />
            <BreakdownTable title="Renovações por Plano" icon={<RefreshCw size={16} />} keyLabel="Plano" data={renewalsBreakdown} />
          </div>
        </div>

        <div>
          <SectionTitle>Cancelamento</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BreakdownTable title="Cancelamentos por Plano" icon={<XCircle size={16} />} keyLabel="Plano" data={cancellationsBreakdown} />
            <BreakdownTable title="Não Renovados por Plano" icon={<UserX size={16} />} keyLabel="Plano" data={nonRenewalsBreakdown} />
            <BreakdownTable title="Cancelamentos por Motivo" icon={<Tag size={16} />} keyLabel="Motivo" data={cancellationsByReason} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyView;
