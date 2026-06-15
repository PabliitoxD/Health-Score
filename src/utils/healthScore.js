const calcEngajamento = (lastLoginDays) => {
  if (lastLoginDays === 0) return 100;
  if (lastLoginDays <= 1) return 85;
  if (lastLoginDays <= 3) return 70;
  if (lastLoginDays <= 7) return 50;
  if (lastLoginDays <= 14) return 25;
  return 0;
};

const calcAdocaoTecnica = (multiAcquirer, volumeUsage) => {
  const multiScore = multiAcquirer ? 100 : 30;
  const volScore = Math.min(volumeUsage, 100);
  return Math.round(multiScore * 0.6 + volScore * 0.4);
};

export const calculateHealthScore = (customer) => {
  const engajamento = calcEngajamento(customer.lastLoginDays);
  const performance = customer.approvalRate;
  const adocaoTecnica = calcAdocaoTecnica(customer.multiAcquirer, customer.volumeUsage);

  const score = Math.round(
    engajamento * 0.15 +
    performance * 0.65 +
    adocaoTecnica * 0.20
  );

  const status = score >= 75 ? 'Healthy' : score >= 50 ? 'Attention' : 'At Risk';

  return { score, status, engajamento, performance, adocaoTecnica };
};

export const formatLastLogin = (days) => {
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return `Há ${days} dias`;
};
