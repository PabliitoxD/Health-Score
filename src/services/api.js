export const getCustomers = async () => {
  const res = await fetch('/api/customers');
  if (!res.ok) throw new Error('Falha ao buscar clientes');
  const { customers } = await res.json();
  return customers;
};

export const getStats = async () => {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Falha ao buscar estatísticas');
  return res.json();
};

export const getCancellations = async () => {
  const res = await fetch('/api/cancellations');
  if (!res.ok) throw new Error('Falha ao buscar cancelamentos');
  const { cancellations } = await res.json();
  return cancellations;
};

export const getNonRenewals = async () => {
  const res = await fetch('/api/non-renewals');
  if (!res.ok) throw new Error('Falha ao buscar não renovados');
  const { nonRenewals } = await res.json();
  return nonRenewals;
};

export const getCancellationCategoryOptions = async () => {
  const res = await fetch('/api/cancellation-categories/options');
  if (!res.ok) throw new Error('Falha ao buscar categorias de cancelamento');
  const { categories } = await res.json();
  return categories;
};

export const getCancellationReport = async () => {
  const res = await fetch('/api/cancellations-report');
  if (!res.ok) throw new Error('Falha ao buscar relatório de cancelamentos');
  return res.json();
};

export const updateCancellationCategory = async (id, category, note) => {
  const res = await fetch(`/api/cancellation-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, note }),
  });
  if (!res.ok) throw new Error('Falha ao salvar categoria do cancelamento');
  return res.json();
};
