import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getStore, calcRevenueRetention } from '../sync/engine.js';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  const store = getStore();
  const { customers } = store;

  if (!customers.length) return res.json(null);

  // "Clientes ativos" (MRR Total, Média de Saúde etc.) considera só quem
  // tem plano pago e não teve a conta cancelada (ver deriveAccountStatus em
  // server/sync/engine.js). Trial é contagem à parte — ainda não é
  // receita/cliente pagante.
  const activeCustomers = customers.filter(c => c.accountStatus === 'active');
  const cancelledCustomers = customers.filter(c => c.accountStatus === 'cancelled');
  const trialCount = customers.filter(c => c.accountStatus === 'trial').length;

  if (!activeCustomers.length) {
    return res.json({
      avgScore: 0, atRisk: 0, healthy: 0, totalMRR: 0, arr: 0, arpu: 0,
      logoChurnRate: 0, cancelledCount: cancelledCustomers.length, activeCount: 0, trialCount,
      multiAcquirerRate: 0, nrr: 100, grr: 100, newMrr: 0, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0,
      updatedAt: store.updatedAt,
    });
  }

  const totalMRR = activeCustomers.reduce((a, c) => a + c.mrr, 0);
  const count = activeCustomers.length;
  const avgScore = Math.round(activeCustomers.reduce((a, c) => a + c.score, 0) / count);
  const atRisk = activeCustomers.filter(c => c.status === 'At Risk').length;
  const healthy = activeCustomers.filter(c => c.status === 'Healthy').length;
  const multiAcquirerCount = activeCustomers.filter(c => c.multiAcquirer).length;

  const cancelledCount = cancelledCustomers.length;
  const activeAtStart = count + cancelledCount;
  const logoChurnRate = activeAtStart > 0 ? (cancelledCount / activeAtStart) * 100 : 0;

  const { nrr, grr, newMrr, expansionMrr, contractionMrr, churnedMrr } = calcRevenueRetention(activeCustomers, cancelledCustomers);

  res.json({
    avgScore,
    atRisk,
    healthy,
    totalMRR,
    arr: totalMRR * 12,
    arpu: totalMRR / count,
    logoChurnRate,
    cancelledCount,
    activeCount: count,
    trialCount,
    multiAcquirerRate: (multiAcquirerCount / count) * 100,
    nrr,
    grr,
    newMrr,
    expansionMrr,
    contractionMrr,
    churnedMrr,
    updatedAt: store.updatedAt,
  });
});

export default router;
