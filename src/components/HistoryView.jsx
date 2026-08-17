import React, { useState, useEffect, useMemo } from 'react';
import { History, UserPlus, TrendingUp, DollarSign, Search, X, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { getMonthlyHistory } from '../services/api';
import { formatCurrency, formatJoinDate, formatDateOnly } from '../utils/formatters';
import GlassCard from './ui/GlassCard';

export const TYPE_LABELS = {
  assinatura: 'Assinatura',
  renovacao: 'Renovação',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  cancelamento: 'Cancelamento',
  nao_renovacao: 'Não Renovação',
};

export const TYPE_CLASS = {
  assinatura: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  renovacao: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
  upgrade: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  downgrade: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  cancelamento: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  nao_renovacao: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
};

const COLUMN_TYPES = ['assinatura', 'renovacao', 'upgrade', 'downgrade', 'cancelamento', 'nao_renovacao'];

const SummaryCard = ({ icon, iconBg, iconColor, label, value }) => (
  <GlassCard variant="default" className="p-5">
    <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-3 ${iconBg} ${iconColor}`}>
      {icon}
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-1">{label}</p>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</h3>
  </GlassCard>
);

const MonthLabel = ({ month }) => (
  <span className="capitalize">{formatJoinDate(`${month}-01`)}</span>
);

const DeltaValue = ({ value, formatter }) => {
  const cls = value > 0 ? 'text-emerald-600 dark:text-emerald-400' : value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400';
  const sign = value > 0 ? '+' : '';
  return <span className={`font-semibold ${cls}`}>{sign}{formatter ? formatter(value) : value}</span>;
};

const EventRow = ({ event }) => (
  <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
    <td className="px-4 py-2.5">
      <p className="font-semibold text-slate-900 dark:text-white text-sm">{event.name}</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs">Cód. {event.customerId} · {event.tier}</p>
    </td>
    <td className="px-4 py-2.5">
      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${TYPE_CLASS[event.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
        {TYPE_LABELS[event.type] || event.type}
      </span>
    </td>
    <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDateOnly(event.date)}</td>
    <td className="px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white text-right whitespace-nowrap">{event.mrr !== null ? formatCurrency(event.mrr) : '—'}</td>
    <td className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 max-w-[240px] truncate" title={event.description || ''}>
      {event.description || '—'}
    </td>
  </tr>
);

const MonthRow = ({ bucket, expanded, onToggle }) => (
  <>
    <tr
      onClick={onToggle}
      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          <MonthLabel month={bucket.month} />
        </div>
      </td>
      {COLUMN_TYPES.map((type) => (
        <td key={type} className="px-3 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
          {bucket.counts[type] || 0}
        </td>
      ))}
      <td className="px-4 py-3 text-right whitespace-nowrap"><DeltaValue value={bucket.netMrr} formatter={formatCurrency} /></td>
      <td className="px-4 py-3 text-right whitespace-nowrap"><DeltaValue value={bucket.netCustomers} /></td>
      <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-slate-900 dark:text-white">{bucket.activeCustomers}</td>
    </tr>
    {expanded && (
      <tr>
        <td colSpan={COLUMN_TYPES.length + 4} className="px-4 pb-4 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden overflow-x-auto bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {bucket.events.map((event) => (
                  <EventRow key={event.dedupKey} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    )}
  </>
);

const CustomerTimeline = ({ customerId, events, onBack }) => {
  const sorted = useMemo(() => [...events].sort((a, b) => (a.date > b.date ? 1 : -1)), [events]);
  const name = sorted[sorted.length - 1]?.name || customerId;

  return (
    <GlassCard variant="default" className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Linha do tempo</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{name}</h3>
          <p className="text-slate-400 dark:text-slate-500 text-xs">Cód. {customerId}</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={14} /> Voltar pra visão mensal
        </button>
      </div>
      <div className="space-y-3">
        {sorted.map((event) => (
          <div key={event.dedupKey} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${TYPE_CLASS[event.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
              {TYPE_LABELS[event.type] || event.type}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{event.description || TYPE_LABELS[event.type]}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{formatDateOnly(event.date)}</p>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
              {event.mrr !== null ? formatCurrency(event.mrr) : '—'}
            </span>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Nenhum evento encontrado pra esse cliente.</p>
        )}
      </div>
    </GlassCard>
  );
};

const HistoryView = () => {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState(() => new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getMonthlyHistory();
        setMonths(data || []);
      } catch (error) {
        console.error('Erro ao carregar histórico mensal:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allEvents = useMemo(() => months.flatMap((m) => m.events), [months]);

  const customers = useMemo(() => {
    const byId = new Map();
    allEvents.forEach((e) => byId.set(e.customerId, e.name));
    return Array.from(byId, ([id, name]) => ({ id, name }));
  }, [allEvents]);

  const matchingCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return customers
      .filter((c) => c.name.toLowerCase().includes(term) || String(c.id).toLowerCase().includes(term))
      .slice(0, 8);
  }, [customers, searchTerm]);

  const selectedCustomerEvents = useMemo(
    () => (selectedCustomerId ? allEvents.filter((e) => e.customerId === selectedCustomerId) : []),
    [allEvents, selectedCustomerId]
  );

  const toggleMonth = (month) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const totals = useMemo(() => {
    const totalAssinaturas = months.reduce((a, m) => a + (m.counts.assinatura || 0), 0);
    const totalSaidas = months.reduce((a, m) => a + (m.counts.cancelamento || 0) + (m.counts.nao_renovacao || 0), 0);
    const netMrrAcumulado = months.reduce((a, m) => a + m.netMrr, 0);
    // months vem ordenado do mais recente pro mais antigo — o primeiro item
    // é o total acumulado de clientes ativos ao final do mês mais recente.
    const clientesAtivosAgora = months[0]?.activeCustomers ?? 0;
    return { totalAssinaturas, totalSaidas, netMrrAcumulado, mesesRastreados: months.length, clientesAtivosAgora };
  }, [months]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Histórico</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Assinatura, renovação, upgrade, downgrade, cancelamento e não renovação, consolidados por mês e por cliente.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <SummaryCard
            icon={<Users size={18} />} iconBg="bg-brand-50 dark:bg-brand-500/10" iconColor="text-brand-600 dark:text-brand-400"
            label="Clientes Ativos (acumulado)" value={totals.clientesAtivosAgora}
          />
          <SummaryCard
            icon={<History size={18} />} iconBg="bg-slate-100 dark:bg-slate-800" iconColor="text-slate-600 dark:text-slate-400"
            label="Meses Rastreados" value={totals.mesesRastreados}
          />
          <SummaryCard
            icon={<UserPlus size={18} />} iconBg="bg-emerald-50 dark:bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400"
            label="Assinaturas no Período" value={totals.totalAssinaturas}
          />
          <SummaryCard
            icon={<TrendingUp size={18} />} iconBg="bg-rose-50 dark:bg-rose-500/10" iconColor="text-rose-600 dark:text-rose-400"
            label="Cancel. + Não Renov." value={totals.totalSaidas}
          />
          <SummaryCard
            icon={<DollarSign size={18} />} iconBg="bg-brand-50 dark:bg-brand-500/10" iconColor="text-brand-600 dark:text-brand-400"
            label="Δ MRR Acumulado" value={formatCurrency(totals.netMrrAcumulado)}
          />
        </div>

        <GlassCard variant="subtle" className="p-4 mb-4 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente pra ver a linha do tempo individual..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedCustomerId(null); }}
            />
          </div>
          {matchingCustomers.length > 0 && !selectedCustomerId && (
            <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 overflow-hidden">
              {matchingCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomerId(c.id); setSearchTerm(c.name); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {c.name} <span className="text-slate-400 dark:text-slate-500 text-xs">· Cód. {c.id}</span>
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        {selectedCustomerId ? (
          <CustomerTimeline
            customerId={selectedCustomerId}
            events={selectedCustomerEvents}
            onBack={() => { setSelectedCustomerId(null); setSearchTerm(''); }}
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 mb-10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Mês</th>
                    {COLUMN_TYPES.map((type) => (
                      <th key={type} className="px-3 py-3 font-semibold text-center whitespace-nowrap">{TYPE_LABELS[type]}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-right">Δ MRR</th>
                    <th className="px-4 py-3 font-semibold text-right">Δ Clientes</th>
                    <th className="px-4 py-3 font-semibold text-right" title="Total acumulado de clientes ativos ao final do mês">Clientes Ativos</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((bucket) => (
                    <MonthRow
                      key={bucket.month}
                      bucket={bucket}
                      expanded={expandedMonths.has(bucket.month)}
                      onToggle={() => toggleMonth(bucket.month)}
                    />
                  ))}
                  {months.length === 0 && (
                    <tr>
                      <td colSpan={COLUMN_TYPES.length + 4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                        Nenhum evento de histórico encontrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
