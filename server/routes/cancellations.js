import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getStore } from '../services/syncEngine.js';
import {
  CANCELLATION_CATEGORIES,
  isValidCategory,
  readCancellationCategories,
  writeCancellationCategories,
} from '../cancellationCategories.js';

const router = Router();

// Categorização manual de motivo de cancelamento (por conta) — persistida em
// disco (ver server/cancellationCategories.js), sobrevive a reinícios e não é
// tocada pela sincronização periódica com a API externa.
let cancellationCategories = readCancellationCategories();

router.get('/cancellations', requireAuth, (_req, res) => {
  const store = getStore();
  res.json({ cancellations: store.cancellations, updatedAt: store.updatedAt });
});

router.get('/non-renewals', requireAuth, (_req, res) => {
  const store = getStore();
  res.json({ nonRenewals: store.nonRenewals, updatedAt: store.updatedAt });
});

router.get('/cancellation-categories/options', requireAuth, (_req, res) => {
  res.json({ categories: CANCELLATION_CATEGORIES });
});

// Relatório de cancelamentos: consolida cancelamentos voluntários (incluindo
// os "silenciosos", ver deriveAccountStatus) e não renovações por falha de
// pagamento numa lista única, já com a categoria de motivo aplicada — a
// categoria manual (cancellationCategories) tem prioridade; sem categoria
// manual, falha de pagamento assume 'falha_pagamento' automaticamente e o
// resto cai em 'nao_informado', aguardando classificação do CS.
router.get('/cancellations-report', requireAuth, (_req, res) => {
  const store = getStore();
  const cancelItems = store.cancellations.map((c) => ({
    id: c.id,
    name: c.name,
    tier: c.tier,
    mrr: Number(c.mrr) || 0,
    type: 'cancellation',
    eventDate: c.cancelDate,
    rawReason: c.reason || null,
  }));
  const nonRenewalItems = store.nonRenewals.map((c) => ({
    id: c.id,
    name: c.name,
    tier: c.tier,
    mrr: Number(c.mrr) || 0,
    type: 'non_renewal',
    eventDate: c.cycleEndDate,
    rawReason: c.reason || null,
  }));

  const items = [...cancelItems, ...nonRenewalItems].map((item) => {
    const override = cancellationCategories[item.id];
    const category = override?.category || (item.type === 'non_renewal' ? 'falha_pagamento' : 'nao_informado');
    return {
      ...item,
      category,
      categoryNote: override?.note || '',
      categoryUpdatedAt: override?.updatedAt || null,
    };
  });

  res.json({ items, updatedAt: store.updatedAt });
});

router.put('/cancellation-categories/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { category, note } = req.body || {};

  if (!isValidCategory(category)) {
    return res.status(400).json({ error: `Categoria inválida: ${category}` });
  }

  cancellationCategories = {
    ...cancellationCategories,
    [id]: { category, note: note || '', updatedAt: new Date().toISOString() },
  };
  writeCancellationCategories(cancellationCategories);

  res.json({ ok: true, id, ...cancellationCategories[id] });
});

export default router;
