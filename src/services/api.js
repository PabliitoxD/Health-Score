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
