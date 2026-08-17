// Histórico permanente de eventos (assinatura/renovação/upgrade/downgrade/
// cancelamento/não-renovação) por cliente — diferente de store.customers
// (estado atual) e store.cancellations/nonRenewals (só quem está cancelado
// AGORA, ver comentário em server/sync/engine.js), este arquivo acumula pra
// sempre: um cliente que cancela e reativa não perde o evento de
// cancelamento antigo. Mesclado por dedupKey a cada sincronização (ver
// mergeCustomerHistory em server/sync/engine.js) — nunca sobrescrito do
// zero.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/history/store.js → server/.cache/ (um nível acima) — mesmo caminho
// físico usado pelos outros stores (ver server/sync/customerSnapshot.js),
// dentro do volume persistente configurado no EasyPanel (ver Dockerfile).
const HISTORY_PATH = join(__dirname, '..', '.cache', 'customer-history.json');

// { [dedupKey]: evento } — chave plana (não agrupada por cliente) pra
// deduplicar em O(1) direto na mesclagem, sem precisar varrer o array de
// cada cliente a cada sincronização.
export function readCustomerHistory() {
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeCustomerHistory(history) {
  try {
    const dir = dirname(HISTORY_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[history/store] Falha ao gravar histórico: ${err.message}`);
  }
}
