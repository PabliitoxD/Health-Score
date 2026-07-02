import React, { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Percent,
  Users, CreditCard, ArrowUpRight, ArrowDownRight, Info, ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';
import GlassCard from './ui/GlassCard';

const METRIC_TOOLTIPS = {
  avgScore: 'Pontuação média de saúde dos clientes ativos. Calculada com base em Engajamento (40%), Adoção Técnica (35%) e Saúde Financeira (25%).',
  atRisk: 'Clientes com Health Score abaixo de 50. Indicam alto risco de churn e requerem ação imediata do time de CS.',
  healthy: 'Clientes com Health Score acima de 75. Base saudável e com menor propensão a churn.',
  totalMRR: 'Receita Recorrente Mensal: soma dos valores mensais dos planos de assinatura ativos.',
  nrr: 'Net Revenue Retention: receita retida de clientes existentes, incluindo expansão e descontando contração e churn. Acima de 100% indica que a expansão supera as perdas.',
  grr: 'Gross Revenue Retention: receita retida de clientes existentes, descontando apenas contração e churn (sem contar expansão). Referência saudável: acima de 90%.',
  logoChurn: 'Percentual de clientes que cancelaram em relação ao total ativo no início do período.',
  cancelledCount: 'Total de clientes cancelados com justificativa registrada no período.',
  multiAcquirer: 'Percentual de clientes que utilizam mais de uma adquirente. Indica maior adoção da plataforma.',
  activeCount: 'Total de clientes com plano ativo no momento.',
};

// Posicionada absolute relativa ao Card inteiro (não ao ícone) — evita
// que a caixa de texto, mais alta que um card, estoure sobre as linhas abaixo.
const MetricTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <Info size={13} className="text-slate-300 dark:text-slate-600 cursor-help" />
      {visible && (
        <div className="absolute top-full right-2 mt-2 w-48 max-w-[85vw] p-3 bg-slate-900 dark:bg-slate-700 text-slate-200 text-[11px] leading-relaxed rounded-xl shadow-xl z-20 pointer-events-none">
          <div className="absolute bottom-full right-2 border-4 border-transparent border-b-slate-900 dark:border-b-slate-700" />
          {text}
        </div>
      )}
    </div>
  );
};

const Card = ({ icon, iconBg, iconColor, label, value, badge, badgeUp, tooltipKey }) => (
  <GlassCard variant="default" className="p-5 relative">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2 ${iconBg} rounded-lg ${iconColor}`}>{icon}</div>
      <div className="flex items-center gap-2">
        {badge !== undefined && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${badgeUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {badgeUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {badge}
          </span>
        )}
        {tooltipKey && <MetricTooltip text={METRIC_TOOLTIPS[tooltipKey]} />}
      </div>
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-1">{label}</p>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</h3>
  </GlassCard>
);

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      icon: <Activity size={18} />, iconBg: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-600 dark:text-brand-400',
      label: 'Média de Saúde', value: `${stats.avgScore ?? 0} / 100`, tooltipKey: 'avgScore',
    },
    {
      icon: <AlertTriangle size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Clientes em Risco', value: stats.atRisk ?? 0, tooltipKey: 'atRisk',
    },
    {
      icon: <CheckCircle2 size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Clientes Saudáveis', value: stats.healthy ?? 0, tooltipKey: 'healthy',
    },
    {
      icon: <CreditCard size={18} />, iconBg: 'bg-indigo-50 dark:bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400',
      label: 'MRR Total', value: formatCurrency(stats.totalMRR ?? 0), tooltipKey: 'totalMRR',
    },
    {
      icon: <TrendingUp size={18} />,
      iconBg: (stats.nrr ?? 100) >= 100 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: (stats.nrr ?? 100) >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      label: 'NRR', value: formatPercent(stats.nrr ?? 100), tooltipKey: 'nrr',
    },
    {
      icon: <Percent size={18} />,
      iconBg: (stats.grr ?? 100) >= 90 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: (stats.grr ?? 100) >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      label: 'GRR', value: formatPercent(stats.grr ?? 100), tooltipKey: 'grr',
    },
    {
      icon: <TrendingDown size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Logo Churn', value: formatPercent(stats.logoChurnRate ?? 0), tooltipKey: 'logoChurn',
    },
    {
      icon: <Users size={18} />, iconBg: 'bg-slate-50 dark:bg-slate-700/30', iconColor: 'text-slate-600 dark:text-slate-400',
      label: 'Cancelamentos', value: stats.cancelledCount ?? 0, tooltipKey: 'cancelledCount',
    },
    {
      icon: <ShieldCheck size={18} />,
      iconBg: (stats.multiAcquirerRate ?? 0) >= 50 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: (stats.multiAcquirerRate ?? 0) >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      label: 'Multi-adquirente', value: formatPercent(stats.multiAcquirerRate ?? 0),
      badge: (stats.multiAcquirerRate ?? 0) >= 50 ? 'Boa adoção' : 'Baixa adoção',
      badgeUp: (stats.multiAcquirerRate ?? 0) >= 50,
      tooltipKey: 'multiAcquirer',
    },
    {
      icon: <Users size={18} />, iconBg: 'bg-violet-50 dark:bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400',
      label: 'Clientes Ativos', value: stats.activeCount ?? 0, tooltipKey: 'activeCount',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card, i) => <Card key={i} {...card} />)}
    </div>
  );
};

export default StatsCards;
