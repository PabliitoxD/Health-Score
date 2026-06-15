import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getStats } from '../services/api';

const applyDateFilter = (customers, dateFilter, customDateRange) => {
  if (dateFilter === 'all') return customers;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateFilter === 'today') {
    return customers.filter((c) => c.lastLoginDays === 0);
  }
  if (dateFilter === 'week') {
    return customers.filter((c) => c.lastLoginDays <= 7);
  }
  if (dateFilter === 'month') {
    return customers.filter((c) => c.lastLoginDays <= 30);
  }
  if (dateFilter === 'custom') {
    return customers.filter((c) => {
      const loginDate = new Date(today);
      loginDate.setDate(loginDate.getDate() - c.lastLoginDays);
      if (customDateRange.from) {
        const from = new Date(customDateRange.from + 'T00:00:00');
        if (loginDate < from) return false;
      }
      if (customDateRange.to) {
        const to = new Date(customDateRange.to + 'T23:59:59');
        if (loginDate > to) return false;
      }
      return true;
    });
  }
  return customers;
};

export const useCustomers = () => {
  const [allCustomers, setAllCustomers] = useState([]);
  const [stats, setStats] = useState({ avgScore: 0, atRisk: 0, healthy: 0, totalMRR: 0 });
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
        setStats(statsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Date-filtered set — used for charts (no search/status applied)
  const dateFilteredAll = useMemo(
    () => applyDateFilter(allCustomers, dateFilter, customDateRange),
    [allCustomers, dateFilter, customDateRange]
  );

  // Fully filtered set — used for the customer list
  const customers = useMemo(
    () =>
      dateFilteredAll.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
      }),
    [dateFilteredAll, searchTerm, filterStatus]
  );

  return {
    customers,
    allCustomers: dateFilteredAll,
    stats,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    selectedCustomer,
    setSelectedCustomer,
    loading,
  };
};
