import React from 'react';

const Header = () => {
  return (
    <div className="max-w-7xl mx-auto mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard de Health Score Bravvius</h1>
          <p className="text-slate-500 text-sm">Monitorização em tempo real da saúde da base de clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            Exportar Relatório
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
            Novo Alerta
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
