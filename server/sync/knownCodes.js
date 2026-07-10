// Registro de códigos de conta que já foram confirmados como clientes
// pagantes de verdade (everPaid=true) em alguma sincronização — usado pra
// continuar buscando o detalhe dessas contas mesmo depois que elas saem do
// plano pago (a API reseta pra "Gratuito" quando cancela de vez, e nesse
// ponto a varredura de /dashboard/accounts não as encontra mais).
//
// Começa com o seed fornecido pelo time (server/sync/knownCodesSeed.js,
// versionado no git) e cresce com o cache em disco conforme novas contas são
// confirmadas como pagantes em cada sync. Sem cache persistente entre
// deploys, o registro volta a ser só o seed — ainda assim cobre a lista de
// referência conhecida.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { KNOWN_CODES_SEED } from './knownCodesSeed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_CODES_PATH = join(__dirname, '..', '.cache', 'known-codes.json');

export function readKnownCodes() {
  let cached = [];
  try {
    cached = JSON.parse(readFileSync(KNOWN_CODES_PATH, 'utf-8'));
  } catch {
    cached = [];
  }
  return Array.from(new Set([...KNOWN_CODES_SEED, ...cached]));
}

export function writeKnownCodes(codes) {
  try {
    const dir = dirname(KNOWN_CODES_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(KNOWN_CODES_PATH, JSON.stringify(Array.from(new Set(codes))), 'utf-8');
  } catch (err) {
    console.error(`[knownCodes] Falha ao gravar registro: ${err.message}`);
  }
}
