export const generateToken = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

export const getSurveys = async () => {
  const res = await fetch('/api/surveys');
  if (!res.ok) throw new Error('Falha ao buscar pesquisas');
  const { surveys } = await res.json();
  return surveys;
};

export const saveSurvey = async (survey) => {
  const res = await fetch('/api/surveys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(survey),
  });
  if (!res.ok) throw new Error('Falha ao salvar pesquisa');
};

export const getResponses = async () => {
  const res = await fetch('/api/survey-responses');
  if (!res.ok) throw new Error('Falha ao buscar respostas');
  const { responses } = await res.json();
  return responses;
};

export const saveResponse = async (response) => {
  const res = await fetch('/api/survey-responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  });
  if (!res.ok) throw new Error('Falha ao salvar resposta');
};

export const getResponseByToken = async (token) => {
  const responses = await getResponses();
  return responses.find((r) => r.token === token) || null;
};

export const getSurveyByToken = async (token) => {
  const surveys = await getSurveys();
  return surveys.find((s) => s.token === token) || null;
};

export const buildSurveyUrl = (token, type, customerId, customerName) => {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    survey: type,
    token,
    cid: customerId,
    cname: customerName,
  });
  return `${base}?${params.toString()}`;
};

export const buildWhatsAppUrl = (link, customerName, type, phone = '') => {
  const typeLabel = type === 'nps' ? 'NPS' : 'CSAT';
  const message =
    `Olá, ${customerName}! 👋\n` +
    `A equipe Bravvius gostaria de ouvir a sua opinião.\n\n` +
    (type === 'nps'
      ? `Em uma escala de 0 a 10, qual a probabilidade de você nos recomendar a um colega ou parceiro?`
      : `Como você avaliaria sua experiência de onboarding com a Bravvius?`) +
    `\n\nResponda aqui 👉 ${link}\n\nLeva menos de 1 minuto! 🙏`;

  const base = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}`
    : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(message)}`;
};

export const buildMailtoUrl = (link, customerName, type) => {
  const subject =
    type === 'nps'
      ? 'Pesquisa de satisfação — Bravvius'
      : 'Pesquisa de experiência — Onboarding Bravvius';
  const body =
    `Olá, ${customerName}!\n\n` +
    (type === 'nps'
      ? `Gostaríamos de saber: em uma escala de 0 a 10, qual a probabilidade de você recomendar a Bravvius a um colega ou parceiro de negócios?`
      : `Como você avaliaria sua experiência de onboarding com a Bravvius?`) +
    `\n\nClique no link abaixo para responder (leva menos de 1 minuto):\n${link}\n\nObrigado!\nEquipe Bravvius`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
