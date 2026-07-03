// Cache em disco do último sync completo bem-sucedido (customers/cancellations/
// nonRenewals) — carregado no boot ANTES de tentar contato com a API, pra o
// painel já subir com dado real (mesmo que desatualizado) em vez de vazio
// enquanto a sincronização roda. Só ajuda entre reinícios se o caminho
// server/.cache sobreviver ao deploy (ex: volume persistente no EasyPanel);
// sem isso, funciona como cache "durante a vida do processo" mesmo assim.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_CACHE_PATH = join(__dirname, '.cache', 'store-cache.json');

export function readStoreCache() {
  try {
    return JSON.parse(readFileSync(STORE_CACHE_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export function writeStoreCache(store) {
  try {
    const dir = dirname(STORE_CACHE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STORE_CACHE_PATH, JSON.stringify(store), 'utf-8');
  } catch (err) {
    console.error(`[storeCache] Falha ao gravar cache: ${err.message}`);
  }
}
