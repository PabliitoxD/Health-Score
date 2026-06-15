import React from 'react';
import CustomerList from './CustomerList';
import CustomerDetails from './CustomerDetails';

const CustomersView = ({
  customers,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  selectedCustomer,
  setSelectedCustomer,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando clientes...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
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
    </div>
  );
};

export default CustomersView;
