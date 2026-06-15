import React from 'react';
import { Users, AlertTriangle, MessageSquare, Zap, CreditCard, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent, formatJoinDate } from '../utils/formatters';
import { formatLastLogin } from '../utils/healthScore';

const STATUS_LABELS = {
  Healthy: { label: 'Saudável', cls: 'bg-emerald-100 text-emerald-700' },
  Attention: { label: 'Atenção', cls: 'bg-amber-100 text-amber-700' },
  'At Risk': { label: 'Em Risco', cls: 'bg-rose-100 text-rose-700' },
};

const ScoreBar = ({ icon, label, weight, value, color }) => (
  <div>
    <div className="flex justify-between text-xs font-medium mb-1">
      <span className="flex items-center gap-1">{icon} {label} ({weight}%)</span>
      <span className="font-bold">{Math.round(value)}pts</span>
    </div>
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  </div>
);

const NpsLabel = (nps) => {
  if (nps >= 70) return { label: 'Promotor', cls: 'text-emerald-600' };
  if (nps >= 0) return { label: 'Neutro', cls: 'text-amber-600' };
  return { label: 'Detrator', cls: 'text-rose-600' };
};

const CustomerDetails = ({ selectedCustomer }) => {
  if (!selectedCustomer) {
    return (
      <div className="lg:col-span-1">
        <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8 text-center sticky top-4">
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-4">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-lg font-bold">Detalhes da Saúde</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <h3 className="text-xl font-bold mb-1">{c.name}</h3>
          <p className="text-slate-500 text-xs mb-4">
            Cliente desde {formatJoinDate(c.joinDate)} • Plano {c.tier}
          </p>
          <div className="flex gap-2">
            <button className="flex-1 bg-white border border-slate-200 py-2 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
              Histórico
            </button>
            <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold shadow-md shadow-blue-100 hover:bg-blue-700 transition-colors">
              Agendar Call
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Health Score */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Composição do Score
            </h4>
            <div className="space-y-4">
              <ScoreBar
                icon={<MessageSquare size={13} className="text-blue-500" />}
                label="Engajamento"
                weight={15}
                value={c.engajamento}
                color="bg-blue-500"
              />
              <ScoreBar
                icon={<Zap size={13} className="text-amber-500" />}
                label="Performance"
                weight={65}
                value={c.performance}
                color="bg-amber-500"
              />
              <ScoreBar
                icon={<CreditCard size={13} className="text-indigo-500" />}
                label="Adoção Técnica"
                weight={20}
                value={c.adocaoTecnica}
                color="bg-indigo-500"
              />
            </div>
          </div>

          {/* Usage Info */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Uso da Plataforma
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Vol. do Plano</p>
                <p className="text-sm font-bold">{c.volumeUsage}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Último Login</p>
                <p className="text-sm font-bold">{formatLastLogin(c.lastLoginDays)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Aprovação</p>
                <p className="text-sm font-bold">{formatPercent(c.approvalRate, 0)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Multi-adquirente</p>
                <p className="text-sm font-bold">{c.multiAcquirer ? 'Ativo' : 'Inativo'}</p>
              </div>
            </div>
          </div>

          {/* Financial & Voice Metrics */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Financeiro & Voz do Cliente
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">MRR</p>
                <p className="text-sm font-bold">{formatCurrency(c.mrr)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ARR</p>
                <p className="text-sm font-bold">{formatCurrency(c.mrr * 12)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">NPS</p>
                <p className={`text-sm font-bold ${npsInfo.cls}`}>
                  {c.nps > 0 ? `+${c.nps}` : c.nps} · {npsInfo.label}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">CSAT</p>
                <p className="text-sm font-bold">{formatPercent(c.csat, 0)}</p>
              </div>
            </div>
          </div>

          {/* Churn Alert */}
          {c.status === 'At Risk' && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-rose-500 flex-shrink-0 mt-0.5" size={17} />
              <div>
                <p className="text-xs font-bold text-rose-800 mb-1">Protocolo de Churn Ativado</p>
                <p className="text-[11px] text-rose-600 leading-tight">
                  {c.lastLoginDays > 10
                    ? `Sem login há ${c.lastLoginDays} dias e taxa de aprovação crítica de ${formatPercent(c.approvalRate, 0)}.`
                    : `Taxa de aprovação crítica (${formatPercent(c.approvalRate, 0)}) e baixo volume de uso.`}
                </p>
              </div>
            </div>
          )}

          {/* Expansion hint */}
          {c.status === 'Healthy' && c.volumeUsage >= 90 && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <TrendingUp className="text-emerald-500 flex-shrink-0 mt-0.5" size={17} />
              <div>
                <p className="text-xs font-bold text-emerald-800 mb-1">Oportunidade de Expansão</p>
                <p className="text-[11px] text-emerald-600 leading-tight">
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
