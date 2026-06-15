import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Menu, X as XIcon } from 'lucide-react';
import { getResponseByToken, saveResponse } from '../utils/surveyStorage';

// ─── Brand constants ────────────────────────────────────────────────────────

const LOGO_URL = 'https://www.bravvius.com/wp-content/uploads/2025/12/bravvius_original-1024x270.png';
const BRAND_ORANGE = '#FF5C00';

const NAV_LINKS = [
  { label: 'Soluções', href: 'https://www.bravvius.com/#solucoes' },
  { label: 'Planos', href: 'https://www.bravvius.com/planos/' },
  { label: 'Blog', href: 'https://www.bravvius.com/blog/' },
  { label: 'Sobre Nós', href: 'https://www.bravvius.com/sobre/' },
  { label: 'Suporte', href: 'https://www.bravvius.com/suporte/' },
];

// ─── Header ─────────────────────────────────────────────────────────────────

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="https://www.bravvius.com" target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
          <img
            src={LOGO_URL}
            alt="Bravvius"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span style={{ display: 'none' }} className="text-xl font-bold text-gray-900">Bravvius</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://app.bravvius.com/Login/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Login
          </a>
          <a
            href="https://app.bravvius.com/Register/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: BRAND_ORANGE }}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Começar grátis
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2 text-gray-500" onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? <XIcon size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-3">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-gray-600 font-medium py-1"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://app.bravvius.com/Login/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: BRAND_ORANGE }}
            className="block text-center px-4 py-2 rounded-lg text-sm font-semibold text-white mt-2"
          >
            Login
          </a>
        </div>
      )}
    </header>
  );
};

// ─── Footer ─────────────────────────────────────────────────────────────────

const Footer = () => (
  <footer className="bg-white border-t border-gray-100 mt-12">
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <img src={LOGO_URL} alt="Bravvius" className="h-5 w-auto opacity-60" />
      <p className="text-xs text-gray-400">
        © {new Date().getFullYear()} Bravvius. Todos os direitos reservados.
      </p>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <ShieldCheck size={12} />
        <span>Suas respostas são confidenciais</span>
      </div>
    </div>
  </footer>
);

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
    <h2 className="text-xl font-bold text-gray-900 mb-1">
      Em uma escala de 0 a 10, qual a probabilidade de você recomendar a Bravvius a um colega ou parceiro de negócios?
    </h2>
    <p className="text-gray-400 text-sm mb-7">0 = muito improvável · 10 = extremamente provável</p>
    <div className="grid grid-cols-11 gap-1.5 mb-2">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          onClick={() => setScore(i)}
          className={`aspect-square rounded-xl border-2 text-sm font-bold transition-all ${
            score === i ? NPS_ACTIVE(i) : NPS_HOVER(i)
          }`}
        >
          {i}
        </button>
      ))}
    </div>
    <div className="flex justify-between text-xs text-gray-400 mb-8">
      <span>Improvável</span>
      <span>Provável</span>
    </div>
  </>
);

// ─── CSAT Health ────────────────────────────────────────────────────────────

const CSAT_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Muito Insatisfeito' },
  { value: 2, emoji: '😕', label: 'Insatisfeito' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 4, emoji: '😊', label: 'Satisfeito' },
  { value: 5, emoji: '😄', label: 'Muito Satisfeito' },
];

const CsatHealthForm = ({ score, setScore }) => (
  <>
    <h2 className="text-xl font-bold text-gray-900 mb-7">
      Como você avalia sua experiência atual com a Bravvius?
    </h2>
    <div className="flex justify-between gap-3 mb-8">
      {CSAT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setScore(opt.value)}
          className={`flex-1 flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${
            score === opt.value
              ? 'border-orange-400 bg-orange-50 shadow-sm'
              : 'border-gray-100 hover:border-gray-200 bg-white'
          }`}
          style={score === opt.value ? { borderColor: BRAND_ORANGE, backgroundColor: '#FFF5F0' } : {}}
        >
          <span className="text-3xl">{opt.emoji}</span>
          <span className="text-[11px] text-gray-500 font-medium text-center leading-tight">{opt.label}</span>
        </button>
      ))}
    </div>
  </>
);

// ─── CSAT Onboarding ────────────────────────────────────────────────────────

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
  <div className="flex items-center justify-between gap-4 py-3.5 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-700 flex-1 leading-tight">{label}</span>
    <div className="flex gap-2 flex-shrink-0">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={value === n ? { backgroundColor: BRAND_ORANGE, borderColor: BRAND_ORANGE } : {}}
          className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition-all ${
            value === n
              ? 'text-white'
              : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

const CsatOnboardingForm = ({ scores, setScores }) => {
  const rated = Object.keys(scores).length;
  const remaining = ONBOARDING_CATEGORIES.length - rated;
  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        Avalie sua experiência de onboarding com a Bravvius
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Avalie cada área de 1 (muito ruim) a 5 (excelente)
        {remaining > 0 && (
          <span className="ml-2 text-amber-500 font-semibold">
            · {remaining} pendente{remaining !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="bg-gray-50 rounded-2xl px-5 py-1 mb-8">
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

// ─── CSAT NPS Follow ────────────────────────────────────────────────────────

const FOLLOW_CATEGORIES = [
  { key: 'suporte', label: 'Suporte ao cliente' },
  { key: 'usabilidade', label: 'Facilidade de uso da plataforma' },
  { key: 'integracoes', label: 'Integrações disponíveis' },
];

const CsatNpsFollowForm = ({ scores, setScores, feedback, setFeedback }) => {
  const rated = Object.keys(scores).length;
  const remaining = FOLLOW_CATEGORIES.length - rated;
  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        Nos ajude a entender melhor sua experiência
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Sua avaliação recente nos motivou a entender onde podemos melhorar.
        {remaining > 0 && (
          <span className="ml-2 text-amber-500 font-semibold">
            · {remaining} pendente{remaining !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="bg-gray-50 rounded-2xl px-5 py-1 mb-5">
        {FOLLOW_CATEGORIES.map((cat) => (
          <CategoryRating
            key={cat.key}
            label={cat.label}
            value={scores[cat.key] || null}
            onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
          />
        ))}
      </div>
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          O que podemos fazer para melhorar sua experiência?
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder="Conte-nos o que não está funcionando como esperado..."
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 resize-none text-gray-700 placeholder-gray-300 bg-white"
          style={{ '--tw-ring-color': BRAND_ORANGE + '30' }}
        />
      </div>
    </>
  );
};

// ─── Thank You ──────────────────────────────────────────────────────────────

const ThankYou = ({ type, score }) => (
  <div className="text-center py-10">
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
      style={{ backgroundColor: '#FFF5F0' }}>
      <CheckCircle2 size={36} style={{ color: BRAND_ORANGE }} />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-3">Obrigado pelo feedback!</h2>
    <p className="text-gray-500 text-base leading-relaxed max-w-sm mx-auto">
      Sua opinião é muito importante para nós e nos ajuda a melhorar continuamente a sua experiência com a Bravvius.
    </p>
    {score != null && (
      <div className="mt-7 inline-flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-2xl">
        <span className="text-sm text-gray-500 font-medium">
          {type === 'nps' ? 'Sua nota:' : 'Média geral:'}
        </span>
        <span className="text-2xl font-bold text-gray-900">
          {score}{type === 'nps' ? '/10' : '/5'}
        </span>
      </div>
    )}
    <p className="mt-8 text-sm text-gray-400">
      Você já pode fechar esta aba. 👋
    </p>
  </div>
);

// ─── Type meta ───────────────────────────────────────────────────────────────

const TYPE_TAG = {
  nps: 'Pesquisa NPS',
  csat_health: 'Pesquisa de Satisfação',
  csat_onboarding: 'Avaliação de Onboarding',
  csat_nps_follow: 'Pesquisa de Melhoria',
};

// ─── Main ────────────────────────────────────────────────────────────────────

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <p className="text-gray-400 text-sm">Link de pesquisa inválido ou expirado.</p>
        </div>
      </div>
    );
  }

  const finalScore = submitted ? computeFinalScore() : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-xl">
          {/* Survey type badge */}
          <div className="flex justify-center mb-5">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: BRAND_ORANGE }}
            >
              {TYPE_TAG[type] || 'Pesquisa'}
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 sm:p-10">
              {submitted || alreadyAnswered ? (
                alreadyAnswered && !submitted ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#FFF5F0' }}>
                      <CheckCircle2 size={28} style={{ color: BRAND_ORANGE }} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Já recebemos sua resposta!</h2>
                    <p className="text-gray-400 text-sm">Você já respondeu esta pesquisa anteriormente. Obrigado!</p>
                  </div>
                ) : (
                  <ThankYou type={type} score={finalScore} />
                )
              ) : (
                <>
                  {/* Greeting */}
                  <p className="text-sm font-semibold mb-5" style={{ color: BRAND_ORANGE }}>
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
                    <div className="mb-7">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Comentário <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        placeholder="Compartilhe mais sobre sua experiência..."
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 resize-none text-gray-700 placeholder-gray-300 bg-white"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={canSubmit ? { backgroundColor: BRAND_ORANGE } : {}}
                    className="w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-xl transition-opacity hover:opacity-90 text-sm"
                  >
                    Enviar resposta
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SurveyResponsePage;
