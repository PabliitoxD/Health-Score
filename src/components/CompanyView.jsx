import React, { useState, useEffect } from 'react';
import {
  DollarSign, Landmark, TrendingDown, Percent, Sparkles,
  ArrowUpCircle, ArrowDownCircle, UserMinus, Smile, Gem, Star,
} from 'lucide-react';
import { getStats } from '../services/api';
import { getResponses } from '../utils/surveyStorage';
import { computeNps, computeCsat } from '../utils/surveyKpis';
import { formatCurrency, formatPercent } from '../utils/formatters';
import GlassCard from './ui/GlassCard';

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

const CompanyView = () => {
  const [stats, setStats] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsData, responsesData] = await Promise.all([getStats(), getResponses()]);
        setStats(statsData);
        setResponses(responsesData);
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando indicadores da empresa...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <GlassCard variant="subtle" className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-600">
            <p className="text-sm font-medium">Nenhum dado disponível ainda.</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  const nps = computeNps(responses);
  const csat = computeCsat(responses);
  const ltv = stats.logoChurnRate > 0 ? stats.arpu / (stats.logoChurnRate / 100) : null;

  const cards = [
    {
      icon: <DollarSign size={18} />, iconBg: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-600 dark:text-brand-400',
      label: 'MRR Total', value: formatCurrency(stats.totalMRR ?? 0),
    },
    {
      icon: <Landmark size={18} />, iconBg: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-600 dark:text-brand-400',
      label: 'ARR', value: formatCurrency(stats.arr ?? 0),
    },
    {
      icon: <TrendingDown size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Churn', value: formatPercent(stats.logoChurnRate ?? 0),
    },
    {
      icon: <Percent size={18} />,
      iconBg: (stats.grr ?? 100) >= 90 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: (stats.grr ?? 100) >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      label: 'GRR', value: formatPercent(stats.grr ?? 100),
    },
    {
      icon: <Sparkles size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'New MRR', value: formatCurrency(stats.newMrr ?? 0),
    },
    {
      icon: <ArrowUpCircle size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Expansion MRR', value: formatCurrency(stats.expansionMrr ?? 0),
    },
    {
      icon: <ArrowDownCircle size={18} />, iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'Contraction MRR', value: formatCurrency(stats.contractionMrr ?? 0),
    },
    {
      icon: <UserMinus size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Churn MRR', value: formatCurrency(stats.churnedMrr ?? 0),
    },
    {
      icon: <Smile size={18} />,
      iconBg: csat !== null && csat >= 70 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: csat !== null && csat >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      label: 'CSAT', value: csat !== null ? `${csat}%` : '—',
      hint: csat === null ? 'Sem respostas ainda' : undefined,
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
      hint: nps === null ? 'Sem respostas ainda' : undefined,
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Empresa</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Totais gerais da empresa — financeiro e satisfação de clientes.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {cards.map((card, i) => <MetricCard key={i} {...card} />)}
        </div>
      </div>
    </div>
  );
};

export default CompanyView;
