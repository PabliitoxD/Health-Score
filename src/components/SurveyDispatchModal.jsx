import React, { useState, useMemo } from 'react';
import { X, Copy, Check, MessageCircle, Mail, Link, ChevronDown, ChevronUp } from 'lucide-react';
import { generateToken, saveSurvey, buildSurveyUrl, buildWhatsAppUrl, buildMailtoUrl } from '../utils/surveyStorage';
import { SURVEY_META } from '../utils/surveyEligibility';
import GlassCard from './ui/GlassCard';

const CustomerRow = ({ customer, type }) => {
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  const { token, link } = useMemo(() => {
    const t = generateToken();
    return { token: t, link: buildSurveyUrl(t, type, customer.id, customer.name) };
  }, [customer.id, type]);

  const ensureSaved = async () => {
    if (!saved) {
      await saveSurvey({
        token,
        type,
        customerId: customer.id,
        customerName: customer.name,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
    }
  };

  // window.open/clipboard disparam antes do await pra nao perder o gesto do
  // usuario (depois de um await, alguns navegadores bloqueiam o popup).
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    ensureSaved();
  };

  const handleWhatsApp = () => {
    window.open(buildWhatsAppUrl(link, customer.name, type, phone), '_blank');
    ensureSaved();
  };

  const handleEmail = () => {
    window.open(buildMailtoUrl(link, customer.name, type), '_self');
    ensureSaved();
  };

  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{customer.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Score: {customer.score} · Último login: há {customer.lastLoginDays}d
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Enviado
            </span>
          )}
          {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-50 dark:border-slate-800 pt-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp (ex: 5511999999999) — opcional"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <Link size={12} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">{link}</p>
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-2 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              onClick={handleEmail}
              className="flex items-center justify-center gap-2 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Mail size={14} /> E-mail
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SurveyDispatchModal = ({ type, customers, onClose }) => {
  const meta = SURVEY_META[type];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard variant="strong" className="shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Disparar {meta.label}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {customers.length} cliente{customers.length !== 1 ? 's' : ''} elegíve{customers.length !== 1 ? 'is' : 'l'}
              {' '}· Expanda para gerar e enviar cada link
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-3 flex-1">
          {customers.map((c) => (
            <CustomerRow key={c.id} customer={c} type={type} />
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default SurveyDispatchModal;
