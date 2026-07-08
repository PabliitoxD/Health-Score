// Guarda quando foi a última varredura da listagem de contas, pra próxima
// sincronização não precisar reescanear as ~2639 páginas inteiras — só as
// páginas com cadastros mais novos que isso (a listagem vem ordenada por
// registration_date decrescente — ver fetchPaidAccountCodes em
// server/externalApi.js). Decisão tomada com o Pablo em 2026-07-08: sem
// varredura completa periódica de segurança, só a incremental.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '.cache', 'listing-scan-state.json');

// { lastScanAt: "2026-07-08T18:02:16.926Z" }
export function readListingScanState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeListingScanState(state) {
  try {
    const dir = dirname(STATE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[listingScanState] Falha ao gravar estado: ${err.message}`);
  }
}
