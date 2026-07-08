const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const applyDateFilter = (items, dateFilter, customDateRange, dateField = 'joinDate') => {
  if (dateFilter === 'all') return items;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateFilter === 'today') {
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      return d.getTime() === today.getTime();
    });
  }
  if (dateFilter === 'week') {
    const weekStart = startOfWeek(today);
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      return d >= weekStart && d <= today;
    });
  }
  if (dateFilter === 'month') {
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      return d.getFullYear() === today.getFullYear() &&
             d.getMonth() === today.getMonth();
    });
  }
  if (dateFilter === 'custom') {
    return items.filter((it) => {
      const d = new Date(it[dateField] + 'T00:00:00');
      if (customDateRange.from && d < new Date(customDateRange.from + 'T00:00:00')) return false;
      if (customDateRange.to && d > new Date(customDateRange.to + 'T23:59:59')) return false;
      return true;
    });
  }
  return items;
};

// Quem já é cliente "até o fim do período" (sem exigir que tenha entrado
// DENTRO da janela) — usado pra saber quem estava ativo naquele período,
// não só quem é novo nele. Pra um cliente que segue ativo hoje (sem gap de
// cancelamento no meio), joinDate <= fim do período já garante que ele
// esteve ativo em algum momento dentro da janela, então não precisa checar
// o início: um cliente antigo continua "ativo em Julho" mesmo tendo entrado
// em Janeiro. Decisão tomada com o Pablo em 2026-07-08.
export const applyAsOfFilter = (items, dateFilter, customDateRange, dateField = 'joinDate') => {
  if (dateFilter === 'all') return items;

  let periodEnd;
  if (dateFilter === 'custom') {
    periodEnd = customDateRange.to ? new Date(customDateRange.to + 'T23:59:59') : null;
  } else {
    periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);
  }
  if (!periodEnd) return items;

  return items.filter((it) => {
    if (!it[dateField]) return false;
    const d = new Date(it[dateField] + 'T00:00:00');
    return d <= periodEnd;
  });
};
