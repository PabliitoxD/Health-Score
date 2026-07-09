export const getScoreColor = (score) => {
  if (score >= 75) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  if (score >= 50) return 'text-amber-500 bg-amber-50 border-amber-100';
  return 'text-rose-500 bg-rose-50 border-rose-100';
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatPercent = (value, decimals = 1) =>
  `${value.toFixed(decimals)}%`;

export const formatNumber = (value) =>
  new Intl.NumberFormat('pt-BR').format(value);

export const formatJoinDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// Aceita tanto data pura ("2026-07-08") quanto datetime com espaço
// ("2026-07-08 08:00:05", formato do cycleEndDate de não renovação) e
// devolve sempre DD/MM/AAAA — normaliza o separador pra "T" antes de
// parsear, senão o Safari rejeita o formato com espaço.
export const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const datePart = dateStr.split(' ')[0].split('T')[0];
  const date = new Date(datePart + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
};
