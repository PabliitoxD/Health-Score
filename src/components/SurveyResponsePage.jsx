import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { getResponseByToken, saveResponse } from '../utils/surveyStorage';

// ─── NPS ────────────────────────────────────────────────────────────────────

const NPS_HOVER = (n) => {
  if (n <= 6) return 'bg-rose-50 hover:bg-rose-500 border-rose-200 hover:border-rose-500 hover:text-white';
  if (n <= 8) return 'bg-amber-50 hover:bg-amber-400 border-amber-200 hover:border-amber-400 hover:text-white';
  return 'bg-emerald-50 hover:bg-emerald-500 border-emerald-200 hover:border-emerald-500 hover:text-white';
};
const NPS_ACTIVE = (n) => {
  if (n <= 6) return 'bg-rose-500 border-rose-500 text-white';
  if (n <= 8) return 'bg-amber-400 border-amber-400 text-white';
  return 'bg-emerald-500 border-emerald-500 text-white';
};

const NpsForm = ({ score, setScore }) => (
  <>
    <h2 className="text-lg font-bold text-slate-900 mb-1">
      Em uma escala de 0 a 10, qual a probabilidade de você recomendar a Bravvius a um colega ou parceiro de negócios?
    </h2>
    <p className="text-slate-400 text-xs mb-6">0 = muito improvável · 10 = extremamente provável</p>
    <div className="grid grid-cols-11 gap-1 mb-2">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          onClick={() => setScore(i)}
          className={`aspect-square rounded-lg border text-sm font-bold transition-all ${
            score === i ? NPS_ACTIVE(i) : NPS_HOVER(i)
          }`}
        >
          {i}
        </button>
      ))}
    </div>
    <div className="flex justify-between text-[10px] text-slate-400 mb-6">
      <span>Improvável</span>
      <span>Provável</span>
    </div>
  </>
);

// ─── CSAT Health ─────────────────────────────────────────────────────────────

const CSAT_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Muito Insatisfeito' },
  { value: 2, emoji: '😕', label: 'Insatisfeito' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 4, emoji: '😊', label: 'Satisfeito' },
  { value: 5, emoji: '😄', label: 'Muito Satisfeito' },
];

const CsatHealthForm = ({ score, setScore }) => (
  <>
    <h2 className="text-lg font-bold text-slate-900 mb-6">
      Como você avalia sua experiência atual com a Bravvius?
    </h2>
    <div className="flex justify-between gap-2 mb-6">
      {CSAT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setScore(opt.value)}
          className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
            score === opt.value
              ? 'border-blue-600 bg-blue-50'
              : 'border-slate-100 hover:border-slate-300 bg-white'
          }`}
        >
          <span className="text-2xl">{opt.emoji}</span>
          <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{opt.label}</span>
        </button>
      ))}
    </div>
  </>
);

// ─── CSAT Onboarding ─────────────────────────────────────────────────────────

const ONBOARDING_CATEGORIES = [
  { key: 'sistema', label: 'Sistema (geral)' },
  { key: 'cadastro', label: 'Cadastro de produto' },
  { key: 'integracao', label: 'Integração com adquirente' },
  { key: 'ofertas', label: 'Criação de ofertas de venda' },
  { key: 'checkout', label: 'Personalização do checkout' },
  { key: 'membros', label: 'Configuração da área de membros' },
  { key: 'webhook', label: 'Integrações Webhook' },
];

const CategoryRating = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-sm text-slate-700 flex-1">{label}</span>
    <div className="flex gap-1.5 flex-shrink-0">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all ${
            value === n
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

const CsatOnboardingForm = ({ scores, setScores }) => {
  const remaining = ONBOARDING_CATEGORIES.length - Object.keys(scores).length;
  return (
    <>
      <h2 className="text-lg font-bold text-slate-900 mb-1">
        Avalie sua experiência de onboarding com a Bravvius
      </h2>
      <p className="text-slate-400 text-xs mb-5">
        Avalie cada área de 1 (muito ruim) a 5 (excelente)
        {remaining > 0 && (
          <span className="ml-2 text-amber-500 font-medium">
            · {remaining} pendente{remaining !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="bg-slate-50 rounded-xl px-4 py-1 mb-6">
        {ONBOARDING_CATEGORIES.map((cat) => (
          <CategoryRating
            key={cat.key}
            label={cat.label}
            value={scores[cat.key] || null}
            onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
          />
        ))}
      </div>
    </>
  );
};

// ─── CSAT NPS Follow ─────────────────────────────────────────────────────────

const FOLLOW_CATEGORIES = [
  { key: 'suporte', label: 'Suporte ao cliente' },
  { key: 'usabilidade', label: 'Facilidade de uso da plataforma' },
  { key: 'integracoes', label: 'Integrações disponíveis' },
];

const CsatNpsFollowForm = ({ scores, setScores, feedback, setFeedback }) => {
  const remaining = FOLLOW_CATEGORIES.length - Object.keys(scores).length;
  return (
    <>
      <h2 className="text-lg font-bold text-slate-900 mb-1">
        Nos ajude a entender melhor sua experiência
      </h2>
      <p className="text-slate-400 text-xs mb-5">
        Sua avaliação recente nos motivou a entender onde podemos melhorar.
        {remaining > 0 && (
          <span className="ml-2 text-amber-500 font-medium">
            · {remaining} pendente{remaining !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="bg-slate-50 rounded-xl px-4 py-1 mb-5">
        {FOLLOW_CATEGORIES.map((cat) => (
          <CategoryRating
            key={cat.key}
            label={cat.label}
            value={scores[cat.key] || null}
            onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
          />
        ))}
      </div>
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          O que podemos fazer para melhorar sua experiência?
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          placeholder="Conte-nos o que não está funcionando como esperado..."
          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-700 placeholder-slate-300"
        />
      </div>
    </>
  );
};

// ─── Thank You ────────────────────────────────────────────────────────────────

const ThankYou = ({ type, score }) => (
  <div className="text-center py-8">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
      <CheckCircle2 size={32} className="text-blue-600" />
    </div>
    <h2 className="text-xl font-bold text-slate-900 mb-2">Obrigado pelo feedback!</h2>
    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
      Sua opinião é muito importante para nós e nos ajuda a melhorar continuamente a sua experiência.
    </p>
    {score != null && (
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
        <span className="text-xs text-slate-500 font-medium">
          {type === 'nps' ? 'Sua nota:' : 'Média geral:'}
        </span>
        <span className="text-lg font-bold text-slate-900">
          {score}{type === 'nps' ? '/10' : '/5'}
        </span>
      </div>
    )}
    <p className="mt-5 text-xs text-slate-400">Você já pode fechar esta aba.</p>
  </div>
);

// ─── Type meta ────────────────────────────────────────────────────────────────

const TYPE_LABEL = {
  nps: 'Pesquisa NPS',
  csat_health: 'Pesquisa CSAT',
  csat_onboarding: 'CSAT — Onboarding',
  csat_nps_follow: 'CSAT — Follow-up NPS',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const SurveyResponsePage = () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('survey');
  const token = params.get('token');
  const customerId = params.get('cid');
  const customerName = params.get('cname') || 'Cliente';

  const [score, setScore] = useState(null);
  const [categoryScores, setCategoryScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);

  useEffect(() => {
    if (token && getResponseByToken(token)) setAlreadyAnswered(true);
  }, [token]);

  const isMultiCategory = type === 'csat_onboarding' || type === 'csat_nps_follow';
  const requiredCount = type === 'csat_onboarding' ? ONBOARDING_CATEGORIES.length : FOLLOW_CATEGORIES.length;
  const canSubmit = isMultiCategory
    ? Object.keys(categoryScores).length === requiredCount
    : score !== null;

  const computeFinalScore = () => {
    if (!isMultiCategory) return score;
    const vals = Object.values(categoryScores);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const finalScore = computeFinalScore();
    saveResponse({
      token,
      customerId: Number(customerId),
      type,
      score: finalScore,
      ...(isMultiCategory && { scores: categoryScores }),
      ...(type === 'csat_nps_follow' && { feedback }),
      comment,
      respondedAt: new Date().toISOString(),
    });
    const stored = JSON.parse(localStorage.getItem('hs_surveys') || '[]');
    localStorage.setItem(
      'hs_surveys',
      JSON.stringify(stored.map((s) => (s.token === token ? { ...s, status: 'responded', score: finalScore } : s)))
    );
    setSubmitted(true);
  };

  if (!type || !token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
          <p className="text-slate-500 text-sm">Link de pesquisa inválido.</p>
        </div>
      </div>
    );
  }

  const finalScore = submitted ? computeFinalScore() : null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-lg overflow-hidden">

        {/* Brand header */}
        <div className="bg-slate-900 px-8 py-5 flex items-center gap-3">
          <img
            src="https://www.bravvius.com/wp-content/uploads/2025/12/bravvius_original-1024x270.png"
            alt="Bravvius"
            className="h-6 w-auto object-contain brightness-0 invert"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="hidden">
            <p className="text-white text-sm font-bold">Bravvius</p>
            <p className="text-slate-400 text-xs">Customer Success</p>
          </div>
          <span className={`ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            type === 'nps'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-slate-500/20 text-slate-300'
          }`}>
            {TYPE_LABEL[type] || 'Pesquisa'}
          </span>
        </div>

        <div className="p-8">
          {submitted || alreadyAnswered ? (
            alreadyAnswered && !submitted ? (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">Você já respondeu esta pesquisa. Obrigado!</p>
              </div>
            ) : (
              <ThankYou type={type} score={finalScore} />
            )
          ) : (
            <>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Olá, {customerName} 👋
              </p>

              {type === 'nps' && <NpsForm score={score} setScore={setScore} />}
              {type === 'csat_health' && <CsatHealthForm score={score} setScore={setScore} />}
              {type === 'csat_onboarding' && (
                <CsatOnboardingForm scores={categoryScores} setScores={setCategoryScores} />
              )}
              {type === 'csat_nps_follow' && (
                <CsatNpsFollowForm
                  scores={categoryScores}
                  setScores={setCategoryScores}
                  feedback={feedback}
                  setFeedback={setFeedback}
                />
              )}

              {type !== 'csat_nps_follow' && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Comentário <span className="font-normal normal-case">(opcional)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Compartilhe mais sobre sua experiência..."
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-700 placeholder-slate-300"
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Enviar resposta
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-4">
                <ShieldCheck size={12} className="text-slate-300" />
                <p className="text-[10px] text-slate-400">Suas respostas são confidenciais</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyResponsePage;
