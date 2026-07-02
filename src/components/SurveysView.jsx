import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, Send, Users } from 'lucide-react';
import { getSurveys, getResponses } from '../utils/surveyStorage';
import { getEligibleCustomers, SURVEY_META } from '../utils/surveyEligibility';
import SurveyDispatchModal from './SurveyDispatchModal';
import GlassCard from './ui/GlassCard';

const TYPE_ORDER = ['nps', 'csat_onboarding', 'csat_health', 'csat_nps_follow'];

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Aguardando', cls: 'text-amber-500' },
  responded: { icon: CheckCircle2, label: 'Respondido', cls: 'text-emerald-500' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const ScoreBadge = ({ type, score }) => {
  if (score == null) return <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>;
  const isNps = type === 'nps';
  const color = isNps
    ? score >= 9 ? 'text-emerald-600 dark:text-emerald-400' : score >= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
    : score >= 4 ? 'text-emerald-600 dark:text-emerald-400' : score >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
  return (
    <span className={`font-bold text-sm ${color}`}>
      {score}{isNps ? '/10' : '/5'}
    </span>
  );
};

// ─── Eligible Group Card ───────────────────────────────────────────────────

const EligibleCard = ({ type, customers, onDispatch }) => {
  const meta = SURVEY_META[type];
  const count = customers.length;

  if (count === 0) return null;

  return (
    <GlassCard variant="subtle" className={`border ${meta.borderCls} overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
              <Users size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{meta.label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight mt-0.5">{meta.description}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${meta.badgeCls}`}>
            {count}
          </span>
        </div>

        <div className="space-y-1.5 mb-4">
          {customers.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
              <span className="flex-shrink-0 ml-2">Score {c.score}</span>
            </div>
          ))}
          {count > 3 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-1">
              + {count - 3} cliente{count - 3 !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <button
          onClick={() => onDispatch(type)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${meta.btnCls}`}
        >
          <Send size={14} />
          Disparar para {count} cliente{count !== 1 ? 's' : ''}
        </button>
      </div>
    </GlassCard>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────

const SurveysView = ({ customers = [] }) => {
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [modal, setModal] = useState(null); // survey type key

  const refresh = async () => {
    const [s, r] = await Promise.all([getSurveys(), getResponses()]);
    setSurveys(s);
    setResponses(r);
  };

  useEffect(() => { refresh(); }, []);

  const enriched = surveys.map((s) => ({
    ...s,
    response: responses.find((r) => r.token === s.token) || null,
  }));

  const eligible = getEligibleCustomers(customers, surveys, responses);

  const totalEligible = TYPE_ORDER.reduce((acc, t) => acc + eligible[t].length, 0);
  const respondedTotal = enriched.filter((s) => s.response).length;
  const pendingTotal = enriched.filter((s) => !s.response).length;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pesquisas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Disparo automático baseado em regras de elegibilidade de cada cliente.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Enviadas', value: enriched.length, color: 'text-slate-900 dark:text-white' },
            { label: 'Respondidas', value: respondedTotal, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Aguardando', value: pendingTotal, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Elegíveis agora', value: totalEligible, color: 'text-brand-600 dark:text-brand-400' },
          ].map(({ label, value, color }) => (
            <GlassCard key={label} variant="default" className="p-5">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </GlassCard>
          ))}
        </div>

        {/* Eligible section */}
        {totalEligible > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 inline-block"></span>
              Prontos para disparo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TYPE_ORDER.map((type) =>
                eligible[type].length > 0 ? (
                  <EligibleCard
                    key={type}
                    type={type}
                    customers={eligible[type]}
                    onDispatch={setModal}
                  />
                ) : null
              )}
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Histórico de Pesquisas</h2>
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <RefreshCw size={13} /> Atualizar
            </button>
          </div>

          {enriched.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
              <AlertCircle size={36} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">Nenhuma pesquisa enviada ainda.</p>
              <p className="text-xs mt-1">Dispare para os clientes elegíveis acima.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 font-semibold">Cliente</th>
                    <th className="px-6 py-3 font-semibold">Tipo</th>
                    <th className="px-6 py-3 font-semibold">Enviada em</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {enriched.map((s) => {
                    const statusCfg = STATUS_CONFIG[s.response ? 'responded' : 'pending'];
                    const Icon = statusCfg.icon;
                    const meta = SURVEY_META[s.type] || SURVEY_META['nps'];
                    return (
                      <tr key={s.token} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.customerName}</p>
                          {s.response?.comment && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                              "{s.response.comment}"
                            </p>
                          )}
                          {s.response?.feedback && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                              "{s.response.feedback}"
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${meta.badgeCls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 text-xs font-semibold ${statusCfg.cls}`}>
                            <Icon size={13} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ScoreBadge type={s.type} score={s.response?.score} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <SurveyDispatchModal
          type={modal}
          customers={eligible[modal]}
          onClose={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
};

export default SurveysView;
