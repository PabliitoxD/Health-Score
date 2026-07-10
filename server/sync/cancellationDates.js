// Guarda, por código, a data/hora em que uma sincronização detectou pela
// primeira vez que uma conta cancelou "silenciosamente" — ou seja, sem uma
// data explícita em cancellation.client_request (achado testando a conta
// 89106111: a API reseta o plano pra Gratuito sem marcar isso em
// client_request nem em payment_failure). Sem essa data persistida, o
// filtro de período (Hoje/Semana/Mês) nunca contaria esses cancelamentos,
// porque cancelDate ficaria null pra sempre — ver extractCancellation em
// server/sync/externalApi.js.
//
// Bookkeeping interno do motor de sync (não confundir com a categorização
// manual de motivo de cancelamento, que fica em server/cancellations/ — ver
// server/cancellations/categoriesStore.js).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '..', '.cache', 'cancellation-detected-at.json');

// { [codigo]: "2026-07-08T18:00:00.000Z" }
export function readCancellationDetectedAt() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeCancellationDetectedAt(state) {
  try {
    const dir = dirname(STATE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[cancellationDates] Falha ao gravar estado: ${err.message}`);
  }
}
