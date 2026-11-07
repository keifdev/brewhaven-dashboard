'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import Toggle from '@/components/Toggle';
import { supabase } from '@/lib/supabaseClient';

const peso = (n) => '₱' + n.toLocaleString('en-PH');

function Thumb({ src, name }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F5EADC] font-display font-semibold text-caramel">
      {src && !broken ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        name ? name[0] : '?'
      )}
    </span>
  );
}

// Inline styles to force the modal form to look perfect regardless of globals.css
const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '16px' },
  modal: { backgroundColor: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' },
  closeBtn: { position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)' },
  title: { fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: '600', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  group: { display: 'flex', flexDirection: 'column', gap: '6px' },
  row: { display: 'flex', gap: '16px' },
  col: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--espresso)' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', backgroundColor: '#fff', color: 'var(--espresso)' },
  hint: { fontSize: '11.5px', color: 'var(--mute)', marginTop: '2px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' },
  btnCancel: { padding: '8px 16px', backgroundColor: '#fff', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: 'var(--espresso)' },
  btnSave: { padding: '8px 16px', backgroundColor: 'var(--espresso)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }
};

export default function MenuManagerPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDrink, setNewDrink] = useState({ name: '', category: 'Latte', price: '', image_path: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  async function fetchMenuItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching menu:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function toggleAvailability(id, currentStatus) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_available: !currentStatus } : i))
    );

    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating availability:', error);
      alert('Failed to save to database. Reverting...');
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_available: currentStatus } : i))
      );
    }
  }

  async function handleAddDrink(e) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const priceNumber = parseInt(newDrink.price, 10);
    if (isNaN(priceNumber)) {
      alert("Please enter a valid number for the price.");
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert([
        {
          name: newDrink.name,
          category: newDrink.category,
          price: priceNumber,
          image_path: newDrink.image_path || null,
          is_available: true
        }
      ])
      .select();

    if (error) {
      console.error("Error adding drink:", error);
      alert("Failed to add drink: " + error.message);
    } else if (data) {
      setItems((prev) => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      setIsModalOpen(false);
      setNewDrink({ name: '', category: 'Latte', price: '', image_path: '' });
    }
    setIsSubmitting(false);
  }

  const categories = ['All', ...new Set(items.map((i) => i.category))];

  const rows = items.filter(
    (i) =>
      (category === 'All' || i.category === category) &&
      i.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="card p-5 relative">
      
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Drinks</h2>
          <p className="text-sm text-mute">
            {loading ? 'Loading...' : `${items.filter((i) => i.is_available).length} of ${items.length} available to customers`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="search-icon" />
            <input
              className="input pl-9"
              type="search"
              placeholder="Search drinks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search drinks"
            />
          </div>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button 
            className="btn-primary" 
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} /> Add Drink
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[560px] text-sm">
          <thead>
            <tr>
              <th>Drink</th>
              <th>Category</th>
              <th>Price</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="transition-colors hover:bg-[#FBFAF7]">
                <td>
                  <div className={`flex items-center gap-3 ${i.is_available ? '' : 'opacity-50'}`}>
                    <Thumb src={i.image_path} name={i.name} />
                    <span className="font-medium">{i.name}</span>
                  </div>
                </td>
                <td>{i.category}</td>
                <td className="font-display font-medium">{peso(i.price)}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={i.is_available}
                      onChange={(v) => toggleAvailability(i.id, i.is_available)}
                      label={`Toggle ${i.name}`}
                    />
                    <span className="w-20 text-xs text-mute">
                      {i.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-mute">
                  No drinks match your search. (Or your database is empty).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Drink Modal Overlay */}
      {isModalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            
            <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>

            <h3 style={styles.title}>Add New Drink</h3>
            
            <form onSubmit={handleAddDrink} style={styles.form}>
              <div style={styles.group}>
                <label style={styles.label}>Drink Name</label>
                <input 
                  required
                  type="text" 
                  style={styles.input} 
                  placeholder="e.g. Iced Vanilla Latte"
                  value={newDrink.name}
                  onChange={(e) => setNewDrink({...newDrink, name: e.target.value})}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Category</label>
                  <select 
                    style={styles.input}
                    value={newDrink.category}
                    onChange={(e) => setNewDrink({...newDrink, category: e.target.value})}
                  >
                    <option value="Latte">Latte</option>
                    <option value="Espresso">Espresso</option>
                    <option value="Iced Coffee">Iced Coffee</option>
                    <option value="Non-Coffee">Non-Coffee</option>
                  </select>
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Price (₱)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    style={styles.input} 
                    placeholder="120"
                    value={newDrink.price}
                    onChange={(e) => setNewDrink({...newDrink, price: e.target.value})}
                  />
                </div>
              </div>

              <div style={styles.group}>
                <label style={styles.label}>Image Path (Optional)</label>
                <input 
                  type="text" 
                  style={styles.input} 
                  placeholder="/images/drink_new.png"
                  value={newDrink.image_path}
                  onChange={(e) => setNewDrink({...newDrink, image_path: e.target.value})}
                />
                <p style={styles.hint}>Leave blank if you don't have an image yet.</p>
              </div>

              <div style={styles.actions}>
                <button 
                  type="button" 
                  style={styles.btnCancel} 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={styles.btnSave} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Drink'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}