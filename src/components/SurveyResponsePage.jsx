import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { getSurveyByToken, getResponseByToken, saveResponse } from '../utils/surveyStorage';

const NPS_COLORS = (n) => {
  if (n <= 6) return 'bg-rose-100 hover:bg-rose-500 border-rose-200 hover:border-rose-500 hover:text-white';
  if (n <= 8) return 'bg-amber-50 hover:bg-amber-400 border-amber-200 hover:border-amber-400 hover:text-white';
  return 'bg-emerald-50 hover:bg-emerald-500 border-emerald-200 hover:border-emerald-500 hover:text-white';
};

const NPS_SELECTED = (n) => {
  if (n <= 6) return 'bg-rose-500 border-rose-500 text-white';
  if (n <= 8) return 'bg-amber-400 border-amber-400 text-white';
  return 'bg-emerald-500 border-emerald-500 text-white';
};

const CSAT_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Muito Insatisfeito' },
  { value: 2, emoji: '😕', label: 'Insatisfeito' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 4, emoji: '😊', label: 'Satisfeito' },
  { value: 5, emoji: '😄', label: 'Muito Satisfeito' },
];

const ThankYou = ({ type, score }) => (
  <div className="text-center py-8">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
      <CheckCircle2 size={32} className="text-emerald-600" />
    </div>
    <h2 className="text-xl font-bold text-slate-900 mb-2">Obrigado pelo feedback!</h2>
    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
      Sua opinião é muito importante para nós. Ela nos ajuda a melhorar continuamente a sua experiência.
    </p>
    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
      <span className="text-xs text-slate-500 font-medium">Sua nota:</span>
      <span className="text-lg font-bold text-slate-900">
        {type === 'nps' ? `${score}/10` : `${score}/5`}
      </span>
    </div>
  </div>
);

const SurveyResponsePage = () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('survey');
  const token = params.get('token');
  const customerId = params.get('cid');
  const customerName = params.get('cname') || 'Cliente';

  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);

  useEffect(() => {
    if (token && getResponseByToken(token)) {
      setAlreadyAnswered(true);
    }
  }, [token]);

  const handleSubmit = () => {
    if (score === null) return;
    saveResponse({
      token,
      customerId: Number(customerId),
      type,
      score,
      comment,
      respondedAt: new Date().toISOString(),
    });
    // mark the survey as responded
    const surveys = JSON.parse(localStorage.getItem('hs_surveys') || '[]');
    const updated = surveys.map((s) =>
      s.token === token ? { ...s, status: 'responded', score } : s
    );
    localStorage.setItem('hs_surveys', JSON.stringify(updated));
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-lg overflow-hidden">
        {/* Brand header */}
        <div className="bg-slate-900 px-8 py-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">HS</span>
          </div>
          <div>
            <p className="text-white text-sm font-bold">Bravvius</p>
            <p className="text-slate-400 text-xs">Customer Success</p>
          </div>
          <span className={`ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            type === 'nps' ? 'bg-blue-500/20 text-blue-300' : 'bg-violet-500/20 text-violet-300'
          }`}>
            {type === 'nps' ? 'Pesquisa NPS' : 'Pesquisa CSAT'}
          </span>
        </div>

        <div className="p-8">
          {submitted || alreadyAnswered ? (
            alreadyAnswered && !submitted ? (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">Você já respondeu esta pesquisa. Obrigado!</p>
              </div>
            ) : (
              <ThankYou type={type} score={score} />
            )
          ) : (
            <>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Olá, {customerName} 👋
              </p>

              {type === 'nps' ? (
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
                          score === i ? NPS_SELECTED(i) : NPS_COLORS(i)
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
              ) : (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-6">
                    Como você avaliaria sua experiência de onboarding com a Bravvius?
                  </h2>
                  <div className="flex justify-between gap-2 mb-6">
                    {CSAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setScore(opt.value)}
                        className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          score === opt.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-100 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Comentário (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Compartilhe mais sobre sua experiência..."
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-700 placeholder-slate-300"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={score === null}
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
