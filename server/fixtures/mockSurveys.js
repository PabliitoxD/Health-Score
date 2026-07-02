// Seed de pesquisas/respostas — usado enquanto nao ha dados reais no
// surveyStore em memoria, so para a tela Empresa nao nascer vazia.

export const mockSurveys = [
  { token: 'seed-nps-001', type: 'nps', customerId: 'PRD-1001', customerName: 'Bravepay Soluções em Pagamentos LTDA', status: 'responded', score: 10, createdAt: '2026-06-10T09:00:00.000Z' },
  { token: 'seed-nps-002', type: 'nps', customerId: 'PRD-1003', customerName: 'NordVarejo Atacado e Distribuição S.A.', status: 'responded', score: 9, createdAt: '2026-06-12T10:00:00.000Z' },
  { token: 'seed-nps-003', type: 'nps', customerId: 'PRD-1005', customerName: 'Vitrine Fashion Multimarcas LTDA', status: 'responded', score: 4, createdAt: '2026-06-14T11:00:00.000Z' },
  { token: 'seed-csat-001', type: 'csat_health', customerId: 'PRD-1002', customerName: 'Ecomcorp Comércio Digital LTDA', status: 'responded', score: 4, createdAt: '2026-06-16T09:30:00.000Z' },
  { token: 'seed-csat-002', type: 'csat_health', customerId: 'PRD-1006', customerName: 'TechFarma Distribuidora LTDA', status: 'responded', score: 5, createdAt: '2026-06-18T14:00:00.000Z' },
  { token: 'seed-csat-003', type: 'csat_onboarding', customerId: 'PRD-1008', customerName: 'Construtora Horizonte Engenharia LTDA', status: 'responded', score: 5, createdAt: '2026-06-20T08:45:00.000Z' },
  { token: 'seed-csat-004', type: 'csat_onboarding', customerId: 'PRD-1009', customerName: 'AutoPeças Rota 66 Comércio LTDA', status: 'responded', score: 3, createdAt: '2026-06-22T13:20:00.000Z' },
  { token: 'seed-csat-005', type: 'csat_nps_follow', customerId: 'PRD-1011', customerName: 'Grupo Nutriplena Alimentos LTDA', status: 'responded', score: 2, createdAt: '2026-06-24T10:15:00.000Z' },
];

export const mockSurveyResponses = [
  { token: 'seed-nps-001', customerId: 'PRD-1001', type: 'nps', score: 10, comment: 'Plataforma excelente, suporte muito rápido.', respondedAt: '2026-06-10T09:05:00.000Z' },
  { token: 'seed-nps-002', customerId: 'PRD-1003', type: 'nps', score: 9, comment: 'Ótima ferramenta para gestão financeira.', respondedAt: '2026-06-12T10:04:00.000Z' },
  { token: 'seed-nps-003', customerId: 'PRD-1005', type: 'nps', score: 4, comment: 'Tivemos problemas de integração recentemente.', respondedAt: '2026-06-14T11:03:00.000Z' },
  { token: 'seed-csat-001', customerId: 'PRD-1002', type: 'csat_health', score: 4, comment: 'Bom, mas pode melhorar o tempo de resposta.', respondedAt: '2026-06-16T09:34:00.000Z' },
  { token: 'seed-csat-002', customerId: 'PRD-1006', type: 'csat_health', score: 5, comment: 'Muito satisfeito com a plataforma.', respondedAt: '2026-06-18T14:05:00.000Z' },
  {
    token: 'seed-csat-003', customerId: 'PRD-1008', type: 'csat_onboarding', score: 5,
    scores: { sistema: 5, cadastro: 5, integracao: 4, ofertas: 5, checkout: 5, membros: 5, webhook: 4 },
    comment: 'Onboarding tranquilo, time atencioso.', respondedAt: '2026-06-20T08:50:00.000Z',
  },
  {
    token: 'seed-csat-004', customerId: 'PRD-1009', type: 'csat_onboarding', score: 3,
    scores: { sistema: 3, cadastro: 3, integracao: 2, ofertas: 3, checkout: 3, membros: 4, webhook: 3 },
    comment: 'Faltou clareza em algumas etapas.', respondedAt: '2026-06-22T13:25:00.000Z',
  },
  {
    token: 'seed-csat-005', customerId: 'PRD-1011', type: 'csat_nps_follow', score: 2,
    scores: { suporte: 2, usabilidade: 3, integracoes: 2 },
    feedback: 'O suporte demorou muito para responder um chamado crítico.', respondedAt: '2026-06-24T10:20:00.000Z',
  },
];
