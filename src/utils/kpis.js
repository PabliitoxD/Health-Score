// Mesma fórmula de server.js#calcRevenueRetention, em JS de frontend —
// usada para recalcular NRR/GRR já filtrados pelo período ativo (dateFilter).

export const computeRevenueRetention = (customers, cancellations) => {
  const withHistory = customers.filter((c) => c.previousMrr !== null && c.previousMrr !== undefined);
  const churnedMrr = cancellations.reduce((a, c) => a + (Number(c.mrr) || 0), 0);
  const startingMrr = withHistory.reduce((a, c) => a + c.previousMrr, 0) + churnedMrr;

  if (startingMrr <= 0) {
    return { nrr: 100, grr: 100, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0 };
  }

  const expansionMrr = withHistory.reduce((a, c) => a + Math.max(0, c.mrr - c.previousMrr), 0);
  const contractionMrr = withHistory.reduce((a, c) => a + Math.max(0, c.previousMrr - c.mrr), 0);

  const nrr = ((startingMrr + expansionMrr - contractionMrr - churnedMrr) / startingMrr) * 100;
  const grr = ((startingMrr - contractionMrr - churnedMrr) / startingMrr) * 100;

  return { nrr, grr, expansionMrr, contractionMrr, churnedMrr };
};

export const computeLogoChurn = (periodCount, cancellationsInPeriod) => {
  const activeAtStart = periodCount + cancellationsInPeriod;
  return activeAtStart > 0 ? (cancellationsInPeriod / activeAtStart) * 100 : 0;
};
