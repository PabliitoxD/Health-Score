import React from 'react';
import { useCustomers } from './hooks/useCustomers';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import CustomerList from './components/CustomerList';
import CustomerDetails from './components/CustomerDetails';

const App = () => {
  const {
    customers,
    stats,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedCustomer,
    setSelectedCustomer,
    loading
  } = useCustomers();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <Header />
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500 font-medium animate-pulse">Carregando dados da base...</p>
        </div>
      ) : (
        <>
          <StatsCards stats={stats} />
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <CustomerList 
              customers={customers} 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              filterStatus={filterStatus} 
              setFilterStatus={setFilterStatus} 
              selectedCustomer={selectedCustomer} 
              setSelectedCustomer={setSelectedCustomer} 
            />
            <CustomerDetails selectedCustomer={selectedCustomer} />
          </div>
        </>
      )}
    </div>
  );
};

export default App;
