import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getStats } from '../services/api';

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const applyDateFilter = (customers, dateFilter, customDateRange) => {
  if (dateFilter === 'all') return customers;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateFilter === 'today') {
    return customers.filter((c) => {
      const join = new Date(c.joinDate + 'T00:00:00');
      return join.getTime() === today.getTime();
    });
  }
  if (dateFilter === 'week') {
    const weekStart = startOfWeek(today);
    return customers.filter((c) => {
      const join = new Date(c.joinDate + 'T00:00:00');
      return join >= weekStart && join <= today;
    });
  }
  if (dateFilter === 'month') {
    return customers.filter((c) => {
      const join = new Date(c.joinDate + 'T00:00:00');
      return join.getFullYear() === today.getFullYear() &&
             join.getMonth() === today.getMonth();
    });
  }
  if (dateFilter === 'custom') {
    return customers.filter((c) => {
      const join = new Date(c.joinDate + 'T00:00:00');
      if (customDateRange.from && join < new Date(customDateRange.from + 'T00:00:00')) return false;
      if (customDateRange.to && join > new Date(customDateRange.to + 'T23:59:59')) return false;
      return true;
    });
  }
  return customers;
};

const computeStats = (customers, globalStats) => {
  const count = customers.length;
  if (count === 0) {
    return {
      ...globalStats,
      avgScore: 0, atRisk: 0, healthy: 0,
      totalMRR: 0, arr: 0, arpu: 0, avgNps: 0, avgCsat: 0,
    };
  }
  const totalMRR = customers.reduce((acc, c) => acc + c.mrr, 0);
  const avgScore = Math.round(customers.reduce((acc, c) => acc + c.score, 0) / count);
  const atRisk = customers.filter((c) => c.status === 'At Risk').length;
  const healthy = customers.filter((c) => c.status === 'Healthy').length;
  const arpu = totalMRR / count;
  const promoters = customers.filter((c) => c.nps >= 70).length;
  const detractors = customers.filter((c) => c.nps < 0).length;
  const avgNps = Math.round(((promoters - detractors) / count) * 100);
  const avgCsat = Math.round(customers.reduce((acc, c) => acc + c.csat, 0) / count);

  return {
    ...globalStats, // NRR, LTV, CAC, Logo Churn — métricas de portfolio, não mudam com o filtro
    avgScore, atRisk, healthy,
    totalMRR, arr: totalMRR * 12, arpu,
    avgNps, avgCsat,
  };
};

export const useCustomers = () => {
  const [allCustomers, setAllCustomers] = useState([]);
  const [globalStats, setGlobalStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [customersData, statsData] = await Promise.all([
          getCustomers(),
          getStats(),
        ]);
        setAllCustomers(customersData);
        setGlobalStats(statsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const dateFilteredAll = useMemo(
    () => applyDateFilter(allCustomers, dateFilter, customDateRange),
    [allCustomers, dateFilter, customDateRange]
  );

  const customers = useMemo(
    () =>
      dateFilteredAll.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
      }),
    [dateFilteredAll, searchTerm, filterStatus]
  );

  const stats = useMemo(
    () => computeStats(dateFilteredAll, globalStats),
    [dateFilteredAll, globalStats]
  );

  return {
    customers,
    allCustomers: dateFilteredAll,
    baseCustomers: allCustomers,
    stats,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    dateFilter, setDateFilter,
    customDateRange, setCustomDateRange,
    selectedCustomer, setSelectedCustomer,
    loading,
  };
};
