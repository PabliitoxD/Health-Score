import React, { useState, useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Zap,
  CreditCard,
  MessageSquare
} from 'lucide-react';

// Dados mockados baseados no framework da Bravvius
const initialCustomers = [
  { id: 1, name: "Infoprodutos Alpha", tier: "Liderança", score: 92, status: "Healthy", trend: "up", volume: "95%", approval: "92%", multiAcquirer: true, lastLogin: "Hoje" },
  { id: 2, name: "E-commerce Tech", tier: "Autoridade", score: 42, status: "At Risk", trend: "down", volume: "15%", approval: "58%", multiAcquirer: false, lastLogin: "Há 12 dias" },
  { id: 3, name: "Agência Digital VIP", tier: "Eficiência", score: 74, status: "Attention", trend: "stable", volume: "65%", approval: "84%", multiAcquirer: true, lastLogin: "Há 2 dias" },
  { id: 4, name: "Curso do Sucesso", tier: "Profissional", score: 88, status: "Healthy", trend: "up", volume: "82%", approval: "89%", multiAcquirer: true, lastLogin: "Ontem" },
  { id: 5, name: "Moda Online", tier: "Autonomia", score: 35, status: "At Risk", trend: "down", volume: "8%", approval: "45%", multiAcquirer: false, lastLogin: "Há 15 dias" },
  { id: 6, name: "SaaS Enterprise", tier: "Liderança", score: 61, status: "Attention", trend: "down", volume: "110%", approval: "82%", multiAcquirer: true, lastLogin: "Hoje" },
];

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filtros de lógica
  const filteredCustomers = useMemo(() => {
    return initialCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "All" || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, filterStatus]);

  const stats = {
    avgScore: Math.round(initialCustomers.reduce((acc, curr) => acc + curr.score, 0) / initialCustomers.length),
    atRisk: initialCustomers.filter(c => c.status === "At Risk").length,
    healthy: initialCustomers.filter(c => c.status === "Healthy").length,
    totalMRR: "R$ 67.465,47"
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (score >= 50) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-rose-500 bg-rose-50 border-rose-100';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Healthy': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Saudável</span>;
      case 'Attention': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Atenção</span>;
      case 'At Risk': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Risco</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {/* Header */}
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
      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Activity size={20} /></div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1"><ArrowUpRight size={14}/> +2%</span>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Média de Saúde</p>
          <h3 className="text-2xl font-bold">{stats.avgScore} / 100</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><AlertTriangle size={20} /></div>
            <span className="text-rose-500 text-xs font-bold flex items-center gap-1"><ArrowUpRight size={14}/> +1</span>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Clientes em Risco</p>
          <h3 className="text-2xl font-bold">{stats.atRisk}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 size={20} /></div>
            <span className="text-slate-400 text-xs font-bold flex items-center gap-1">Estável</span>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">Clientes Saudáveis</p>
          <h3 className="text-2xl font-bold">{stats.healthy}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><TrendingUp size={20} /></div>
            <span className="text-emerald-500 text-xs font-bold flex items-center gap-1"><ArrowUpRight size={14}/> +R$ 4k</span>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">MRR sob Gestão</p>
          <h3 className="text-2xl font-bold">{stats.totalMRR}</h3>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar cliente ou operação..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">Todos os Status</option>
                <option value="Healthy">Saudáveis</option>
                <option value="Attention">Atenção</option>
                <option value="At Risk">Em Risco</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Plano</th>
                  <th className="px-6 py-4 font-semibold">Health Score</th>
                  <th className="px-6 py-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCustomers.map(customer => (
                  <tr 
                    key={customer.id} 
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedCustomer?.id === customer.id ? 'bg-blue-50/50' : ''}`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{customer.name}</p>
                        <p className="text-slate-400 text-xs">{customer.status}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded font-medium">{customer.tier}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm ${getScoreColor(customer.score)}`}>
                          {customer.score}
                        </div>
                        <div className="flex-1 max-w-[100px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${customer.score >= 80 ? 'bg-emerald-500' : customer.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${customer.score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-blue-600 transition-colors">
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-4">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold">Detalhes da Saúde</h2>
                  {getStatusBadge(selectedCustomer.status)}
                </div>
                <h3 className="text-xl font-bold mb-1">{selectedCustomer.name}</h3>
                <p className="text-slate-500 text-xs mb-4">Cliente desde Julho 2025 • Plano {selectedCustomer.tier}</p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-white border border-slate-200 py-2 rounded-lg text-xs font-semibold hover:bg-slate-100">
                    Histórico
                  </button>
                  <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold shadow-md shadow-blue-100 hover:bg-blue-700">
                    Agendar Call
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Framework Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Composição do Score</h4>
                  <div className="space-y-4">
                    {/* Item 1 */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="flex items-center gap-1"><MessageSquare size={14} className="text-blue-500"/> Engajamento (15%)</span>
                        <span className={selectedCustomer.score > 50 ? 'text-emerald-600' : 'text-rose-600'}>
                          {selectedCustomer.lastLogin === "Hoje" ? 'Excelente' : 'Baixo'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: selectedCustomer.lastLogin === "Hoje" ? '90%' : '20%' }} />
                      </div>
                    </div>
                    {/* Item 2 */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="flex items-center gap-1"><Zap size={14} className="text-amber-500"/> Performance (65%)</span>
                        <span className="text-slate-600">{selectedCustomer.approval} Aprovação</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: selectedCustomer.approval }} />
                      </div>
                    </div>
                    {/* Item 3 */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="flex items-center gap-1"><CreditCard size={14} className="text-indigo-500"/> Adoção Técnica (20%)</span>
                        <span className="text-slate-600">{selectedCustomer.multiAcquirer ? 'Multi-adquirente OK' : 'Mono-adquirente'}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: selectedCustomer.multiAcquirer ? '100%' : '30%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Informações de Uso</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Vol. Plano</p>
                      <p className="text-sm font-bold">{selectedCustomer.volume}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Último Login</p>
                      <p className="text-sm font-bold">{selectedCustomer.lastLogin}</p>
                    </div>
                  </div>
                </div>

                {selectedCustomer.status === "At Risk" && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-rose-500 flex-shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-bold text-rose-800 mb-1">Protocolo de Churn Ativado</p>
                      <p className="text-[11px] text-rose-600 leading-tight">O cliente não loga há mais de 10 dias e a taxa de aprovação está crítica.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Users size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Selecione um cliente para ver o detalhamento da saúde.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
