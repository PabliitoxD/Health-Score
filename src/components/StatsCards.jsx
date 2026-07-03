import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Percent,
  Users, CreditCard, ArrowUpRight, ArrowDownRight, Info, ShieldCheck, Clock,
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
  trialCount: 'Contas em período de teste (trial) — ainda não são receita, contadas à parte dos clientes ativos.',
};

// Renderizada via portal em document.body: cada GlassCard tem seu próprio
// backdrop-filter, que cria um stacking context isolado — um z-index alto
// preso dentro de um card fica "atrás" de cards seguintes no grid. O portal
// escapa dessa árvore e posiciona a caixa via coordenadas de viewport (fixed).
const TOOLTIP_WIDTH = 192; // w-48

const MetricTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.right - TOOLTIP_WIDTH, window.innerWidth - TOOLTIP_WIDTH - 8)),
      });
    }
    setVisible(true);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
    >
      <Info size={13} className="text-slate-300 dark:text-slate-600 cursor-help" />
      {visible && coords && createPortal(
        <div
          className="fixed p-3 bg-slate-900 dark:bg-slate-700 text-slate-200 text-[11px] leading-relaxed rounded-xl shadow-xl z-[999] pointer-events-none"
          style={{ top: coords.top, left: coords.left, width: TOOLTIP_WIDTH }}
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  );
};

const Card = ({ icon, iconBg, iconColor, label, value, badge, badgeUp, tooltipKey }) => (
  <GlassCard variant="default" className="p-5">
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
    {
      icon: <Clock size={18} />, iconBg: 'bg-cyan-50 dark:bg-cyan-500/10', iconColor: 'text-cyan-600 dark:text-cyan-400',
      label: 'Em Trial', value: stats.trialCount ?? 0, tooltipKey: 'trialCount',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card, i) => <Card key={i} {...card} />)}
    </div>
  );
};

export default StatsCards;
