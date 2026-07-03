import React from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { getScoreColor } from '../utils/formatters';
import GlassCard from './ui/GlassCard';

const STATUS_LABELS = {
  Healthy: 'Saudável',
  Attention: 'Atenção',
  'At Risk': 'Em Risco',
};

const TREND_ICON = { up: '↑', down: '↓', stable: '→' };
const TREND_COLOR = {
  up: 'text-emerald-500',
  down: 'text-rose-500',
  stable: 'text-slate-400 dark:text-slate-500',
};

const ACCOUNT_STATUS_LABELS = {
  trial: { label: 'Trial', cls: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
  active: { label: 'Ativo', cls: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  cancelled: { label: 'Cancelado', cls: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
};

const CustomerList = ({
  customers, searchTerm, setSearchTerm,
  filterStatus, setFilterStatus,
  selectedCustomer, setSelectedCustomer,
}) => (
  <div className="lg:col-span-2 space-y-4">
    <GlassCard variant="subtle" className="p-4 flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Pesquisar cliente..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <select
        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full md:w-auto"
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
      >
        <option value="All">Todos os Status</option>
        <option value="Healthy">Saudáveis</option>
        <option value="Attention">Atenção</option>
        <option value="At Risk">Em Risco</option>
      </select>
    </GlassCard>

    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-semibold">Cliente</th>
            <th className="px-6 py-4 font-semibold">Conta</th>
            <th className="px-6 py-4 font-semibold">Plano</th>
            <th className="px-6 py-4 font-semibold">Health Score</th>
            <th className="px-6 py-4 font-semibold text-right">Ver</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                selectedCustomer?.id === customer.id ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''
              }`}
              onClick={() => setSelectedCustomer(customer)}
            >
              <td className="px-6 py-4">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{customer.name}</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs">{STATUS_LABELS[customer.status] ?? customer.status}</p>
              </td>
              <td className="px-6 py-4">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACCOUNT_STATUS_LABELS[customer.accountStatus]?.cls ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  {ACCOUNT_STATUS_LABELS[customer.accountStatus]?.label ?? customer.accountStatus}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-medium">
                  {customer.tier}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm ${getScoreColor(customer.score)}`}>
                    {customer.score}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          customer.score >= 75 ? 'bg-emerald-500' : customer.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${customer.score}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${TREND_COLOR[customer.trend]}`}>
                      {TREND_ICON[customer.trend]} {customer.trend === 'up' ? 'Subindo' : customer.trend === 'down' ? 'Caindo' : 'Estável'}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-slate-400 hover:text-brand-600 transition-colors">
                  <ArrowUpRight size={18} />
                </button>
              </td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan="5" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                Nenhum cliente encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default CustomerList;
