import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getStats } from '../services/api';

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // semana começa na segunda
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
      if (customDateRange.from) {
        const from = new Date(customDateRange.from + 'T00:00:00');
        if (join < from) return false;
      }
      if (customDateRange.to) {
        const to = new Date(customDateRange.to + 'T23:59:59');
        if (join > to) return false;
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

  // Filtered by date only — feeds charts and stats
  const dateFilteredAll = useMemo(
    () => applyDateFilter(allCustomers, dateFilter, customDateRange),
    [allCustomers, dateFilter, customDateRange]
  );

  // Fully filtered — feeds the customer list
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
