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
