import { formatCurrency } from './formatters';

const TYPE_LABELS = { cancellation: 'Cancelamento', non_renewal: 'Não renovação' };

// Import dinâmico: a lib xlsx pesa quase 1MB minificada e só é usada quando
// o usuário clica em "Exportar Excel" — carregar ela no bundle inicial
// deixaria o dashboard mais pesado pra todo mundo à toa.
export const exportCancellationsToXlsx = async (items, categoryLabelById, filename = 'relatorio-cancelamentos.xlsx') => {
  const XLSX = await import('xlsx');
  const rows = items.map((item) => ({
    'Cliente': item.name,
    'Código': item.id,
    'Plano': item.tier,
    'Tipo': TYPE_LABELS[item.type] || item.type,
    'Data': item.eventDate || '',
    'MRR Perdido': item.mrr,
    'MRR Perdido (formatado)': formatCurrency(item.mrr),
    'Categoria': categoryLabelById[item.category] || item.category,
    'Motivo (API)': item.rawReason || '',
    'Observação': item.categoryNote || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
    { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cancelamentos');
  XLSX.writeFile(workbook, filename);
};
