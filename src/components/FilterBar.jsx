import React from 'react';
import { Calendar } from 'lucide-react';

const FILTERS = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mês' },
  { id: 'custom', label: 'Personalizado', icon: Calendar },
];

const FilterBar = ({ dateFilter, setDateFilter, customDateRange, setCustomDateRange }) => {
  const handleFilterClick = (id) => {
    setDateFilter((prev) => (prev === id ? 'all' : id));
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 md:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Período
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleFilterClick(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                dateFilter === id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {Icon && <Icon size={12} />}
              {label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDateRange.from}
              max={customDateRange.to || undefined}
              onChange={(e) => setCustomDateRange((p) => ({ ...p, from: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="text-slate-400 text-xs font-medium">até</span>
            <input
              type="date"
              value={customDateRange.to}
              min={customDateRange.from || undefined}
              onChange={(e) => setCustomDateRange((p) => ({ ...p, to: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        {dateFilter !== 'all' && (
          <button
            onClick={() => { setDateFilter('all'); setCustomDateRange({ from: '', to: '' }); }}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2 ml-1 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
