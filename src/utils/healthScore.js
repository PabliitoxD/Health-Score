export const formatLastLogin = (days) => {
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return `Há ${days} dias`;
};

export const formatNextCharge = (days) => {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `Vencida há ${Math.abs(days)}d`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
};
