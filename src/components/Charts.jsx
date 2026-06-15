import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatters';

const STATUS_COLORS = {
  Healthy: '#10b981',
  Attention: '#f59e0b',
  'At Risk': '#f43f5e',
};

const STATUS_LABELS = {
  Healthy: 'Saudável',
  Attention: 'Atenção',
  'At Risk': 'Em Risco',
};

const scoreColor = (score) => {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#f43f5e';
};

const CustomTooltipScore = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-900 dark:text-white">{d.name}</p>
      <p className="text-slate-500 dark:text-slate-400">Score: <span className="font-bold text-slate-900 dark:text-white">{d.score}</span></p>
    </div>
  );
};

const CustomTooltipMRR = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-900 dark:text-white">{d.name}</p>
      <p className="text-slate-500 dark:text-slate-400">MRR: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(d.mrr)}</span></p>
    </div>
  );
};

export const HealthScoreChart = ({ customers }) => {
  const { isDark } = useTheme();
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  const data = customers.map((c) => ({
    name: c.name.split(' ').slice(0, 2).join(' '),
    score: c.score,
    status: c.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={gridColor} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltipScore />} cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }} />
        <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={scoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const StatusDistributionChart = ({ customers }) => {
  const counts = customers.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts).map(([status, value]) => ({
    name: STATUS_LABELS[status] ?? status,
    value,
    status,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-slate-500 dark:text-slate-400">{value}</span>}
        />
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{
            background: 'var(--tooltip-bg, #fff)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const MRRChart = ({ customers }) => {
  const { isDark } = useTheme();
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  const data = [...customers]
    .sort((a, b) => b.mrr - a.mrr)
    .map((c) => ({
      name: c.name.split(' ').slice(0, 2).join(' '),
      mrr: c.mrr,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
        <Tooltip content={<CustomTooltipMRR />} cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }} />
        <Bar dataKey="mrr" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
};
