'use client';

import { useState, useEffect } from 'react';
import { Milk, Droplets, Cookie, AlertTriangle } from 'lucide-react';
import Toggle from '@/components/Toggle';
import { supabase } from '@/lib/supabaseClient';

const GROUPS = [
  { key: 'milk', title: 'Milks', icon: Milk },
  { key: 'syrup', title: 'Syrups', icon: Droplets },
  { key: 'topping', title: 'Toppings', icon: Cookie },
];
// "Milks", "milk", "MILK" all map to the same group
const normalize = (c) => String(c || '').toLowerCase().trim().replace(/s$/, '');

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.from('inventory').select('*').order('label', { ascending: true });
      if (err) setError('Could not load inventory. ' + err.message);
      else setInventory(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleStock(item) {
    const next = !item.is_in_stock;
    const patch = (v) => setInventory((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_in_stock: v } : i)));
    patch(next);
    const { error: err } = await supabase.from('inventory').update({ is_in_stock: next }).eq('id', item.id);
    if (err) { patch(!next); setError('Could not update ' + item.label + '. ' + err.message); }
    else setError('');
  }

  if (loading) return <div className="card p-5 text-mute">Loading inventory…</div>;

  const out = inventory.filter((i) => !i.is_in_stock);
  const known = new Set(GROUPS.map((g) => g.key));
  const groups = [
    ...GROUPS,
    ...[...new Set(inventory.map((i) => normalize(i.category)).filter((k) => k && !known.has(k)))].map((k) => ({ key: k, title: k[0].toUpperCase() + k.slice(1), icon: Cookie })),
  ].map((g) => ({ ...g, items: inventory.filter((i) => normalize(i.category) === g.key) })).filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="kb-error" role="alert">{error}</div>}

      {out.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700" role="status">
          <AlertTriangle size={18} />
          <span><span className="font-semibold">{out.map((i) => i.label).join(', ')}</span> {out.length === 1 ? 'is' : 'are'} out of stock and hidden from customers.</span>
        </div>
      )}

      {!groups.length && !error && (
        <div className="card p-5">
          <h2 className="font-display text-base font-semibold">No ingredients yet</h2>
          <p className="text-sm text-mute mt-2">The <b>inventory</b> table is empty (or Row Level Security is hiding its rows). Run <code>supabase/seed.sql</code> in the Supabase SQL editor, then refresh.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map(({ key, title, icon: Icon, items }) => (
          <section key={key} className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F5EADC] text-caramel"><Icon size={18} /></span>
                {title}
              </h2>
              <span className="text-xs text-mute">{items.filter((i) => i.is_in_stock).length} of {items.length} in stock</span>
            </div>
            <ul>
              {items.map((i) => (
                <li key={i.id} className={`flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors ${i.is_in_stock ? 'hover:bg-[#FBFAF7]' : 'bg-[#FEF5F4]'}`}>
                  <div>
                    <p className="text-sm font-medium">{i.label}</p>
                    <p className="text-xs text-mute">{i.is_in_stock ? 'Available to customers' : 'Hidden from customers'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!i.is_in_stock && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Out of stock</span>}
                    <Toggle checked={i.is_in_stock} onChange={() => toggleStock(i)} label={`Toggle ${i.label}`} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}