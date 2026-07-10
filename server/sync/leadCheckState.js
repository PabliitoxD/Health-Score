// Controla, por código, quando foi a última vez que buscamos o detalhe
// completo de um cliente classificado como "lead" (trial travado, nunca
// pagou de verdade) — usado pra espaçar o recheck desses clientes (ver
// LEAD_RECHECK_INTERVAL_MS em server/sync/engine.js) em vez de bater a API
// externa com o detalhe de ~1000 contas que, na esmagadora maioria das
// sincronizações, não vão ter mudado nada (achado em 2026-07-08: dos 1320
// clientes verificados a cada sync, 1017 eram leads presos em trial sem
// nenhuma cobrança registrada).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '..', '.cache', 'lead-check-state.json');

// { [codigo]: "2026-07-08T14:43:34.333Z" (data/hora do último detalhe buscado) }
export function readLeadCheckState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeLeadCheckState(state) {
  try {
    const dir = dirname(STATE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[leadCheckState] Falha ao gravar estado: ${err.message}`);
  }
}
