// Mesma fórmula de server.js#calcRevenueRetention, em JS de frontend —
// usada para recalcular NRR/GRR já filtrados pelo período ativo.
//
// newCustomers: clientes sem previousMrr, filtrados por joinDate no período.
// retainedCustomers: clientes com previousMrr, filtrados por lastChargeDate no
// período (é a data em que a renovação/cobrança de fato aconteceu — joinDate
// não serve aqui, clientes existentes raramente entraram dentro da janela).
export const computeRevenueRetention = (newCustomers, retainedCustomers, cancellations) => {
  const newMrr = newCustomers.reduce((a, c) => a + c.mrr, 0);
  const churnedMrr = cancellations.reduce((a, c) => a + (Number(c.mrr) || 0), 0);
  const startingMrr = retainedCustomers.reduce((a, c) => a + c.previousMrr, 0) + churnedMrr;

  if (startingMrr <= 0) {
    return { nrr: 100, grr: 100, newMrr, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0 };
  }

  const expansionMrr = retainedCustomers.reduce((a, c) => a + Math.max(0, c.mrr - c.previousMrr), 0);
  const contractionMrr = retainedCustomers.reduce((a, c) => a + Math.max(0, c.previousMrr - c.mrr), 0);

  const nrr = ((startingMrr + expansionMrr - contractionMrr - churnedMrr) / startingMrr) * 100;
  const grr = ((startingMrr - contractionMrr - churnedMrr) / startingMrr) * 100;

  return { nrr, grr, newMrr, expansionMrr, contractionMrr, churnedMrr };
};

export const computeLogoChurn = (periodCount, cancellationsInPeriod) => {
  const activeAtStart = periodCount + cancellationsInPeriod;
  return activeAtStart > 0 ? (cancellationsInPeriod / activeAtStart) * 100 : 0;
};

const PLAN_ORDER = ['Start', 'Pro', 'Scale', 'Enterprise'];

// Agrupa itens (clientes, cancelamentos, não-renovados...) por um campo
// qualquer (plano, motivo...), somando contagem e MRR, mais uma linha de
// Total. Sem `order`, ordena pela contagem (maior primeiro).
export const computeBreakdown = (items, { groupField = 'tier', valueField = 'mrr', order = null, fallbackLabel = 'Não informado' } = {}) => {
  const groups = {};
  items.forEach((item) => {
    const key = item[groupField] || fallbackLabel;
    if (!groups[key]) groups[key] = { key, count: 0, mrr: 0 };
    groups[key].count += 1;
    groups[key].mrr += Number(item[valueField]) || 0;
  });

  const breakdown = Object.values(groups).sort((a, b) => {
    if (order) {
      const ai = order.indexOf(a.key);
      const bi = order.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return b.count - a.count;
  });

  const total = breakdown.reduce(
    (acc, r) => ({ count: acc.count + r.count, mrr: acc.mrr + r.mrr }),
    { count: 0, mrr: 0 }
  );

  return { breakdown, total };
};

export const computePlanBreakdown = (items, valueField = 'mrr') =>
  computeBreakdown(items, { groupField: 'tier', valueField, order: PLAN_ORDER, fallbackLabel: 'Sem Plano' });
