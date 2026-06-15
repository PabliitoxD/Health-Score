import React from 'react';
import StatsCards from './StatsCards';
import { HealthScoreChart, StatusDistributionChart, MRRChart } from './Charts';

const ChartCard = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
    {children}
  </div>
);

const DashboardView = ({ stats, allCustomers, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando dados da base...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <StatsCards stats={stats} />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Row 1: Health Score + Status Distribution */}
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

        {/* Row 2: MRR */}
        <ChartCard title="MRR por Cliente">
          <MRRChart customers={allCustomers} />
        </ChartCard>
      </div>
    </div>
  );
};

export default DashboardView;
