import React from 'react';
import { Users, AlertTriangle, MessageSquare, Zap, CreditCard, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent, formatJoinDate } from '../utils/formatters';
import { formatLastLogin } from '../utils/healthScore';

const STATUS_LABELS = {
  Healthy: { label: 'Saudável', cls: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  Attention: { label: 'Atenção', cls: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  'At Risk': { label: 'Em Risco', cls: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400' },
};

const NpsLabel = (nps) => {
  if (nps >= 70) return { label: 'Promotor', cls: 'text-emerald-600 dark:text-emerald-400' };
  if (nps >= 0) return { label: 'Neutro', cls: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Detrator', cls: 'text-rose-600 dark:text-rose-400' };
};

const ScoreBar = ({ icon, label, weight, value, color }) => (
  <div>
    <div className="flex justify-between text-xs font-medium mb-1">
      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">{icon} {label} ({weight}%)</span>
      <span className="font-bold text-slate-900 dark:text-white">{Math.round(value)}pts</span>
    </div>
    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  </div>
);

const InfoTile = ({ label, value, valueClass = '' }) => (
  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">{label}</p>
    <p className={`text-sm font-bold text-slate-900 dark:text-white ${valueClass}`}>{value}</p>
  </div>
);

const CustomerDetails = ({ selectedCustomer }) => {
  if (!selectedCustomer) {
    return (
      <div className="lg:col-span-1">
        <div className="h-[400px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center sticky top-28">
          <Users size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Selecione um cliente para ver o detalhamento da saúde.</p>
        </div>
      </div>
    );
  }

  const c = selectedCustomer;
  const statusInfo = STATUS_LABELS[c.status] ?? { label: c.status, cls: 'bg-slate-100 text-slate-600' };
  const npsInfo = NpsLabel(c.nps);

  return (
    <div className="lg:col-span-1">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden sticky top-28">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detalhes da Saúde</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.cls}`}>{statusInfo.label}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{c.name}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
            Cliente desde {formatJoinDate(c.joinDate)} · Plano {c.tier}
          </p>
          <div className="flex gap-2">
            <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Histórico
            </button>
            <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-semibold shadow-md shadow-blue-100 dark:shadow-blue-900/20 transition-colors">
              Agendar Call
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Composição do Score</h4>
            <div className="space-y-4">
              <ScoreBar icon={<MessageSquare size={13} className="text-blue-500" />} label="Engajamento" weight={15} value={c.engajamento} color="bg-blue-500" />
              <ScoreBar icon={<Zap size={13} className="text-amber-500" />} label="Performance" weight={65} value={c.performance} color="bg-amber-500" />
              <ScoreBar icon={<CreditCard size={13} className="text-indigo-500" />} label="Adoção Técnica" weight={20} value={c.adocaoTecnica} color="bg-indigo-500" />
            </div>
          </div>

          {/* Usage */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Uso da Plataforma</h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile label="Vol. do Plano" value={`${c.volumeUsage}%`} />
              <InfoTile label="Último Login" value={formatLastLogin(c.lastLoginDays)} />
              <InfoTile label="Aprovação" value={formatPercent(c.approvalRate, 0)} />
              <InfoTile label="Multi-adquirente" value={c.multiAcquirer ? 'Ativo' : 'Inativo'} />
            </div>
          </div>

          {/* Financial & VoC */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Financeiro & Voz do Cliente</h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile label="MRR" value={formatCurrency(c.mrr)} />
              <InfoTile label="ARR" value={formatCurrency(c.mrr * 12)} />
              <InfoTile label="NPS" value={`${c.nps > 0 ? '+' : ''}${c.nps} · ${npsInfo.label}`} valueClass={npsInfo.cls} />
              <InfoTile label="CSAT" value={formatPercent(c.csat, 0)} />
            </div>
          </div>

          {/* Churn alert */}
          {c.status === 'At Risk' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-rose-500 flex-shrink-0 mt-0.5" size={17} />
              <div>
                <p className="text-xs font-bold text-rose-800 dark:text-rose-400 mb-1">Protocolo de Churn Ativado</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-tight">
                  {c.lastLoginDays > 10
                    ? `Sem login há ${c.lastLoginDays} dias e taxa de aprovação crítica de ${formatPercent(c.approvalRate, 0)}.`
                    : `Taxa de aprovação crítica (${formatPercent(c.approvalRate, 0)}) e baixo volume de uso.`}
                </p>
              </div>
            </div>
          )}

          {/* Expansion hint */}
          {c.status === 'Healthy' && c.volumeUsage >= 90 && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-xl flex items-start gap-3">
              <TrendingUp className="text-emerald-500 flex-shrink-0 mt-0.5" size={17} />
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1">Oportunidade de Expansão</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-tight">
                  Uso em {c.volumeUsage}% do plano. Momento ideal para proposta de upgrade.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
