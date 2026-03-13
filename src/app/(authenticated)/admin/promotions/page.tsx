'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Promotion, Service } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

type FilterMode = 'aktiv' | 'inaktiv' | 'alle';

export default function AdminPromotionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [filter, setFilter] = useState<FilterMode>('aktiv');

  const { data: promotions, refetch } = usePolling<Promotion[]>(
    () => api.get('/promotions').then((r) => r.data),
    30000
  );

  const { data: services } = usePolling<Service[]>(
    () => api.get('/services').then((r) => r.data),
    60000
  );

  const handleDeactivate = async (id: string) => {
    if (!confirm('Aktion deaktivieren?')) return;
    await api.delete(`/promotions/${id}`);
    refetch();
  };

  const handleReactivate = async (id: string) => {
    await api.put(`/promotions/${id}`, { is_active: true });
    refetch();
  };

  const handleEdit = (p: Promotion) => {
    setEditing(p);
    setShowForm(true);
  };

  const now = new Date();
  const allPromos = promotions || [];

  const getStatus = (p: Promotion): { label: string; color: string; bg: string } => {
    if (!p.is_active) return { label: 'Inaktiv', color: 'text-red-400', bg: 'bg-red-400/10' };
    if (p.valid_until && new Date(p.valid_until) < now) return { label: 'Abgelaufen', color: 'text-orange-400', bg: 'bg-orange-400/10' };
    if (p.max_redemptions && p.current_redemptions >= p.max_redemptions) return { label: 'Ausgeschöpft', color: 'text-orange-400', bg: 'bg-orange-400/10' };
    if (p.valid_from && new Date(p.valid_from) > now) return { label: 'Geplant', color: 'text-blue-400', bg: 'bg-blue-400/10' };
    return { label: 'Aktiv', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  };

  const filtered = allPromos.filter((p) => {
    if (filter === 'aktiv') return p.is_active;
    if (filter === 'inaktiv') return !p.is_active;
    return true;
  });

  const activeCount = allPromos.filter(p => p.is_active).length;
  const inactiveCount = allPromos.filter(p => !p.is_active).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Aktionen verwalten</h1>
          <p className="text-sm text-bd-text-muted mt-1">
            {activeCount} aktive Aktionen
            {inactiveCount > 0 && ` · ${inactiveCount} inaktiv`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          + Neue Aktion
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['aktiv', 'alle', 'inaktiv'] as FilterMode[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 sm:py-1.5 text-xs rounded-lg border transition-all ${
              filter === f
                ? f === 'inaktiv'
                  ? 'bg-red-500 text-white border-red-500 font-semibold'
                  : 'bg-bd-accent text-bd-bg border-bd-accent font-semibold'
                : f === 'inaktiv'
                  ? 'border-bd-border text-red-400 hover:border-red-400/50'
                  : 'border-bd-border text-bd-text-body hover:border-bd-accent/50'
            }`}
          >
            {f === 'aktiv' ? `Aktiv (${activeCount})` : f === 'inaktiv' ? `Inaktiv (${inactiveCount})` : 'Alle'}
          </button>
        ))}
      </div>

      {/* Promotions Table */}
      <div className="bg-bd-card rounded-bd border border-bd-border overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-bd-border text-left">
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Rabatt</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Zeitraum</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Einlösungen</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider w-36"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const status = getStatus(p);
              const serviceNames = p.applicable_service_ids && services
                ? p.applicable_service_ids.map(sid => services.find(s => s.id === sid)?.name).filter(Boolean)
                : null;

              return (
                <tr key={p.id} className={`border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-bd-text-muted mt-0.5 max-w-xs truncate">{p.description}</div>
                    )}
                    {serviceNames && serviceNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {serviceNames.map((name, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-bd-bg-secondary text-bd-text-muted">{name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-bd-accent">
                      {Number(p.discount_value) === 0
                        ? 'Sonderaktion'
                        : p.discount_type === 'fixed'
                          ? `${formatCurrency(Number(p.discount_value))} Rabatt`
                          : `${Number(p.discount_value)}% Rabatt`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-bd-text-body">
                    {p.valid_from || p.valid_until ? (
                      <div>
                        {p.valid_from && <div className="text-xs">Ab: {new Date(p.valid_from).toLocaleDateString('de-DE')}</div>}
                        {p.valid_until && <div className="text-xs">Bis: {new Date(p.valid_until).toLocaleDateString('de-DE')}</div>}
                      </div>
                    ) : (
                      <span className="text-bd-text-muted">Unbegrenzt</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {p.max_redemptions ? (
                      <div>
                        <span className="font-medium">{p.current_redemptions}/{p.max_redemptions}</span>
                        <div className="w-16 h-1.5 bg-bd-bg-secondary rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-bd-accent rounded-full transition-all"
                            style={{ width: `${Math.min(100, (p.current_redemptions / p.max_redemptions) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium">{p.current_redemptions}</span>
                        <span className="text-bd-text-muted ml-1">/ unbegrenzt</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={status.color} bg={status.bg}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(p)} className="text-xs text-bd-accent hover:brightness-110 mr-3">
                      Bearbeiten
                    </button>
                    {p.is_active ? (
                      <button onClick={() => handleDeactivate(p.id)} className="text-xs text-red-400 hover:text-red-300">
                        Deaktivieren
                      </button>
                    ) : (
                      <button onClick={() => handleReactivate(p.id)} className="text-xs text-green-400 hover:text-green-300">
                        Aktivieren
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-bd-text-muted text-sm">
                  Keine Aktionen gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PromotionFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        promotion={editing}
        services={services || []}
        onSaved={refetch}
      />
    </div>
  );
}

function PromotionFormModal({ open, onClose, promotion, services, onSaved }: {
  open: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  services: Service[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    discount_mode: 'none' as 'none' | 'fixed' | 'percentage',
    discount_value: '',
    valid_from: '',
    valid_until: '',
    max_redemptions: '',
    applicable_service_ids: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (promotion) {
      const hasDiscount = Number(promotion.discount_value) > 0;
      setForm({
        name: promotion.name,
        description: promotion.description || '',
        discount_mode: hasDiscount ? promotion.discount_type : 'none',
        discount_value: hasDiscount ? promotion.discount_value.toString() : '',
        valid_from: promotion.valid_from ? promotion.valid_from.slice(0, 10) : '',
        valid_until: promotion.valid_until ? promotion.valid_until.slice(0, 10) : '',
        max_redemptions: promotion.max_redemptions?.toString() || '',
        applicable_service_ids: promotion.applicable_service_ids || [],
      });
    } else {
      setForm({
        name: '', description: '', discount_mode: 'none', discount_value: '',
        valid_from: '', valid_until: '', max_redemptions: '', applicable_service_ids: [],
      });
    }
  }, [promotion, open]);

  const toggleService = (id: string) => {
    setForm(prev => ({
      ...prev,
      applicable_service_ids: prev.applicable_service_ids.includes(id)
        ? prev.applicable_service_ids.filter(s => s !== id)
        : [...prev.applicable_service_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        discount_type: form.discount_mode === 'percentage' ? 'percentage' : 'fixed',
        discount_value: form.discount_mode === 'none' ? 0 : parseFloat(form.discount_value),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
        applicable_service_ids: form.applicable_service_ids.length > 0 ? form.applicable_service_ids : null,
      };

      if (promotion) {
        await api.put(`/promotions/${promotion.id}`, payload);
      } else {
        await api.post('/promotions', payload);
      }
      onSaved();
      onClose();
    } catch {
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const activeServices = services.filter(s => s.is_active);

  return (
    <Modal open={open} onClose={onClose} title={promotion ? 'Aktion bearbeiten' : 'Neue Aktion'}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Name *</label>
          <input required className="w-full" placeholder="z.B. Frühlings-Aktion 2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Beschreibung</label>
          <textarea rows={3} className="w-full" placeholder="Freitext-Beschreibung der Aktion..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Rabatt</label>
          <div className="flex gap-2 mb-3">
            {([
              { key: 'none', label: 'Kein Rabatt' },
              { key: 'fixed', label: 'Festbetrag' },
              { key: 'percentage', label: 'Prozent' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setForm({ ...form, discount_mode: opt.key, discount_value: opt.key === 'none' ? '' : form.discount_value })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                  form.discount_mode === opt.key
                    ? 'bg-bd-accent text-bd-bg border-bd-accent font-semibold'
                    : 'border-bd-border text-bd-text-body hover:border-bd-accent/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {form.discount_mode !== 'none' && (
            <div>
              <label className="block text-sm text-bd-text-secondary mb-1">
                Rabattwert {form.discount_mode === 'percentage' ? '(%)' : '(EUR)'} *
              </label>
              <input
                required
                type="number"
                step={form.discount_mode === 'percentage' ? '1' : '0.01'}
                min="0.01"
                max={form.discount_mode === 'percentage' ? '100' : undefined}
                className="w-full"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Gültig ab</label>
            <input type="date" className="w-full" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Gültig bis</label>
            <input type="date" className="w-full" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Maximale Einlösungen</label>
          <input
            type="number"
            min="1"
            step="1"
            className="w-full"
            placeholder="Leer = unbegrenzt"
            value={form.max_redemptions}
            onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">
            Anwendbar auf Services
            <span className="text-bd-text-muted font-normal ml-1">(leer = alle)</span>
          </label>
          <div className="bg-bd-bg-secondary rounded-lg border border-bd-border p-3 max-h-40 overflow-y-auto space-y-1.5">
            {activeServices.length > 0 ? activeServices.map(s => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm hover:text-bd-text transition-colors">
                <input
                  type="checkbox"
                  checked={form.applicable_service_ids.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                  className="accent-bd-accent"
                />
                <span className={form.applicable_service_ids.includes(s.id) ? 'text-bd-text' : 'text-bd-text-body'}>
                  {s.name}
                </span>
                <span className="text-xs text-bd-text-muted ml-auto">{formatCurrency(s.base_price)}</span>
              </label>
            )) : (
              <p className="text-xs text-bd-text-muted">Keine aktiven Services vorhanden.</p>
            )}
          </div>
          {form.applicable_service_ids.length > 0 && (
            <p className="text-xs text-bd-text-muted mt-1">
              {form.applicable_service_ids.length} Service{form.applicable_service_ids.length !== 1 ? 's' : ''} ausgewählt
            </p>
          )}
        </div>

        {/* Preview */}
        {form.name && (
          <div className="bg-bd-accent/5 border border-bd-accent/20 rounded-lg p-3">
            <p className="text-xs text-bd-text-muted mb-1">Vorschau</p>
            <p className="text-sm font-semibold text-bd-accent">
              {form.discount_mode === 'none'
                ? 'Sonderaktion'
                : form.discount_mode === 'fixed'
                  ? `${formatCurrency(parseFloat(form.discount_value) || 0)} Rabatt`
                  : `${form.discount_value || 0}% Rabatt`}
            </p>
            {form.valid_from || form.valid_until ? (
              <p className="text-xs text-bd-text-muted mt-1">
                {form.valid_from && `Ab ${new Date(form.valid_from).toLocaleDateString('de-DE')}`}
                {form.valid_from && form.valid_until && ' - '}
                {form.valid_until && `Bis ${new Date(form.valid_until).toLocaleDateString('de-DE')}`}
              </p>
            ) : null}
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </form>
    </Modal>
  );
}
