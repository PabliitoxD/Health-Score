import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { readSurveyStore, writeSurveyStore } from '../state/surveyStore.js';

const router = Router();

// In-memory + persistido em disco (ver server/state/surveyStore.js) —
// centralizado no servidor em vez de localStorage por navegador.
let surveyStore = readSurveyStore();

// Disparo de pesquisa é ação interna do time de CS — exige login.
router.post('/surveys', requireAuth, (req, res) => {
  surveyStore.surveys.unshift(req.body);
  writeSurveyStore(surveyStore);
  res.json({ ok: true });
});

// Pública — usada tanto pela tela interna de Pesquisas quanto pela página de
// resposta que o cliente externo abre pelo link (?survey=...&token=...), sem
// login. A "autenticação" desse fluxo já é o token da própria URL.
router.get('/surveys', (_req, res) => {
  res.json({ surveys: surveyStore.surveys });
});

// Pública — resposta enviada pelo cliente externo pelo link da pesquisa.
router.post('/survey-responses', (req, res) => {
  const response = req.body;
  surveyStore.responses = surveyStore.responses.filter(r => r.token !== response.token);
  surveyStore.responses.push(response);
  surveyStore.surveys = surveyStore.surveys.map(s =>
    s.token === response.token ? { ...s, status: 'responded', score: response.score } : s
  );
  writeSurveyStore(surveyStore);
  res.json({ ok: true });
});

// Pública — mesma justificativa de GET /surveys acima.
router.get('/survey-responses', (_req, res) => {
  res.json({ responses: surveyStore.responses });
});

export default router;
