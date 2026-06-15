import React from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { getScoreColor } from '../utils/formatters';

const STATUS_LABELS = {
  Healthy: 'Saudável',
  Attention: 'Atenção',
  'At Risk': 'Em Risco',
};

const TREND_ICON = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const TREND_COLOR = {
  up: 'text-emerald-500',
  down: 'text-rose-500',
  stable: 'text-slate-400',
};

const CustomerList = ({
  customers,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  selectedCustomer,
  setSelectedCustomer,
}) => (
  <div className="lg:col-span-2 space-y-4">
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Pesquisar cliente..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <select
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">Todos os Status</option>
          <option value="Healthy">Saudáveis</option>
          <option value="Attention">Atenção</option>
          <option value="At Risk">Em Risco</option>
        </select>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-semibold">Cliente</th>
            <th className="px-6 py-4 font-semibold">Plano</th>
            <th className="px-6 py-4 font-semibold">Health Score</th>
            <th className="px-6 py-4 font-semibold text-right">Ver</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                selectedCustomer?.id === customer.id ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => setSelectedCustomer(customer)}
            >
              <td className="px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{customer.name}</p>
                  <p className="text-slate-400 text-xs">{STATUS_LABELS[customer.status] ?? customer.status}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded font-medium">
                  {customer.tier}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm ${getScoreColor(customer.score)}`}>
                    {customer.score}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
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
                <button className="text-slate-400 hover:text-blue-600 transition-colors">
                  <ArrowUpRight size={18} />
                </button>
              </td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan="4" className="px-6 py-8 text-center text-slate-400 text-sm">
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
