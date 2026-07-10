// Motivo de cancelamento categorizado manualmente pelo time de CS — a API
// externa só traz um motivo de negócio confiável quando o próprio cliente o
// informa ao cancelar (raro); no cancelamento "silencioso" e na falha de
// pagamento, o motivo é só um texto fixo (ver extractCancellation em
// server/sync/externalApi.js). Por isso a categorização de verdade é feita à
// mão na tela de Cancelamentos e persistida aqui, por conta (Produtor),
// sobrevivendo a reinícios do servidor e a cada nova sincronização com a API
// externa.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/cancellations/categoriesStore.js → server/.cache/ (um nível acima) —
// mesmo caminho físico de antes da reorganização, pra não perder a
// categorização já feita em produção nem quebrar o volume persistente
// configurado no EasyPanel (ver Dockerfile).
const STATE_PATH = join(__dirname, '..', '.cache', 'cancellation-categories.json');

export const CANCELLATION_CATEGORIES = [
  { id: 'preco', label: 'Preço/Custo' },
  { id: 'concorrencia', label: 'Foi para concorrência' },
  { id: 'insatisfacao', label: 'Insatisfação com produto/atendimento' },
  { id: 'nao_uso', label: 'Não usava / baixo engajamento' },
  { id: 'encerrou_atividades', label: 'Encerrou as atividades' },
  { id: 'financeiro_cliente', label: 'Dificuldade financeira do cliente' },
  { id: 'falha_pagamento', label: 'Falha de pagamento' },
  { id: 'outro', label: 'Outro' },
  { id: 'nao_informado', label: 'Não informado' },
];

const VALID_IDS = new Set(CANCELLATION_CATEGORIES.map((c) => c.id));

export function isValidCategory(id) {
  return VALID_IDS.has(id);
}

// { [codigo]: { category, note, updatedAt } }
export function readCancellationCategories() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeCancellationCategories(state) {
  try {
    const dir = dirname(STATE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[cancellationCategories] Falha ao gravar estado: ${err.message}`);
  }
}
