import React from 'react';
import StatsCards from './StatsCards';
import FilterBar from './FilterBar';
import { HealthScoreChart, StatusDistributionChart, MRRChart } from './Charts';

const ChartCard = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
    {children}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-600">
    <p className="text-sm font-medium">Nenhum cliente neste período</p>
    <p className="text-xs mt-1">Tente outro filtro ou selecione "Todos"</p>
  </div>
);

const DashboardView = ({ stats, allCustomers, loading, dateFilter, setDateFilter, customDateRange, setCustomDateRange }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando dados da base...</p>
      </div>
    );
  }

  const hasData = allCustomers.length > 0;

  return (
    <div className="p-4 md:p-8">
      <FilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customDateRange={customDateRange}
        setCustomDateRange={setCustomDateRange}
      />

      <StatsCards stats={stats} />

      {hasData ? (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Health Score por Cliente">
                <HealthScoreChart customers={allCustomers} />
              </ChartCard>
            </div>
            <div className="lg:col-span-1">
              <ChartCard title="Distribuição de Status">
                <StatusDistributionChart customers={allCustomers} />
              </ChartCard>
            </div>
          </div>
          <ChartCard title="MRR por Cliente">
            <MRRChart customers={allCustomers} />
          </ChartCard>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
