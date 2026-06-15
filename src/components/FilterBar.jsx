import React from 'react';
import { Calendar, X } from 'lucide-react';

const FILTERS = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mês' },
  { id: 'custom', label: 'Personalizado', icon: Calendar },
];

const FilterBar = ({ dateFilter, setDateFilter, customDateRange, setCustomDateRange }) => {
  const handleClick = (id) => setDateFilter((prev) => (prev === id ? 'all' : id));
  const clear = () => { setDateFilter('all'); setCustomDateRange({ from: '', to: '' }); };

  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-md px-4 py-3">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pr-1">
          Período
        </span>

        {FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateFilter === id
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {Icon && <Icon size={11} />}
            {label}
          </button>
        ))}

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700 ml-1">
            <input
              type="date"
              value={customDateRange.from}
              max={customDateRange.to || undefined}
              onChange={(e) => setCustomDateRange((p) => ({ ...p, from: e.target.value }))}
              className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="text-slate-400 text-xs">até</span>
            <input
              type="date"
              value={customDateRange.to}
              min={customDateRange.from || undefined}
              onChange={(e) => setCustomDateRange((p) => ({ ...p, to: e.target.value }))}
              className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        {dateFilter !== 'all' && (
          <button
            onClick={clear}
            title="Limpar filtro"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors ml-1"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
