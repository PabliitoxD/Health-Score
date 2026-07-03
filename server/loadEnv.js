// Loader minimalista de .env — sem dependência nova (o projeto não tem
// "dotenv"). Só usado em desenvolvimento/preview local; em produção o .env
// não existe (está no .dockerignore) e as variáveis vêm injetadas pela
// própria plataforma de deploy, que sempre tem prioridade sobre o arquivo.
import { readFileSync, existsSync } from 'fs';

export function loadEnvFile(path = '.env') {
  if (!existsSync(path)) return;

  const content = readFileSync(path, 'utf-8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    const isQuoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) value = value.slice(1, -1);

    // Variável de ambiente real (setada pela plataforma) sempre vence.
    if (!(key in process.env)) process.env[key] = value;
  });
}
