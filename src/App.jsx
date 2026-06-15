import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useCustomers } from './hooks/useCustomers';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import DashboardView from './components/DashboardView';
import CustomersView from './components/CustomersView';

const App = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const customerData = useCustomers();

  if (!isAuthenticated) return <LoginPage />;

  const filterProps = {
    dateFilter: customerData.dateFilter,
    setDateFilter: customerData.setDateFilter,
    customDateRange: customerData.customDateRange,
    setCustomDateRange: customerData.setCustomDateRange,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <Header activeView={activeView} setActiveView={setActiveView} />
      <FilterBar {...filterProps} />

      {activeView === 'dashboard' ? (
        <DashboardView
          stats={customerData.stats}
          allCustomers={customerData.allCustomers}
          loading={customerData.loading}
        />
      ) : (
        <CustomersView
          customers={customerData.customers}
          searchTerm={customerData.searchTerm}
          setSearchTerm={customerData.setSearchTerm}
          filterStatus={customerData.filterStatus}
          setFilterStatus={customerData.setFilterStatus}
          selectedCustomer={customerData.selectedCustomer}
          setSelectedCustomer={customerData.setSelectedCustomer}
          loading={customerData.loading}
        />
      )}
    </div>
  );
};

export default App;
