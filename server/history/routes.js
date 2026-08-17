import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { readCustomerHistory } from './store.js';

const router = Router();

const EMPTY_COUNTS = { assinatura: 0, renovacao: 0, upgrade: 0, downgrade: 0, cancelamento: 0, nao_renovacao: 0 };

// Consolida os eventos persistidos (ver server/history/store.js) por mês
// (YYYY-MM, extraído da data do evento). netMrr soma o MRR novo (assinatura)
// e o delta de upgrade/downgrade (mrr - previousMrr, ver extractHistoryEvents
// em server/sync/externalApi.js) e subtrai o MRR perdido em cancelamento/não
// renovação — responde diretamente "qual foi a diferença de players/receita
// naquele mês". events por mês vem junto pra dar pra expandir a linha no
// front sem outra chamada.
router.get('/history/monthly', requireAuth, (_req, res) => {
  const events = Object.values(readCustomerHistory());
  const byMonth = {};

  events.forEach((event) => {
    const month = event.date?.slice(0, 7);
    if (!month) return;
    if (!byMonth[month]) {
      byMonth[month] = { month, counts: { ...EMPTY_COUNTS }, netMrr: 0, netCustomers: 0, events: [] };
    }
    const bucket = byMonth[month];
    bucket.counts[event.type] = (bucket.counts[event.type] || 0) + 1;
    bucket.events.push(event);

    const mrr = Number(event.mrr) || 0;
    const previousMrr = Number(event.previousMrr) || 0;
    if (event.type === 'assinatura') {
      bucket.netMrr += mrr;
      bucket.netCustomers += 1;
    } else if (event.type === 'upgrade' || event.type === 'downgrade') {
      bucket.netMrr += mrr - previousMrr;
    } else if (event.type === 'cancelamento' || event.type === 'nao_renovacao') {
      bucket.netMrr -= mrr;
      bucket.netCustomers -= 1;
    }
  });

  const months = Object.values(byMonth)
    .map((bucket) => ({ ...bucket, events: bucket.events.sort((a, b) => (a.date < b.date ? 1 : -1)) }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  res.json({ months });
});

// Linha do tempo completa de um cliente específico (ordem cronológica) —
// alimenta o botão "Histórico" em CustomerDetails.jsx.
router.get('/history/customer/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const events = Object.values(readCustomerHistory())
    .filter((e) => String(e.customerId) === String(id))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  res.json({ id, name: events[events.length - 1]?.name || null, events });
});

export default router;
