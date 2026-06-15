import { calculateHealthScore } from '../utils/healthScore';

const rawCustomers = [
  {
    id: 1,
    name: "Infoprodutos Alpha",
    tier: "Liderança",
    mrr: 2490,
    lastLoginDays: 0,
    joinDate: "2024-01-15",
    approvalRate: 92,
    volumeUsage: 95,
    multiAcquirer: true,
    nps: 85,
    csat: 95,
    trend: "up",
  },
  {
    id: 2,
    name: "E-commerce Tech",
    tier: "Autoridade",
    mrr: 1290,
    lastLoginDays: 12,
    joinDate: "2024-03-20",
    approvalRate: 58,
    volumeUsage: 15,
    multiAcquirer: false,
    nps: -20,
    csat: 55,
    trend: "down",
  },
  {
    id: 3,
    name: "Agência Digital VIP",
    tier: "Eficiência",
    mrr: 890,
    lastLoginDays: 2,
    joinDate: "2024-05-10",
    approvalRate: 84,
    volumeUsage: 65,
    multiAcquirer: true,
    nps: 40,
    csat: 80,
    trend: "stable",
  },
  {
    id: 4,
    name: "Curso do Sucesso",
    tier: "Profissional",
    mrr: 490,
    lastLoginDays: 1,
    joinDate: "2024-07-01",
    approvalRate: 89,
    volumeUsage: 82,
    multiAcquirer: true,
    nps: 70,
    csat: 90,
    trend: "up",
  },
  {
    id: 5,
    name: "Moda Online",
    tier: "Autonomia",
    mrr: 290,
    lastLoginDays: 15,
    joinDate: "2024-09-12",
    approvalRate: 45,
    volumeUsage: 8,
    multiAcquirer: false,
    nps: -40,
    csat: 40,
    trend: "down",
  },
  {
    id: 6,
    name: "SaaS Enterprise",
    tier: "Liderança",
    mrr: 2490,
    lastLoginDays: 0,
    joinDate: "2023-11-05",
    approvalRate: 82,
    volumeUsage: 110,
    multiAcquirer: true,
    nps: 20,
    csat: 75,
    trend: "down",
  },
];

// Dados globais do negócio para cálculo de KPIs financeiros
const businessData = {
  mrr: {
    initial: 14200,   // MRR no início do mês
    expansion: 1800,  // MRR ganho via upgrades
    contraction: 400, // MRR perdido via downgrades
    churned: 600,     // MRR perdido via cancelamentos
  },
  logoChurn: {
    canceledThisMonth: 1,
    activeAtStartOfMonth: 18,
  },
  cac: {
    marketingSpend: 8500,
    newCustomers: 3,
  },
};

const enrichCustomer = (customer) => ({
  ...customer,
  ...calculateHealthScore(customer),
});

export const getCustomers = async () =>
  new Promise((resolve) => {
    setTimeout(() => resolve(rawCustomers.map(enrichCustomer)), 500);
  });

export const getStats = async () =>
  new Promise((resolve) => {
    setTimeout(() => {
      const enriched = rawCustomers.map(enrichCustomer);
      const activeCount = enriched.length;

      const totalMRR = enriched.reduce((acc, c) => acc + c.mrr, 0);
      const arr = totalMRR * 12;
      const avgScore = Math.round(enriched.reduce((acc, c) => acc + c.score, 0) / activeCount);
      const atRisk = enriched.filter((c) => c.status === 'At Risk').length;
      const healthy = enriched.filter((c) => c.status === 'Healthy').length;

      const arpu = totalMRR / activeCount;
      const logoChurnRate =
        (businessData.logoChurn.canceledThisMonth / businessData.logoChurn.activeAtStartOfMonth) * 100;
      const ltv = arpu / (logoChurnRate / 100);
      const cac = businessData.cac.marketingSpend / businessData.cac.newCustomers;

      const { initial, expansion, contraction, churned } = businessData.mrr;
      const nrr = ((initial + expansion - contraction - churned) / initial) * 100;
      const grossRevenueChurn = ((contraction + churned) / initial) * 100;

      // NPS: média ponderada dos promotores vs detratores
      const promoters = enriched.filter((c) => c.nps >= 70).length;
      const detractors = enriched.filter((c) => c.nps < 0).length;
      const avgNps = Math.round(((promoters - detractors) / activeCount) * 100);

      const avgCsat = Math.round(enriched.reduce((acc, c) => acc + c.csat, 0) / activeCount);

      resolve({
        avgScore,
        atRisk,
        healthy,
        totalMRR,
        arr,
        arpu,
        ltv,
        cac,
        ltvCacRatio: ltv / cac,
        nrr,
        logoChurnRate,
        grossRevenueChurn,
        avgNps,
        avgCsat,
      });
    }, 500);
  });
