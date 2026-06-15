import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getSurveys, getResponses } from '../utils/surveyStorage';
import SurveyModal from './SurveyModal';

const TYPE_BADGE = {
  nps: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  csat: 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
};

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Aguardando', cls: 'text-amber-500' },
  responded: { icon: CheckCircle2, label: 'Respondido', cls: 'text-emerald-500' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const ScoreBadge = ({ type, score }) => {
  if (score === null || score === undefined) return <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>;
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

const SurveysView = ({ customers }) => {
  const [modal, setModal] = useState(null); // 'nps' | 'csat' | null
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);

  const refresh = () => {
    setSurveys(getSurveys());
    setResponses(getResponses());
  };

  useEffect(() => { refresh(); }, []);

  const enriched = surveys.map((s) => {
    const response = responses.find((r) => r.token === s.token);
    return { ...s, response: response || null };
  });

  const npsTotal = enriched.filter((s) => s.type === 'nps').length;
  const csatTotal = enriched.filter((s) => s.type === 'csat').length;
  const respondedTotal = enriched.filter((s) => s.response).length;
  const pendingTotal = enriched.filter((s) => !s.response).length;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pesquisas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Gerencie e envie pesquisas NPS e CSAT aos seus clientes.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModal('csat')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm"
            >
              <Plus size={16} /> Nova CSAT
            </button>
            <button
              onClick={() => setModal('nps')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
            >
              <Plus size={16} /> Novo NPS
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Enviadas', value: enriched.length, color: 'text-slate-900 dark:text-white' },
            { label: 'NPS', value: npsTotal, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'CSAT', value: csatTotal, color: 'text-violet-600 dark:text-violet-400' },
            { label: 'Respondidas', value: respondedTotal, color: 'text-emerald-600 dark:text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Survey list */}
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
              <p className="text-xs mt-1">Clique em "Novo NPS" ou "Nova CSAT" para começar.</p>
            </div>
          ) : (
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
                  return (
                    <tr key={s.token} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.customerName}</p>
                        {s.response?.comment && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                            "{s.response.comment}"
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${TYPE_BADGE[s.type]}`}>
                          {s.type}
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
          )}
        </div>
      </div>

      {modal && (
        <SurveyModal
          type={modal}
          customers={customers}
          onClose={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
};

export default SurveysView;
