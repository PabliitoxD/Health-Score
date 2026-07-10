import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getStats, getCancellations } from '../services/api';
import { computeRevenueRetention, computeLogoChurn } from '../utils/kpis';
import { applyDateFilter, applyAsOfFilter } from '../utils/dateFilter';

// customers aqui já deve vir filtrado pra accountStatus === 'active' — trial
// é contagem à parte (trialCount) e cancelado não entra nas métricas de MRR/saúde.
const computeStats = (customers, retainedCustomers, cancellationsInPeriod, trialCount, globalStats) => {
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
    trialCount,
    multiAcquirerRate: count ? (multiAcquirerCount / count) * 100 : 0,
    logoChurnRate,
    cancelledCount: cancellationsInPeriod.length,
    nrr, grr, expansionMrr, contractionMrr, churnedMrr,
  };
};

// isAuthenticated: o hook é chamado incondicionalmente no topo de App.jsx
// (antes do gate de login, pra não violar a regra de hooks), então o efeito
// de carga inicial só pode disparar DEPOIS que o login termina — as rotas
// /api/* agora exigem Basic Auth (ver server/middleware/requireAuth.js) e a
// chamada dispararia 401 se rodasse no mount, antes de sessionStorage ter o
// header de autenticação.
export const useCustomers = (isAuthenticated) => {
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
    if (!isAuthenticated) return;

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
  }, [isAuthenticated]);

  // "Ativo até o fim do período" (applyAsOfFilter), não "entrou dentro do
  // período" — um cliente antigo continua contando em "Este Mês" mesmo tendo
  // assinado há mais tempo. Decisão tomada com o Pablo em 2026-07-08: o
  // filtro de período é um retrato de quem estava ativo naquele momento, não
  // um corte de coorte de novos clientes.
  const dateFilteredAll = useMemo(
    () => applyAsOfFilter(allCustomers, dateFilter, customDateRange, 'joinDate'),
    [allCustomers, dateFilter, customDateRange]
  );

  // Base de "clientes ativos" pras métricas do Dashboard (MRR, saúde, NRR/GRR):
  // plano pago e não cancelado. Trial é contagem à parte (dateFilteredTrial).
  const dateFilteredActive = useMemo(
    () => dateFilteredAll.filter((c) => c.accountStatus === 'active'),
    [dateFilteredAll]
  );

  const dateFilteredTrial = useMemo(
    () => dateFilteredAll.filter((c) => c.accountStatus === 'trial'),
    [dateFilteredAll]
  );

  // Gráficos do Dashboard: só clientes ativos (plano pago, sem cancelamento
  // efetivado) — mesma base usada pro MRR Total.
  const chartCustomers = useMemo(
    () => dateFilteredAll.filter((c) => c.accountStatus === 'active'),
    [dateFilteredAll]
  );

  // Clientes existentes (com previousMrr) filtrados pela data da última cobrança —
  // é quando a renovação de fato aconteceu, joinDate não serve pra esse grupo.
  const dateFilteredRetained = useMemo(
    () => applyDateFilter(
      allCustomers.filter((c) => c.accountStatus === 'active' && c.previousMrr !== null && c.previousMrr !== undefined),
      dateFilter, customDateRange, 'lastChargeDate'
    ),
    [allCustomers, dateFilter, customDateRange]
  );

  const dateFilteredCancellations = useMemo(
    () => applyDateFilter(allCancellations, dateFilter, customDateRange, 'cancelDate'),
    [allCancellations, dateFilter, customDateRange]
  );

  // Clientes: só trial, ativo ou cancelado — "lead" nunca teve pagamento de
  // verdade (trial que não converteu, cadastro ainda sem 1ª cobrança), conta
  // só pro número de cadastros da Empresa, não aparece aqui.
  const customers = useMemo(
    () =>
      dateFilteredAll.filter((c) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = c.name.toLowerCase().includes(term) || (c.id || '').toLowerCase().includes(term);
        const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
        return c.accountStatus !== 'lead' && matchesSearch && matchesStatus;
      }),
    [dateFilteredAll, searchTerm, filterStatus]
  );

  const stats = useMemo(
    () => computeStats(dateFilteredActive, dateFilteredRetained, dateFilteredCancellations, dateFilteredTrial.length, globalStats),
    [dateFilteredActive, dateFilteredRetained, dateFilteredCancellations, dateFilteredTrial, globalStats]
  );

  return {
    customers,
    allCustomers: dateFilteredAll,
    chartCustomers,
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
