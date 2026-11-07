'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Coffee, CheckCircle2, Play, Check, Undo2, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH');
const DONE_LIMIT = 40; // the Completed column only loads the latest orders; older ones stay in the database

const COLUMNS = [
  { status: 'Pending', icon: Clock, accent: '#C2410C', tone: 'orange', empty: 'No new orders', next: 'Preparing', nextLabel: 'Start preparing', nextIcon: Play, nextClass: 'start' },
  { status: 'Preparing', icon: Coffee, accent: '#3C2F2F', tone: 'grey', empty: 'Nothing in the queue', next: 'Completed', nextLabel: 'Mark completed', nextIcon: Check, nextClass: 'finish', back: 'Pending' },
  { status: 'Completed', icon: CheckCircle2, accent: '#16A34A', tone: 'green', empty: 'No completed orders yet', back: 'Preparing' },
];

const orderCode = (id) => 'BH-' + String(id).split('-')[0].toUpperCase();

function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : `${Math.floor(hrs / 24)} d ago`;
}

function OrderCard({ order, col, onMove }) {
  const NextIcon = col.nextIcon;
  const tags = order.customizations || [];
  return (
    <article className="kb-card">
      <div className="kb-top">
        <div>
          <p className="kb-name">{order.customer_name}</p>
          <p className="kb-meta">{orderCode(order.id)} · {timeAgo(order.created_at)}</p>
        </div>
        <p className="kb-total">{peso(order.total)}</p>
      </div>
      <p className="kb-drink">{order.drink_name}</p>
      {tags.length > 0 && (
        <div className="kb-tags">
          {tags.slice(0, 4).map((c, i) => <span key={`${c}-${i}`} className="kb-tag">{c}</span>)}
          {tags.length > 4 && <span className="kb-tag more">+{tags.length - 4}</span>}
        </div>
      )}
      <div className="kb-actions">
        {col.next ? (
          <button className={`kb-btn ${col.nextClass}`} onClick={() => onMove(order, col.next)}><NextIcon size={14} /> {col.nextLabel}</button>
        ) : (
          <div className="kb-done"><Check size={14} /> Done</div>
        )}
        {col.back && (
          <button className="kb-undo" onClick={() => onMove(order, col.back)} aria-label={`Move back to ${col.back}`} title={`Move back to ${col.back}`}><Undo2 size={14} /></button>
        )}
      </div>
    </article>
  );
}

export default function OrdersKanbanPage() {
  const [orders, setOrders] = useState([]);
  const [doneTotal, setDoneTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const [active, done] = await Promise.all([
      supabase.from('orders').select('*').in('status', ['Pending', 'Preparing']).order('created_at', { ascending: true }).limit(500),
      supabase.from('orders').select('*', { count: 'exact' }).eq('status', 'Completed').order('created_at', { ascending: false }).limit(DONE_LIMIT),
    ]);
    const err = active.error || done.error;
    if (err) setError('Could not load orders. ' + err.message);
    else { setOrders([...(active.data || []), ...(done.data || [])]); setDoneTotal(done.count || 0); setError(''); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function moveOrder(order, newStatus) {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
    const { error: err } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (err) { setOrders(previous); setError('Could not update that order. ' + err.message); }
    else setError('');
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => `${o.customer_name} ${o.drink_name} ${orderCode(o.id)}`.toLowerCase().includes(q));
  }, [orders, query]);

  return (
    <div className="kb-page">
      <div className="kb-head">
        <div>
          <p className="kb-eyebrow">Operations</p>
          <h2 className="kb-title">Live orders</h2>
        </div>
        <div className="kb-tools">
          <div className="relative">
            <Search size={15} className="search-icon" />
            <input className="input pl-9" type="search" placeholder="Search customer or drink" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search orders" />
          </div>
          <button className="dbtn" onClick={fetchOrders} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'kb-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="kb-error" role="alert">{error}</div>}

      <div className="kb-board">
        {COLUMNS.map((col) => {
          const list = visible
            .filter((o) => o.status === col.status)
            .sort((a, b) => (col.status === 'Completed' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at)));
          const Icon = col.icon;
          const count = col.status === 'Completed' && !query ? Math.max(doneTotal, list.length) : list.length;
          return (
            <section key={col.status} className="kb-col" style={{ '--accent': col.accent }} aria-label={col.status}>
              <header className="kb-col-head">
                <h3 className="kb-col-title"><Icon size={16} /> {col.status}</h3>
                <span className={`kb-count ${col.tone}`}>{count.toLocaleString('en-PH')}</span>
              </header>
              <div className="kb-list">
                {loading && !orders.length && <div className="kb-empty">Loading orders…</div>}
                {list.map((o) => <OrderCard key={o.id} order={o} col={col} onMove={moveOrder} />)}
                {!loading && !list.length && <div className="kb-empty">{query ? 'No matches' : col.empty}</div>}
                {col.status === 'Completed' && doneTotal > DONE_LIMIT && !query && (
                  <p className="kb-more">Showing the latest {DONE_LIMIT} of {doneTotal.toLocaleString('en-PH')} completed orders</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}