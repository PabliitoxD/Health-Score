const daysSince = (isoStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoStr.includes('T') ? isoStr : isoStr + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  return Math.floor((today - d) / 86400000);
};

const latestOfType = (custSurveys, type) =>
  ((custSurveys[type] || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))[0] || null;

export const getEligibleCustomers = (customers, surveys, responses) => {
  const byCust = {};
  surveys.forEach((s) => {
    if (!byCust[s.customerId]) byCust[s.customerId] = {};
    if (!byCust[s.customerId][s.type]) byCust[s.customerId][s.type] = [];
    byCust[s.customerId][s.type].push(s);
  });

  const byToken = {};
  responses.forEach((r) => { byToken[r.token] = r; });

  const eligible = { nps: [], csat_onboarding: [], csat_health: [], csat_nps_follow: [] };

  customers.forEach((c) => {
    const cs = byCust[c.id] || {};
    const age = daysSince(c.joinDate);
    const paid = c.mrr > 0;

    // NPS: trial (7d) + 30d = 37d desde joinDate, plano pago, nunca enviado
    if (paid && age >= 37 && !latestOfType(cs, 'nps')) {
      eligible.nps.push(c);
    }

    // CSAT Onboarding: trial encerrado (7d), plano pago, nunca enviado
    if (paid && age >= 7 && !latestOfType(cs, 'csat_onboarding')) {
      eligible.csat_onboarding.push(c);
    }

    // CSAT Health: score < 70 e último login > 7d, cooldown 30d
    if (c.score < 70 && c.lastLoginDays > 7) {
      const last = latestOfType(cs, 'csat_health');
      if (!last || daysSince(last.createdAt) >= 30) {
        eligible.csat_health.push(c);
      }
    }

    // CSAT NPS Follow: NPS respondido com nota ≤ 6 e sem follow-up enviado
    const hasDetractor = (cs['nps'] || []).some((s) => byToken[s.token]?.score <= 6);
    if (hasDetractor && !latestOfType(cs, 'csat_nps_follow')) {
      eligible.csat_nps_follow.push(c);
    }
  });

  return eligible;
};

export const SURVEY_META = {
  nps: {
    label: 'NPS',
    description: '30 dias após encerramento do trial com plano ativo',
    color: 'blue',
    badgeCls: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    btnCls: 'bg-blue-600 hover:bg-blue-500 text-white',
    borderCls: 'border-blue-200 dark:border-blue-500/20',
    iconBg: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  csat_onboarding: {
    label: 'CSAT Onboarding',
    description: 'Encerramento do trial com plano ativo',
    color: 'violet',
    badgeCls: 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
    btnCls: 'bg-violet-600 hover:bg-violet-500 text-white',
    borderCls: 'border-violet-200 dark:border-violet-500/20',
    iconBg: 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  csat_health: {
    label: 'CSAT Health',
    description: 'Health Score < 70 e último login > 7 dias',
    color: 'amber',
    badgeCls: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    btnCls: 'bg-amber-500 hover:bg-amber-400 text-white',
    borderCls: 'border-amber-200 dark:border-amber-500/20',
    iconBg: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  csat_nps_follow: {
    label: 'CSAT Follow NPS',
    description: 'Detrator NPS (nota ≤ 6) sem follow-up enviado',
    color: 'rose',
    badgeCls: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
    btnCls: 'bg-rose-600 hover:bg-rose-500 text-white',
    borderCls: 'border-rose-200 dark:border-rose-500/20',
    iconBg: 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
};
