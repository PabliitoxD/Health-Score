import React, { useState, useEffect, useMemo } from 'react';
import { FileDown, Search, XCircle, UserX, DollarSign, Tag } from 'lucide-react';
import { getCancellationReport, getCancellationCategoryOptions, updateCancellationCategory } from '../services/api';
import { applyDateFilter } from '../utils/dateFilter';
import { computeBreakdown } from '../utils/kpis';
import { formatCurrency } from '../utils/formatters';
import { exportCancellationsToXlsx } from '../utils/exportXlsx';
import GlassCard from './ui/GlassCard';
import FilterBar from './FilterBar';

const TYPE_LABELS = { cancellation: 'Cancelamento', non_renewal: 'Não renovação' };
const TYPE_CLASS = {
  cancellation: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  non_renewal: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

const SummaryCard = ({ icon, iconBg, iconColor, label, value }) => (
  <GlassCard variant="default" className="p-5">
    <div className={`w-9 h-9 flex items-center justify-center rounded-lg mb-3 ${iconBg} ${iconColor}`}>
      {icon}
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-1">{label}</p>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</h3>
  </GlassCard>
);

// Linha com estado próprio de observação, pra digitar sem salvar a cada
// tecla — só persiste no blur, se o texto realmente mudou.
const CancellationRow = ({ item, categories, onCategoryChange, onNoteSave }) => {
  const [note, setNote] = useState(item.categoryNote || '');

  useEffect(() => { setNote(item.categoryNote || ''); }, [item.categoryNote]);

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs">Cód. {item.id} · {item.tier}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${TYPE_CLASS[item.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
          {TYPE_LABELS[item.type] || item.type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{item.eventDate || '—'}</td>
      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white text-right whitespace-nowrap">{formatCurrency(item.mrr)}</td>
      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={item.rawReason || ''}>
        {item.rawReason || '—'}
      </td>
      <td className="px-4 py-3">
        <select
          value={item.category}
          onChange={(e) => onCategoryChange(item.id, e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={note}
          placeholder="Observação..."
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== (item.categoryNote || '')) onNoteSave(item.id, note); }}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full min-w-[140px]"
        />
      </td>
    </tr>
  );
};

const CancellationsView = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [report, categoryOptions] = await Promise.all([
          getCancellationReport(),
          getCancellationCategoryOptions(),
        ]);
        setItems(report.items || []);
        setCategories(categoryOptions || []);
      } catch (error) {
        console.error('Erro ao carregar relatório de cancelamentos:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categoryLabelById = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[c.id] = c.label; });
    return map;
  }, [categories]);

  const itemsInPeriod = useMemo(
    () => applyDateFilter(items, dateFilter, customDateRange, 'eventDate'),
    [items, dateFilter, customDateRange]
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return itemsInPeriod.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (term && !item.name.toLowerCase().includes(term) && !String(item.id).toLowerCase().includes(term)) return false;
      return true;
    });
  }, [itemsInPeriod, categoryFilter, searchTerm]);

  const sortedItems = useMemo(
    () => [...filteredItems].sort((a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0)),
    [filteredItems]
  );

  const totalMrrLost = filteredItems.reduce((a, c) => a + c.mrr, 0);
  const notCategorizedCount = filteredItems.filter((c) => c.category === 'nao_informado').length;

  const categoryBreakdown = useMemo(() => {
    const withLabel = filteredItems.map((item) => ({ ...item, categoryLabel: categoryLabelById[item.category] || item.category }));
    return computeBreakdown(withLabel, { groupField: 'categoryLabel', valueField: 'mrr' });
  }, [filteredItems, categoryLabelById]);

  // Otimista: atualiza a lista local na hora, salva no servidor em seguida —
  // se a chamada falhar, só loga (o usuário pode tentar de novo mudando o
  // campo, sem travar a tela por causa de uma falha de rede pontual).
  const persistCategory = async (id, category, note) => {
    const updatedAt = new Date().toISOString();
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, category, categoryNote: note, categoryUpdatedAt: updatedAt } : it)));
    try {
      await updateCancellationCategory(id, category, note);
    } catch (error) {
      console.error('Erro ao salvar categoria de cancelamento:', error);
    }
  };

  const handleCategoryChange = (id, category) => {
    const current = items.find((it) => it.id === id);
    persistCategory(id, category, current?.categoryNote || '');
  };

  const handleNoteSave = (id, note) => {
    const current = items.find((it) => it.id === id);
    persistCategory(id, current?.category || 'nao_informado', note);
  };

  const handleExport = () => exportCancellationsToXlsx(sortedItems, categoryLabelById);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 dark:text-slate-500 font-medium animate-pulse">Carregando cancelamentos...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cancelamentos</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Clientes que cancelaram ou não renovaram, com o motivo categorizado pelo time de CS.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={sortedItems.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-brand-100 dark:shadow-brand-900/20 transition-colors flex-shrink-0"
          >
            <FileDown size={16} />
            Exportar Excel
          </button>
        </div>

        <FilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon={<XCircle size={18} />} iconBg="bg-rose-50 dark:bg-rose-500/10" iconColor="text-rose-600 dark:text-rose-400"
            label="Total no Período" value={filteredItems.length}
          />
          <SummaryCard
            icon={<DollarSign size={18} />} iconBg="bg-rose-50 dark:bg-rose-500/10" iconColor="text-rose-600 dark:text-rose-400"
            label="MRR Perdido" value={formatCurrency(totalMrrLost)}
          />
          <SummaryCard
            icon={<UserX size={18} />} iconBg="bg-amber-50 dark:bg-amber-500/10" iconColor="text-amber-600 dark:text-amber-400"
            label="Não Renovados" value={filteredItems.filter((c) => c.type === 'non_renewal').length}
          />
          <SummaryCard
            icon={<Tag size={18} />} iconBg="bg-slate-100 dark:bg-slate-800" iconColor="text-slate-600 dark:text-slate-400"
            label="Sem Categoria" value={notCategorizedCount}
          />
        </div>

        <GlassCard variant="subtle" className="p-4 flex flex-col md:flex-row gap-4 items-center mb-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar cliente ou código..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full md:w-auto"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </GlassCard>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto mb-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold text-right">MRR</th>
                <th className="px-4 py-3 font-semibold">Motivo (API)</th>
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {sortedItems.map((item) => (
                <CancellationRow
                  key={item.id}
                  item={item}
                  categories={categories}
                  onCategoryChange={handleCategoryChange}
                  onNoteSave={handleNoteSave}
                />
              ))}
              {sortedItems.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                    Nenhum cancelamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <GlassCard variant="default" className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Tag size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cancelamentos por Categoria</h3>
          </div>
          {categoryBreakdown.breakdown.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">Nenhum cancelamento no período</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Categoria</th>
                  <th className="pb-2 font-semibold text-right">Qtd</th>
                  <th className="pb-2 font-semibold text-right">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryBreakdown.breakdown.map((row) => (
                  <tr key={row.key}>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{row.key}</td>
                    <td className="py-2 text-right font-medium text-slate-900 dark:text-white">{row.count}</td>
                    <td className="py-2 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(row.mrr)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="py-2 font-bold text-slate-900 dark:text-white">Total</td>
                  <td className="py-2 text-right font-bold text-slate-900 dark:text-white">{categoryBreakdown.total.count}</td>
                  <td className="py-2 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(categoryBreakdown.total.mrr)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default CancellationsView;
