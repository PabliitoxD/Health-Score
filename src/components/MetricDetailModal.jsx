import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import GlassCard from './ui/GlassCard';

// Modal genérico de detalhamento — usado pelos cards de métrica da tela
// Empresa pra mostrar a composição (lista de clientes/respostas) ou a
// fórmula por trás de um valor. `columns` ausente = só fórmula/summary.
const MetricDetailModal = ({ title, formula, summary, columns, rows = [], totalRow, emptyText = 'Nenhum dado no período', onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard variant="strong" className="shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {formula && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{formula}</p>
          )}

          {summary && summary.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {summary.map((item) => (
                <div key={item.label} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {columns && columns.length > 0 && (
            rows.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">{emptyText}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {columns.map((col, i) => (
                      <th key={col.key} className={`pb-2 pl-3 first:pl-0 font-semibold ${col.align === 'right' ? 'text-right' : ''} ${i > 0 ? 'whitespace-nowrap' : ''}`}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {columns.map((col, j) => (
                        <td
                          key={col.key}
                          className={`py-2 pl-3 first:pl-0 ${j > 0 ? 'whitespace-nowrap' : ''} ${col.align === 'right' ? 'text-right font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {totalRow && (
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                      {columns.map((col, i) => (
                        <td
                          key={col.key}
                          className={`py-2 pl-3 first:pl-0 font-bold text-slate-900 dark:text-white ${col.align === 'right' ? 'text-right' : ''} ${i > 0 ? 'whitespace-nowrap' : ''}`}
                        >
                          {i === 0 ? 'Total' : (totalRow[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            )
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default MetricDetailModal;
