// NPS: % promotores (score >= 9) menos % detratores (score <= 6), sobre respostas tipo 'nps' (0-10).
export const computeNps = (responses) => {
  const npsResponses = responses.filter((r) => r.type === 'nps');
  const total = npsResponses.length;
  if (total === 0) return null;

  const promoters = npsResponses.filter((r) => r.score >= 9).length;
  const detractors = npsResponses.filter((r) => r.score <= 6).length;

  return Math.round(((promoters - detractors) / total) * 100);
};

// CSAT: % de respostas com score >= 4, sobre as respostas tipo CSAT (1-5).
export const computeCsat = (responses) => {
  const csatResponses = responses.filter((r) => r.type !== 'nps');
  const total = csatResponses.length;
  if (total === 0) return null;

  const satisfied = csatResponses.filter((r) => r.score >= 4).length;
  return Math.round((satisfied / total) * 100);
};
