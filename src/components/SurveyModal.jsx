import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageCircle, Mail, Link } from 'lucide-react';
import {
  generateToken, saveSurvey,
  buildSurveyUrl, buildWhatsAppUrl, buildMailtoUrl,
} from '../utils/surveyStorage';

const SurveyModal = ({ type: initialType, customers, onClose }) => {
  const [type, setType] = useState(initialType || 'nps');
  const [customerId, setCustomerId] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));

  useEffect(() => {
    if (customerId && selectedCustomer) {
      const t = generateToken();
      setToken(t);
      setLink(buildSurveyUrl(t, type, customerId, selectedCustomer.name));
      setSaved(false);
    } else {
      setToken('');
      setLink('');
    }
  }, [customerId, type]);

  const ensureSaved = () => {
    if (!saved && token && selectedCustomer) {
      saveSurvey({
        token,
        type,
        customerId: Number(customerId),
        customerName: selectedCustomer.name,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
    }
  };

  const handleCopy = () => {
    ensureSaved();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    ensureSaved();
    window.open(buildWhatsAppUrl(link, selectedCustomer.name, type, phone), '_blank');
  };

  const handleEmail = () => {
    ensureSaved();
    window.open(buildMailtoUrl(link, selectedCustomer.name, type), '_self');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Nova Pesquisa</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Tipo de Pesquisa
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['nps', 'csat'].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    type === t
                      ? t === 'nps'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {t === 'nps' ? 'NPS (0–10)' : 'CSAT (1–5)'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              {type === 'nps'
                ? 'Mede a probabilidade de recomendação. Disparado a cada 90 dias.'
                : 'Mede a satisfação do Onboarding. Disparado no Dia 30.'}
            </p>
          </div>

          {/* Customer selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Cliente
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Selecione um cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Phone (optional) */}
          {customerId && (
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                WhatsApp do cliente <span className="font-normal normal-case">(opcional — ex: 5511999999999)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511999999999"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {/* Generated link */}
          {link && (
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Link gerado
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <Link size={13} className="text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">{link}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                </button>
              </div>
            </div>
          )}

          {/* Send buttons */}
          {link && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Enviar via
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bb5a] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-green-200 dark:shadow-green-900/20"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
                <button
                  onClick={handleEmail}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 dark:shadow-blue-900/20"
                >
                  <Mail size={16} />
                  E-mail
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyModal;
