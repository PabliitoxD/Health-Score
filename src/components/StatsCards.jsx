import React from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, TrendingUp,
  TrendingDown, Users, Award, BarChart2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';

const Card = ({ icon, iconBg, iconColor, label, value, badge, badgeUp }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2 ${iconBg} rounded-lg ${iconColor}`}>{icon}</div>
      {badge !== undefined && (
        <span className={`text-xs font-bold flex items-center gap-0.5 ${badgeUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          {badgeUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {badge}
        </span>
      )}
    </div>
    <p className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold mb-1">{label}</p>
    <h3 className="text-xl font-bold leading-tight">{value}</h3>
  </div>
);

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      icon: <Activity size={18} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      label: 'Média de Saúde',
      value: `${stats.avgScore} / 100`,
      badge: null,
    },
    {
      icon: <AlertTriangle size={18} />,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      label: 'Clientes em Risco',
      value: stats.atRisk,
      badge: null,
    },
    {
      icon: <TrendingUp size={18} />,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      label: 'MRR Total',
      value: formatCurrency(stats.totalMRR),
      badge: null,
    },
    {
      icon: <BarChart2 size={18} />,
      iconBg: stats.nrr >= 100 ? 'bg-emerald-50' : 'bg-amber-50',
      iconColor: stats.nrr >= 100 ? 'text-emerald-600' : 'text-amber-600',
      label: 'NRR',
      value: formatPercent(stats.nrr),
      badge: stats.nrr >= 100 ? 'Expansão' : 'Contração',
      badgeUp: stats.nrr >= 100,
    },
    {
      icon: <Award size={18} />,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      label: 'LTV / CAC',
      value: `${stats.ltvCacRatio.toFixed(1)}x`,
      badge: stats.ltvCacRatio >= 3 ? 'Saudável' : 'Alerta',
      badgeUp: stats.ltvCacRatio >= 3,
    },
    {
      icon: <TrendingDown size={18} />,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      label: 'Logo Churn',
      value: formatPercent(stats.logoChurnRate),
      badge: null,
    },
    {
      icon: <Users size={18} />,
      iconBg: stats.avgNps >= 50 ? 'bg-emerald-50' : stats.avgNps >= 0 ? 'bg-amber-50' : 'bg-rose-50',
      iconColor: stats.avgNps >= 50 ? 'text-emerald-600' : stats.avgNps >= 0 ? 'text-amber-600' : 'text-rose-600',
      label: 'NPS Médio',
      value: stats.avgNps > 0 ? `+${stats.avgNps}` : String(stats.avgNps),
      badge: null,
    },
    {
      icon: <CheckCircle2 size={18} />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      label: 'CSAT Médio',
      value: formatPercent(stats.avgCsat, 0),
      badge: null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => (
        <Card key={i} {...card} />
      ))}
    </div>
  );
};

export default StatsCards;
