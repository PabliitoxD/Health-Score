import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getStats } from '../services/api';

export const useCustomers = () => {
  const [allCustomers, setAllCustomers] = useState([]);
  const [stats, setStats] = useState({ avgScore: 0, atRisk: 0, healthy: 0, totalMRR: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
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

  const customers = useMemo(
    () =>
      allCustomers.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
      }),
    [allCustomers, searchTerm, filterStatus]
  );

  return {
    customers,
    allCustomers,
    stats,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedCustomer,
    setSelectedCustomer,
    loading,
  };
};
