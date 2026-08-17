import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useCustomers } from './hooks/useCustomers';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import CustomersView from './components/CustomersView';
import SurveysView from './components/SurveysView';
import SurveyResponsePage from './components/SurveyResponsePage';
import CompanyView from './components/CompanyView';
import CancellationsView from './components/CancellationsView';
import HistoryView from './components/HistoryView';

const isSurveyRoute = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has('survey') && params.has('token');
};

const App = () => {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const customerData = useCustomers(isAuthenticated);

  if (isSurveyRoute()) return <SurveyResponsePage />;
  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <Header activeView={activeView} setActiveView={setActiveView} />

      {activeView === 'dashboard' && (
        <DashboardView
          stats={customerData.stats}
          allCustomers={customerData.allCustomers}
          chartCustomers={customerData.chartCustomers}
          loading={customerData.loading}
          dateFilter={customerData.dateFilter}
          setDateFilter={customerData.setDateFilter}
          customDateRange={customerData.customDateRange}
          setCustomDateRange={customerData.setCustomDateRange}
        />
      )}
      {activeView === 'customers' && (
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
      {activeView === 'cancellations' && <CancellationsView />}
      {activeView === 'history' && <HistoryView />}
      {activeView === 'surveys' && (
        <SurveysView customers={customerData.baseCustomers} />
      )}
      {activeView === 'company' && <CompanyView />}
    </div>
  );
};

export default App;
