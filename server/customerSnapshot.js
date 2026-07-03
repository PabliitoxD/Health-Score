// Guarda, por cliente, o health score e o MRR calculados na última
// sincronização com a API real — usados como "anterior" na próxima:
//
// - Score: é métrica nossa (calculada), a API não tem histórico disso.
// - MRR: normalmente vem de plan.renewals[1].value (ver server/externalApi.js),
//   mas esse snapshot serve de fallback pra contas com menos de 2 renovações
//   no histórico (cliente muito novo) — assim Expansion/Contraction/NRR/GRR
//   continuam funcionando mesmo pra quem ainda não tem histórico suficiente.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, '.cache', 'customer-snapshots.json');

// { [codigo]: { score, mrr } }
export function readCustomerSnapshot() {
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeCustomerSnapshot(snapshot) {
  try {
    const dir = dirname(SNAPSHOT_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[customerSnapshot] Falha ao gravar snapshot: ${err.message}`);
  }
}
