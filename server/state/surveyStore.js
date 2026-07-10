// Persistência em disco de pesquisas (NPS/CSAT) disparadas e respostas
// recebidas — mesmo padrão de server/storeCache.js. Antes, esse estado era
// só `let` em memória (resetava a cada restart/deploy); como o deploy em
// produção é manual e frequente, isso vinha apagando pesquisas já disparadas
// e respostas de clientes silenciosamente a cada novo deploy.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SURVEY_STORE_PATH = join(__dirname, '..', '.cache', 'survey-store.json');

export function readSurveyStore() {
  try {
    return JSON.parse(readFileSync(SURVEY_STORE_PATH, 'utf-8'));
  } catch {
    return { surveys: [], responses: [] };
  }
}

export function writeSurveyStore(surveyStore) {
  try {
    const dir = dirname(SURVEY_STORE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(SURVEY_STORE_PATH, JSON.stringify(surveyStore), 'utf-8');
  } catch (err) {
    console.error(`[surveyStore] Falha ao gravar estado: ${err.message}`);
  }
}
