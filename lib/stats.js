// Pure helpers for the Overview page: ranges, previous-period deltas, time buckets, drink sales.
// `now` is always passed in (never read here) so Next.js doesn't freeze the current time during prerender.
export const DAY = 86400000;
export const MAX_DAYS = 30;
export const RANGES = {
  today: { label: 'Today', days: 1 },
  '7d': { label: '7 days', days: 7 },
  '30d': { label: '30 days', days: 30 },
};

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

// How far back to fetch: the longest range plus an equally long "previous period" for the deltas.
export const fetchSince = (now) => new Date(startOfDay(now).getTime() - (2 * MAX_DAYS - 1) * DAY).toISOString();

function summarize(list) {
  const done = list.filter((o) => o.status === 'Completed');
  const revenue = done.reduce((s, o) => s + Number(o.total || 0), 0);
  return {
    orders: list.length,
    completed: done.length,
    revenue,
    aov: done.length ? Math.round(revenue / done.length) : 0,
    rate: list.length ? Math.round((done.length / list.length) * 100) : 0,
  };
}

export function buildStats(orders, menuItems, range, now) {
  const { days } = RANGES[range];
  const start = new Date(startOfDay(now).getTime() - (days - 1) * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  const t = (o) => new Date(o.created_at).getTime();

  const cur = orders.filter((o) => t(o) >= start.getTime());
  const prevAll = orders.filter((o) => t(o) >= prevStart.getTime() && t(o) < start.getTime());
  // "Today" is compared with yesterday up to the same time of day
  const prev = days === 1 ? prevAll.filter((o) => t(o) <= now.getTime() - DAY) : prevAll;
  const a = summarize(cur), b = summarize(prev);
  const deltas = {
    revenue: pct(a.revenue, b.revenue),
    orders: pct(a.orders, b.orders),
    aov: pct(a.aov, b.aov),
    rate: b.orders ? a.rate - b.rate : null,
  };

  // Buckets: hours 7a-8p for "today", otherwise one per day
  const catOf = Object.fromEntries(menuItems.map((m) => [m.name, m.category || 'Other']));
  const catSet = [...new Set(menuItems.map((m) => m.category).filter(Boolean))];
  const buckets = days === 1
    ? Array.from({ length: 14 }, (_, i) => { const h = 7 + i; return { label: `${h % 12 || 12}${h >= 12 ? 'p' : 'a'}` }; })
    : Array.from({ length: days }, (_, i) => ({ label: new Date(start.getTime() + i * DAY).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) }));
  buckets.forEach((b2) => { b2.orders = 0; b2.revenue = 0; b2.completed = 0; b2.Other = 0; catSet.forEach((c) => { b2[c] = 0; }); });

  let hasOther = false;
  cur.forEach((o) => {
    const d = new Date(o.created_at);
    const i = days === 1 ? Math.min(13, Math.max(0, d.getHours() - 7)) : Math.floor((startOfDay(d).getTime() - start.getTime()) / DAY);
    if (i < 0 || i >= buckets.length) return;
    const bk = buckets[i];
    bk.orders += 1;
    if (o.status === 'Completed') { bk.revenue += Number(o.total || 0); bk.completed += 1; }
    const c = catOf[o.drink_name] || 'Other';
    bk[c] = (bk[c] || 0) + 1;
    if (c === 'Other') hasOther = true;
  });
  buckets.forEach((b2) => { b2.aov = b2.completed ? Math.round(b2.revenue / b2.completed) : null; });

  // Drink sales: top 5 + "Others"
  const counts = {};
  cur.forEach((o) => { counts[o.drink_name] = (counts[o.drink_name] || 0) + 1; });
  const ranked = Object.entries(counts).sort((x, y) => y[1] - x[1]);
  const colors = ['#C68642', '#3C2F2F', '#8A6A4F', '#E0B97F', '#B9A58F'];
  const sales = ranked.slice(0, 5).map(([name, value], i) => ({ name, value, color: colors[i] }));
  const rest = ranked.slice(5).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) sales.push({ name: 'Others', value: rest, color: '#D9CDBD' });

  return { current: a, deltas, series: buckets, categories: [...catSet, ...(hasOther ? ['Other'] : [])], sales, days };
}