import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getCustomerHistory } from '../services/api';
import { formatCurrency, formatDateOnly } from '../utils/formatters';
import { TYPE_LABELS, TYPE_CLASS } from './HistoryView';

const CustomerHistoryModal = ({ customerId, customerName, onClose }) => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCustomerHistory(customerId);
        if (!cancelled) setEvents(data.events || []);
      } catch (error) {
        console.error('Erro ao carregar histórico do cliente:', error);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [customerId]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Histórico</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">{customerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {loading && <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6 animate-pulse">Carregando histórico...</p>}
          {!loading && events?.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
              Nenhum evento encontrado ainda — a API só guarda o histórico do ciclo de assinatura atual, e ele vai crescendo a cada sincronização.
            </p>
          )}
          {!loading && events?.map((event) => (
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
        </div>
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
