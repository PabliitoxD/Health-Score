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
