'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Coffee, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { RANGES, buildStats, fetchSince } from '@/lib/stats';

const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH');
const STATUS_TONE = { Pending: 'orange', Preparing: 'grey', Completed: 'green' };
const CAT_COLORS = ['#C68642', '#3C2F2F', '#E0B97F', '#8A6A4F', '#B9A58F', '#D9CDBD'];
const TOOLTIP_BOX = { borderRadius: 8, border: '1px solid #E6E6E6', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };

// Supabase returns at most 1,000 rows per request, so page through the results
async function fetchAllOrders(sinceISO) {
  const all = [], size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from('orders')
      .select('id,customer_name,drink_name,customizations,total,status,created_at')
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: false })
      .range(from, from + size - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < size) break;
  }
  return all;
}

/* ---------- Small pieces ---------- */
function Delta({ value, suffix = '%' }) {
  if (value === null || value === undefined) return <span className="delta none">—</span>;
  const Icon = value < 0 ? TrendingDown : TrendingUp;
  const tone = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return <span className={`delta ${tone}`}>{value > 0 ? '+' : ''}{value}{suffix} <Icon size={12} /></span>;
}

function MiniCard({ icon: Icon, color, title, sub }) {
  return (
    <div className="card mini">
      <span className="mini-icon" style={{ background: color }}><Icon size={18} /></span>
      <div className="mini-text"><b>{title}</b><span>{sub}</span></div>
    </div>
  );
}

// Tiny trend chart for a KPI card. Empty buckets are skipped (null) so lines stay smooth.
function Spark({ data, dataKey, id, kind = 'area', format = String }) {
  if (!data || data.length === 0) return <div className="spark" />;
  const tip = ({ active, payload }) =>
    active && payload?.length && payload[0].value != null ? <div className="spark-tip">{payload[0].payload.label} · {format(payload[0].value)}</div> : null;
  const domain = [(min) => Math.max(0, Math.floor(min * 0.8)), (max) => Math.ceil(max * 1.06) || 1];
  return (
    <div className="spark">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'bar' ? (
          <BarChart data={data} margin={{ top: 6, right: 10, left: 10, bottom: 0 }} barCategoryGap={2}>
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip cursor={{ fill: 'rgba(198,134,66,.12)' }} content={tip} position={{ y: 0 }} isAnimationActive={false} />
            <Bar dataKey={dataKey} fill="#C68642" radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : kind === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
            <YAxis hide domain={domain} />
            <Tooltip cursor={{ stroke: '#3C2F2F', strokeOpacity: .25 }} content={tip} position={{ y: 0 }} isAnimationActive={false} />
            <Line type="monotone" dataKey={dataKey} stroke="#3C2F2F" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 3.5, fill: '#3C2F2F', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C68642" stopOpacity={0.4} /><stop offset="100%" stopColor="#C68642" stopOpacity={0.04} /></linearGradient></defs>
            <YAxis hide domain={domain} />
            <Tooltip cursor={{ stroke: '#C68642', strokeDasharray: '3 3' }} content={tip} position={{ y: 0 }} isAnimationActive={false} />
            <Area type="monotone" dataKey={dataKey} stroke="#C68642" strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 3.5, fill: '#C68642', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function DrinkDonut({ sales }) {
  const [hi, setHi] = useState(null);
  const total = sales.reduce((s, d) => s + d.value, 0);
  const active = hi === null ? null : sales[hi];
  if (!total) return <div className="dsub" style={{ padding: '40px 0', textAlign: 'center' }}>No sales in this period</div>;
  return (
    <>
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sales} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}
              onMouseEnter={(_, i) => setHi(i)} onMouseLeave={() => setHi(null)}>
              {sales.map((d, i) => <Cell key={d.name} fill={d.color} fillOpacity={hi === null || hi === i ? 1 : 0.4} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <div>
            <b>{(active ? active.value : total).toLocaleString('en-PH')}</b>
            <span>{active ? `${active.name} · ${Math.round((active.value / total) * 100)}%` : 'orders'}</span>
          </div>
        </div>
      </div>
      <ul className="dlegend">
        {sales.map((d, i) => (
          <li key={d.name} className={hi === i ? 'on' : ''} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
            <span><i className="dot" style={{ background: d.color }} />{d.name}</span><em>{Math.round((d.value / total) * 100)}%</em>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- Page ---------- */
export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('30d');
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [now, setNow] = useState(null); // set after the data loads, in the browser only

  useEffect(() => {
    async function load() {
      try {
        const [allOrders, invRes, menuRes] = await Promise.all([
          fetchAllOrders(fetchSince(new Date())),
          supabase.from('inventory').select('*'),
          supabase.from('menu_items').select('*'),
        ]);
        setOrders(allOrders);
        setInventory(invRes.data || []);
        setMenuItems(menuRes.data || []);
      } catch (e) {
        setError('Could not load data. ' + (e.message || ''));
      }
      setNow(new Date());
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => (now ? buildStats(orders, menuItems, range, now) : null), [orders, menuItems, range, now]);

  // Live numbers (not tied to the selected range)
  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const preparingCount = orders.filter((o) => o.status === 'Preparing').length;
  const outAll = inventory.filter((i) => !i.is_in_stock).map((i) => i.label);
  const activeMenu = menuItems.filter((m) => m.is_available).length;
  const latest = orders.slice(0, 5);

  const stockData = useMemo(() => {
    const groups = { milk: { group: 'Milks', total: 0, out: 0 }, syrup: { group: 'Syrups', total: 0, out: 0 }, topping: { group: 'Toppings', total: 0, out: 0 } };
    inventory.forEach((i) => {
      const g = groups[String(i.category || '').toLowerCase().replace(/s$/, '')];
      if (g) { g.total += 1; if (!i.is_in_stock) g.out += 1; }
    });
    return Object.values(groups).filter((g) => g.total > 0);
  }, [inventory]);

  if (loading || !stats) return <div className="dash"><div className="c12 card dpad dsub">Loading dashboard…</div></div>;
  const { current: cur, deltas, series, categories, sales } = stats;

  const periodLabel = range === 'today' ? 'Today' : `Last ${stats.days} days`;

  return (
    <div className="dash">
      <div className="c12 dhead">
        <div><p className="deyebrow">Overview</p><h2>{periodLabel} at BrewHaven</h2></div>
        <div className="dactions">
          <div className="seg" role="group" aria-label="Time range">
            {Object.entries(RANGES).map(([key, r]) => (
              <button key={key} className={range === key ? 'on' : ''} onClick={() => setRange(key)}>{r.label}</button>
            ))}
          </div>
          <Link href="/orders" className="dbtn">Live orders</Link>
          <Link href="/menu" className="dbtn primary"><Plus size={15} /> Manage menu</Link>
        </div>
      </div>

      {error && <div className="c12 kb-error">{error}</div>}

      <div className="c3 card dpad stat">
        <p className="dlabel">Revenue · {periodLabel}</p>
        <div className="stat-row"><span className="dvalue">{peso(cur.revenue)}</span><Delta value={deltas.revenue} /></div>
        <Spark data={series} dataKey="revenue" id="sp-rev" format={peso} />
      </div>
      <div className="c3 card dpad stat">
        <p className="dlabel">Orders · {periodLabel}</p>
        <div className="stat-row"><span className="dvalue">{cur.orders.toLocaleString('en-PH')}</span><Delta value={deltas.orders} /></div>
        <Spark data={series} dataKey="orders" kind="bar" format={(v) => `${v} orders`} />
      </div>
      <div className="c3 card dpad stat">
        <p className="dlabel">Avg. order value</p>
        <div className="stat-row"><span className="dvalue">{peso(cur.aov)}</span><Delta value={deltas.aov} /></div>
        <Spark data={series} dataKey="aov" kind="line" format={peso} />
      </div>
      <div className="c3 card dpad stat">
        <p className="dlabel">Completion rate</p>
        <div className="stat-row"><span className="dvalue">{cur.rate}%</span><Delta value={deltas.rate} suffix=" pts" /></div>
        <div className="rate-bar">
          <div className="rate-meta"><span>{cur.completed.toLocaleString('en-PH')} of {cur.orders.toLocaleString('en-PH')} orders completed</span></div>
          <div className="track"><div className="fill" style={{ width: `${cur.rate}%` }} /></div>
        </div>
      </div>

      <div className="c3"><MiniCard icon={Clock} color="#C2410C" title={`${pendingCount} Pending`} sub="waiting to start" /></div>
      <div className="c3"><MiniCard icon={Coffee} color="#3C2F2F" title={`${preparingCount} Preparing`} sub="in the queue" /></div>
      <div className="c3"><MiniCard icon={CheckCircle2} color="#16A34A" title={`${cur.completed.toLocaleString('en-PH')} Completed`} sub={`${peso(cur.revenue)} earned`} /></div>
      <div className="c3"><MiniCard icon={AlertTriangle} color="#B91C1C" title={`${outAll.length} Out of stock`} sub={outAll.join(', ') || 'All ingredients in stock'} /></div>

      <div className="c8 card dpad chart-card">
        <div className="dcard-head">
          <p className="dtitle">{range === 'today' ? 'Orders by hour' : 'Orders by day'}</p>
          <div className="legend">
            {categories.map((c, i) => <span key={c}><i style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />{c}</span>)}
          </div>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} tick={{ fill: '#6A6A6A', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#6A6A6A', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(198,134,66,.1)' }} contentStyle={TOOLTIP_BOX} />
              {categories.map((c, i) => (
                <Bar key={c} dataKey={c} stackId="a" fill={CAT_COLORS[i % CAT_COLORS.length]} radius={i === categories.length - 1 ? [3, 3, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="c4 card dpad chart-card">
        <div className="dcard-head"><p className="dtitle">Drink sales</p><span className="dsub">{periodLabel}</span></div>
        <DrinkDonut sales={sales} />
      </div>

      <div className="c8 card dpad">
        <div className="dcard-head"><p className="dtitle">Latest orders</p><Link href="/orders" className="dlink">View all</Link></div>
        <div className="table-scroll">
          <table className="dtable">
            <thead><tr><th>Customer</th><th>Customization</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {latest.map((o) => {
                const tags = [o.drink_name, ...(o.customizations || [])];
                return (
                  <tr key={o.id}>
                    <td className="who"><b>{o.customer_name}</b><span>BH-{String(o.id).split('-')[0].toUpperCase()}</span></td>
                    <td>
                      <div className="tags">
                        {tags.slice(0, 3).map((t, i) => <span key={`${t}-${i}`} className={`tag ${i === 0 ? 'drink' : ''}`}>{t}</span>)}
                        {tags.length > 3 && <span className="tag">+{tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="font-display" style={{ fontWeight: 500 }}>{peso(o.total)}</td>
                    <td><span className={`pill ${STATUS_TONE[o.status]}`}>{o.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="c4 card dpad">
        <div className="dcard-head"><p className="dtitle">Stock status</p><Link href="/inventory" className="dlink">Manage</Link></div>
        {stockData.map((g) => {
          const inStock = g.total - g.out;
          return (
            <div key={g.group} className="stock-row">
              <div className="rate-meta"><span>{g.group}</span><span className="dsub">{inStock} of {g.total} in stock</span></div>
              <div className="track"><div className="fill" style={{ width: `${(inStock / g.total) * 100}%` }} /><div style={{ flex: 1, background: '#F6C9C4' }} /></div>
            </div>
          );
        })}
        <div className="stock-row" style={{ marginBottom: 0 }}>
          <div className="rate-meta"><span>Menu availability</span><span className="dsub">{activeMenu} of {menuItems.length} drinks</span></div>
          <div className="track"><div className="fill" style={{ width: `${menuItems.length ? (activeMenu / menuItems.length) * 100 : 0}%`, background: '#3C2F2F' }} /></div>
        </div>
        {outAll.length > 0 && <div className="stock-pills" style={{ marginTop: 10 }}>{outAll.map((n) => <span key={n} className="pill red">{n} · out</span>)}</div>}
        {!stockData.length && <p className="dsub" style={{ marginTop: 8 }}>No ingredients in the inventory table yet.</p>}
      </div>
    </div>
  );
}