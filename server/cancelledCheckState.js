// Controla, por código, quando foi a última vez que buscamos o detalhe
// completo de um cliente já confirmado como "cancelled" (accountStatus) —
// usado pra espaçar o recheck desses clientes (ver CANCELLED_RECHECK_INTERVAL_MS
// em server.js), mesmo padrão já usado pra leads (ver leadCheckState.js).
// Reativação de um cliente cancelado é rara o suficiente pra não precisar de
// detecção hora a hora — decisão tomada com o Pablo em 2026-07-09, depois de
// notar que contas já canceladas dominavam o tempo de sincronização mesmo
// sem nunca mudar de estado entre um ciclo e outro.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '.cache', 'cancelled-check-state.json');

// { [codigo]: "2026-07-09T14:43:34.333Z" (data/hora do último detalhe buscado) }
export function readCancelledCheckState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeCancelledCheckState(state) {
  try {
    const dir = dirname(STATE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[cancelledCheckState] Falha ao gravar estado: ${err.message}`);
  }
}
