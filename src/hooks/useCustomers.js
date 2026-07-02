import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getStats, getCancellations } from '../services/api';
import { computeRevenueRetention, computeLogoChurn } from '../utils/kpis';

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const applyDateFilter = (items, dateFilter, customDateRange, dateField = 'joinDate') => {
  if (dateFilter === 'all') return items;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateFilter === 'today') {
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      return d.getTime() === today.getTime();
    });
  }
  if (dateFilter === 'week') {
    const weekStart = startOfWeek(today);
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      return d >= weekStart && d <= today;
    });
  }
  if (dateFilter === 'month') {
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      return d.getFullYear() === today.getFullYear() &&
             d.getMonth() === today.getMonth();
    });
  }
  if (dateFilter === 'custom') {
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      if (customDateRange.from && d < new Date(customDateRange.from + 'T00:00:00')) return false;
      if (customDateRange.to && d > new Date(customDateRange.to + 'T23:59:59')) return false;
      return true;
    });
  }
  return items;
};

const computeStats = (customers, cancellationsInPeriod, globalStats) => {
  const count = customers.length;
  const totalMRR = customers.reduce((acc, c) => acc + c.mrr, 0);
  const avgScore = count ? Math.round(customers.reduce((acc, c) => acc + c.score, 0) / count) : 0;
  const atRisk = customers.filter((c) => c.status === 'At Risk').length;
  const healthy = customers.filter((c) => c.status === 'Healthy').length;
  const arpu = count ? totalMRR / count : 0;
  const multiAcquirerCount = customers.filter((c) => c.multiAcquirer).length;

  const logoChurnRate = computeLogoChurn(count, cancellationsInPeriod.length);
  const { nrr, grr, expansionMrr, contractionMrr, churnedMrr } = computeRevenueRetention(customers, cancellationsInPeriod);

  return {
    ...globalStats,
    avgScore, atRisk, healthy,
    totalMRR, arr: totalMRR * 12, arpu,
    activeCount: count,
    multiAcquirerRate: count ? (multiAcquirerCount / count) * 100 : 0,
    logoChurnRate,
    cancelledCount: cancellationsInPeriod.length,
    nrr, grr, expansionMrr, contractionMrr, churnedMrr,
  };
};

export const useCustomers = () => {
  const [allCustomers, setAllCustomers] = useState([]);
  const [allCancellations, setAllCancellations] = useState([]);
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
        const [customersData, statsData, cancellationsData] = await Promise.all([
          getCustomers(),
          getStats(),
          getCancellations(),
        ]);
        setAllCustomers(customersData);
        setGlobalStats(statsData || {});
        setAllCancellations(cancellationsData || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const dateFilteredAll = useMemo(
    () => applyDateFilter(allCustomers, dateFilter, customDateRange, 'joinDate'),
    [allCustomers, dateFilter, customDateRange]
  );

  const dateFilteredCancellations = useMemo(
    () => applyDateFilter(allCancellations, dateFilter, customDateRange, 'cancelDate'),
    [allCancellations, dateFilter, customDateRange]
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
    () => computeStats(dateFilteredAll, dateFilteredCancellations, globalStats),
    [dateFilteredAll, dateFilteredCancellations, globalStats]
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
