import React, { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Users, Award, BarChart2, ArrowUpRight, ArrowDownRight, Info,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';

const METRIC_TOOLTIPS = {
  avgScore: 'Pontuação média de todos os clientes ativos. Calculada com base em Engajamento (15%), Performance de aprovação (65%) e Adoção Técnica (20%).',
  atRisk: 'Clientes com Health Score abaixo de 50. Indicam alto risco de churn e requerem ação imediata do time de CS.',
  totalMRR: 'Receita Recorrente Mensal: soma dos valores mensais dos planos de assinatura ativos. Não inclui take rate sobre transações.',
  nrr: 'Net Revenue Retention: acima de 100% indica que a receita cresce organicamente via upgrades, compensando os cancelamentos.',
  ltvCac: 'Relação entre o valor de vida do cliente (LTV) e o custo de aquisição (CAC). Referência saudável: ≥ 3x.',
  logoChurn: 'Percentual de clientes que cancelaram no mês em relação ao total ativo no início do período. Não inclui trials.',
  nps: 'Net Promoter Score: % Promotores (nota 9-10) menos % Detratores (nota 0-6). Mede a lealdade relacional da base.',
  csat: 'Customer Satisfaction Score médio do Onboarding. Baseado em respostas coletadas no Dia 30 de cada cliente.',
};

const MetricTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <Info size={13} className="text-slate-300 dark:text-slate-600 cursor-help" />
      {visible && (
        <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-slate-900 dark:bg-slate-700 text-slate-200 text-[11px] leading-relaxed rounded-xl shadow-xl z-20 pointer-events-none">
          {text}
          <div className="absolute top-full right-2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
};

const Card = ({ icon, iconBg, iconColor, label, value, badge, badgeUp, tooltipKey }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
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
  </div>
);

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      icon: <Activity size={18} />, iconBg: 'bg-blue-50 dark:bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'Média de Saúde', value: `${stats.avgScore} / 100`, tooltipKey: 'avgScore',
    },
    {
      icon: <AlertTriangle size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Clientes em Risco', value: stats.atRisk, tooltipKey: 'atRisk',
    },
    {
      icon: <TrendingUp size={18} />, iconBg: 'bg-indigo-50 dark:bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400',
      label: 'MRR Total', value: formatCurrency(stats.totalMRR), tooltipKey: 'totalMRR',
    },
    {
      icon: <BarChart2 size={18} />,
      iconBg: stats.nrr >= 100 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: stats.nrr >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      label: 'NRR', value: formatPercent(stats.nrr),
      badge: stats.nrr >= 100 ? 'Expansão' : 'Contração', badgeUp: stats.nrr >= 100,
      tooltipKey: 'nrr',
    },
    {
      icon: <Award size={18} />, iconBg: 'bg-violet-50 dark:bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400',
      label: 'LTV / CAC', value: `${stats.ltvCacRatio.toFixed(1)}x`,
      badge: stats.ltvCacRatio >= 3 ? 'Saudável' : 'Alerta', badgeUp: stats.ltvCacRatio >= 3,
      tooltipKey: 'ltvCac',
    },
    {
      icon: <TrendingDown size={18} />, iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconColor: 'text-rose-600 dark:text-rose-400',
      label: 'Logo Churn', value: formatPercent(stats.logoChurnRate), tooltipKey: 'logoChurn',
    },
    {
      icon: <Users size={18} />,
      iconBg: stats.avgNps >= 50 ? 'bg-emerald-50 dark:bg-emerald-500/10' : stats.avgNps >= 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: stats.avgNps >= 50 ? 'text-emerald-600 dark:text-emerald-400' : stats.avgNps >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400',
      label: 'NPS Médio', value: stats.avgNps > 0 ? `+${stats.avgNps}` : String(stats.avgNps),
      tooltipKey: 'nps',
    },
    {
      icon: <CheckCircle2 size={18} />, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'CSAT Médio', value: formatPercent(stats.avgCsat, 0), tooltipKey: 'csat',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => <Card key={i} {...card} />)}
    </div>
  );
};

export default StatsCards;
