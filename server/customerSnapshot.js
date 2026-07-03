// Guarda, por cliente, o health score e o MRR calculados na última
// sincronização com a API real — usados como "anterior" na próxima:
//
// - Score: é métrica nossa (calculada), a API não tem histórico disso.
// - MRR: a API deveria trazer isso via plan.renewals/upgrades_downgrades,
//   mas essas listas vieram sempre vazias nos testes (mesmo em conta paga
//   há quase 2 anos) — usamos nosso snapshot como fallback pra Expansion/
//   Contraction/NRR/GRR continuarem funcionando enquanto isso não muda.
//
// Só usado no modo API real; o mock usa os campos estáticos "Score
// Anterior"/"MRR Anterior" que já vêm em server/fixtures/mockCustomers.js.

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
