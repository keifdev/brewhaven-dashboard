'use client';

// Sidebar + Topbar in one file. Wrap every page with it from app/layout.jsx.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Package, Coffee, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

/* ---------- Config ---------- */
const GROUPS = [
  {
    label: 'Main',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/orders', label: 'Live orders', icon: ClipboardList , badgeKey: 'live', tone: 'caramel' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/menu', label: 'Menu manager', icon: UtensilsCrossed },
      { href: '/inventory', label: 'Inventory', icon: Package , badgeKey: 'out', tone: 'red' },
    ],
  },
];
const NAV = GROUPS.flatMap((g) => g.items);
const SHOP = { name: 'Brew & Bean', city: 'Baguio City', hours: '7:00 AM – 9:00 PM' };
const GOAL_TARGET = 10000; // daily sales goal (edit me)

const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH');

// Live sidebar numbers: open orders, out-of-stock ingredients and today's sales. Refreshed on every page change.
function useSidebarStats(pathname) {
  const [stats, setStats] = useState({ live: 0, out: 0, sold: 0 });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const [live, out, today] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['Pending', 'Preparing']),
          supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('is_in_stock', false),
          supabase.from('orders').select('total').eq('status', 'Completed').gte('created_at', startOfToday.toISOString()).limit(5000),
        ]);
        if (cancelled) return;
        setStats({ live: live.count || 0, out: out.count || 0, sold: (today.data || []).reduce((s, o) => s + Number(o.total || 0), 0) });
      } catch (e) { /* keep the last numbers */ }
    }
    load();
    return () => { cancelled = true; };
  }, [pathname]);
  return stats;
}

function Sidebar({ open, onClose, shopOpen }) {
  const pathname = usePathname();
  const live = useSidebarStats(pathname);
  const badgeOf = { live: live.live, out: live.out };
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const pct = Math.min(100, Math.round((live.sold / GOAL_TARGET) * 100));

  return (
    <>
      {open && <div className="sb-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={`sb ${open ? 'open' : ''}`}>
        <div className="sb-brand">
          <span className="sb-logo"><Coffee size={20} /></span>
          <div>
            <p className="sb-name">BrewHaven</p>
            <p className="sb-tag">Merchant</p>
          </div>
          <button className="sb-close" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="sb-label">{g.label}</p>
              {g.items.map(({ href, label, icon: Icon, badgeKey, tone }) => (
                <Link key={href} href={href} onClick={onClose} aria-current={isActive(href) ? 'page' : undefined} className={`sb-link ${isActive(href) ? 'active' : ''}`}>
                  <span className="sb-ico"><Icon size={17} /></span>
                  <span>{label}</span>
                  {badgeKey && badgeOf[badgeKey] > 0 && <span className={`sb-badge ${tone}`}>{badgeOf[badgeKey] > 99 ? '99+' : badgeOf[badgeKey]}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-bottom">
          <div className="sb-card">
            <div className="sb-row"><span className="sb-dim">Daily goal</span><b>{pct}%</b></div>
            <div className="sb-bar"><i style={{ width: `${pct}%` }} /></div>
            <p className="sb-dim sb-small">{peso(live.sold)} of {peso(GOAL_TARGET)} today</p>
          </div>

          <div className="sb-card sb-shop">
            <span className="sb-avatar">BB</span>
            <div className="sb-shop-text">
              <p className="sb-shop-name">{SHOP.name}</p>
              <p className="sb-dim sb-small"><i className={`sb-dot ${shopOpen ? 'on' : ''}`} />{shopOpen ? `Open · ${SHOP.hours}` : 'Closed'}</p>
            </div>
          </div>
          <p className="sb-foot">BrewHaven Merchant</p>
        </div>
      </aside>
    </>
  );
}

function ShopSwitch({ open, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium text-mute sm:block">Shop</span>
      <button
        type="button"
        role="switch"
        aria-checked={open}
        aria-label="Shop open or closed"
        onClick={() => onChange(!open)}
        className={`relative h-6 w-11 rounded-full transition-colors ${open ? 'bg-green-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${open ? 'translate-x-5' : ''}`} />
      </button>
      <span className={`w-16 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {open ? 'Open' : 'Closed'}
      </span>
    </div>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(true);
  const title = NAV.find((n) => (n.href === '/' ? pathname === '/' : pathname.startsWith(n.href)))?.label ?? 'BrewHaven';

  return (
    <div className="min-h-screen">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} shopOpen={shopOpen} />
      <div className="lg:ml-[260px]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-cream/90 px-4 py-3.5 backdrop-blur lg:px-8">
          <button className="rounded-lg border border-line bg-white p-2 transition hover:border-caramel lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <h1 className="flex-1 font-display text-xl font-semibold">{title}</h1>
          <ShopSwitch open={shopOpen} onChange={setShopOpen} />
        </header>
        <main className="mx-auto max-w-[1280px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}