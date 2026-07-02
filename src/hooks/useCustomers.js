import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getStats, getCancellations } from '../services/api';
import { computeRevenueRetention, computeLogoChurn } from '../utils/kpis';
import { applyDateFilter } from '../utils/dateFilter';

const computeStats = (customers, retainedCustomers, cancellationsInPeriod, globalStats) => {
  const count = customers.length;
  const totalMRR = customers.reduce((acc, c) => acc + c.mrr, 0);
  const avgScore = count ? Math.round(customers.reduce((acc, c) => acc + c.score, 0) / count) : 0;
  const atRisk = customers.filter((c) => c.status === 'At Risk').length;
  const healthy = customers.filter((c) => c.status === 'Healthy').length;
  const arpu = count ? totalMRR / count : 0;
  const multiAcquirerCount = customers.filter((c) => c.multiAcquirer).length;

  const logoChurnRate = computeLogoChurn(count, cancellationsInPeriod.length);
  const newCustomers = customers.filter((c) => c.previousMrr === null || c.previousMrr === undefined);
  const { nrr, grr, expansionMrr, contractionMrr, churnedMrr } = computeRevenueRetention(newCustomers, retainedCustomers, cancellationsInPeriod);

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

  // Clientes existentes (com previousMrr) filtrados pela data da última cobrança —
  // é quando a renovação de fato aconteceu, joinDate não serve pra esse grupo.
  const dateFilteredRetained = useMemo(
    () => applyDateFilter(
      allCustomers.filter((c) => c.previousMrr !== null && c.previousMrr !== undefined),
      dateFilter, customDateRange, 'lastChargeDate'
    ),
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
    () => computeStats(dateFilteredAll, dateFilteredRetained, dateFilteredCancellations, globalStats),
    [dateFilteredAll, dateFilteredRetained, dateFilteredCancellations, globalStats]
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
