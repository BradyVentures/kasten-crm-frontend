'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Service } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

const CATEGORIES = ['Web-Services', 'Sichtbarkeit & Marketing', 'KI-Workflows', 'Analytics'];

const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  'Web-Services': { text: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Sichtbarkeit & Marketing': { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  'KI-Workflows': { text: 'text-purple-400', bg: 'bg-purple-400/10' },
  'Analytics': { text: 'text-amber-400', bg: 'bg-amber-400/10' },
};

export default function AdminServicesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('alle');

  const { data: services, refetch } = usePolling<Service[]>(
    () => api.get('/services').then((r) => r.data),
    30000
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Service deaktivieren?')) return;
    await api.delete(`/services/${id}`);
    refetch();
  };

  const handleReactivate = async (s: Service) => {
    await api.put(`/services/${s.id}`, { is_active: true });
    refetch();
  };

  const handleEdit = (s: Service) => {
    setEditing(s);
    setShowForm(true);
  };

  const filteredServices = (services || []).filter((s) => {
    if (filterCategory === 'alle') return true;
    if (filterCategory === 'inaktiv') return !s.is_active;
    return s.category === filterCategory && s.is_active;
  });

  // Group by category
  const grouped = filteredServices.reduce((acc, s) => {
    const cat = s.category || 'Ohne Kategorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  const inactiveCount = (services || []).filter(s => !s.is_active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Services verwalten</h1>
          <p className="text-sm text-bd-text-muted mt-1">
            {(services || []).filter(s => s.is_active).length} aktive Services
            {inactiveCount > 0 && ` \u00B7 ${inactiveCount} inaktiv`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          + Neuer Service
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterCategory('alle')}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
            filterCategory === 'alle'
              ? 'bg-bd-accent text-bd-bg border-bd-accent font-semibold'
              : 'border-bd-border text-bd-text-body hover:border-bd-accent/50'
          }`}
        >
          Alle
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              filterCategory === cat
                ? 'bg-bd-accent text-bd-bg border-bd-accent font-semibold'
                : 'border-bd-border text-bd-text-body hover:border-bd-accent/50'
            }`}
          >
            {cat}
          </button>
        ))}
        {inactiveCount > 0 && (
          <button
            onClick={() => setFilterCategory('inaktiv')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              filterCategory === 'inaktiv'
                ? 'bg-red-500 text-white border-red-500 font-semibold'
                : 'border-bd-border text-red-400 hover:border-red-400/50'
            }`}
          >
            Inaktiv ({inactiveCount})
          </button>
        )}
      </div>

      {/* Services grouped by category */}
      {filterCategory !== 'inaktiv' ? (
        Object.entries(grouped)
          .sort(([a], [b]) => {
            const order = [...CATEGORIES, 'Ohne Kategorie'];
            return order.indexOf(a) - order.indexOf(b);
          })
          .map(([category, catServices]) => (
            <div key={category} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-semibold">{category}</h2>
                <span className="text-xs text-bd-text-muted">{catServices.length} Services</span>
              </div>
              <div className="bg-bd-card rounded-bd border border-bd-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-bd-border text-left">
                      <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Typ</th>
                      <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Preis</th>
                      <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Modell</th>
                      <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Provision</th>
                      <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catServices.map((s) => (
                      <>
                        <tr
                          key={s.id}
                          className={`border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors cursor-pointer ${!s.is_active ? 'opacity-50' : ''}`}
                          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{s.name}</div>
                            {s.short_description && (
                              <div className="text-xs text-bd-text-muted mt-0.5 max-w-md truncate">{s.short_description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge color={s.type === 'paket' ? 'text-blue-400' : 'text-purple-400'}
                                   bg={s.type === 'paket' ? 'bg-blue-400/10' : 'bg-purple-400/10'}>
                              {s.type === 'paket' ? 'Paket' : 'Add-on'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{formatCurrency(Number(s.base_price))}</td>
                          <td className="px-4 py-3 text-sm text-bd-text-body">{s.price_model === 'monatlich' ? 'Monatlich' : 'Einmalig'}</td>
                          <td className="px-4 py-3 text-sm text-bd-text-body">
                            {Number(s.commission_rate) > 0 ? (
                              <span className="text-bd-accent font-medium">{Number(s.commission_rate)}%</span>
                            ) : (
                              <span className="text-bd-text-muted">\u2013</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleEdit(s)} className="text-xs text-bd-accent hover:brightness-110 mr-3">Bearbeiten</button>
                            {s.is_active ? (
                              <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Deaktivieren</button>
                            ) : (
                              <button onClick={() => handleReactivate(s)} className="text-xs text-green-400 hover:text-green-300">Aktivieren</button>
                            )}
                          </td>
                        </tr>
                        {expandedId === s.id && (
                          <tr key={`${s.id}-detail`} className="border-b border-bd-border last:border-0">
                            <td colSpan={6} className="px-4 py-4 bg-bd-bg/50">
                              <div className="grid grid-cols-1 gap-3 max-w-3xl">
                                {s.description && (
                                  <div>
                                    <div className="text-xs text-bd-text-muted uppercase tracking-wider mb-1">Beschreibung</div>
                                    <p className="text-sm text-bd-text-body leading-relaxed">{s.description}</p>
                                  </div>
                                )}
                                {s.includes && (
                                  <div>
                                    <div className="text-xs text-bd-text-muted uppercase tracking-wider mb-1">Inklusive</div>
                                    <p className="text-sm text-bd-text-secondary">{s.includes}</p>
                                  </div>
                                )}
                                <div className="flex gap-4 text-xs text-bd-text-muted pt-1">
                                  <span>Sortierung: {s.sort_order}</span>
                                  <span>ID: {s.id.slice(0, 8)}...</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
      ) : (
        /* Inactive services flat list */
        <div className="bg-bd-card rounded-bd border border-bd-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bd-border text-left">
                <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Kategorie</th>
                <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Preis</th>
                <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider w-32"></th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((s) => (
                <tr key={s.id} className="border-b border-bd-border last:border-0 opacity-60">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-bd-text-muted">{s.category || '\u2013'}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(Number(s.base_price))}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(s)} className="text-xs text-bd-accent hover:brightness-110 mr-3">Bearbeiten</button>
                    <button onClick={() => handleReactivate(s)} className="text-xs text-green-400 hover:text-green-300">Aktivieren</button>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-bd-text-muted">Keine inaktiven Services</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ServiceFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        service={editing}
        onSaved={refetch}
      />
    </div>
  );
}

function ServiceFormModal({ open, onClose, service, onSaved }: {
  open: boolean;
  onClose: () => void;
  service: Service | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    short_description: '',
    description: '',
    includes: '',
    base_price: '',
    price_model: 'einmalig',
    type: 'paket' as 'paket' | 'addon',
    category: 'Web-Services',
    sort_order: '0',
    commission_rate: '0',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        short_description: service.short_description || '',
        description: service.description || '',
        includes: service.includes || '',
        base_price: service.base_price.toString(),
        price_model: service.price_model,
        type: service.type,
        category: service.category || 'Web-Services',
        sort_order: service.sort_order.toString(),
        commission_rate: (service.commission_rate || 0).toString(),
      });
    } else {
      setForm({
        name: '', short_description: '', description: '', includes: '',
        base_price: '', price_model: 'einmalig', type: 'paket',
        category: 'Web-Services', sort_order: '0', commission_rate: '0',
      });
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        short_description: form.short_description || undefined,
        description: form.description || undefined,
        includes: form.includes || undefined,
        base_price: parseFloat(form.base_price),
        price_model: form.price_model,
        type: form.type,
        category: form.category,
        sort_order: parseInt(form.sort_order) || 0,
        commission_rate: parseFloat(form.commission_rate) || 0,
      };

      if (service) {
        await api.put(`/services/${service.id}`, payload);
      } else {
        await api.post('/services', payload);
      }
      onSaved();
      onClose();
    } catch {
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={service ? 'Service bearbeiten' : 'Neuer Service'}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Name *</label>
          <input required className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Kurzbeschreibung</label>
          <input className="w-full" placeholder="Ein Satz, der den Service erkl\u00E4rt" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Ausf\u00FChrliche Beschreibung</label>
          <textarea rows={4} className="w-full" placeholder="Detaillierte Erkl\u00E4rung f\u00FCr den Kunden..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Inklusive (kommagetrennt)</label>
          <textarea rows={2} className="w-full" placeholder="Design, Texterstellung, SEO, ..." value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Kategorie</label>
            <select className="w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Typ</label>
            <select className="w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'paket' | 'addon' })}>
              <option value="paket">Paket</option>
              <option value="addon">Add-on</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Basispreis (\u20AC) *</label>
            <input required type="number" step="0.01" min="0" className="w-full" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Preismodell</label>
            <select className="w-full" value={form.price_model} onChange={(e) => setForm({ ...form, price_model: e.target.value })}>
              <option value="einmalig">Einmalig</option>
              <option value="monatlich">Monatlich</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Provision (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="w-full" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Sortierung</label>
          <input type="number" className="w-full" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          <p className="text-xs text-bd-text-muted mt-1">Web-Services: 100-199, Marketing: 200-299, KI: 300-399, Analytics: 400-499</p>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </form>
    </Modal>
  );
}
