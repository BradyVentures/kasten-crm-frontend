'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Service } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

export default function AdminServicesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const { data: services, refetch } = usePolling<Service[]>(
    () => api.get('/services').then((r) => r.data),
    30000
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Service deaktivieren?')) return;
    await api.delete(`/services/${id}`);
    refetch();
  };

  const handleEdit = (s: Service) => {
    setEditing(s);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Services verwalten</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          + Neuer Service
        </button>
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
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider w-24"></th>
            </tr>
          </thead>
          <tbody>
            {(services || []).map((s) => (
              <tr key={s.id} className="border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">
                  <Badge color={s.type === 'paket' ? 'text-blue-400' : 'text-purple-400'}
                         bg={s.type === 'paket' ? 'bg-blue-400/10' : 'bg-purple-400/10'}>
                    {s.type === 'paket' ? 'Paket' : 'Add-on'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{formatCurrency(Number(s.base_price))}</td>
                <td className="px-4 py-3 text-sm text-bd-text-body">{s.price_model === 'monatlich' ? 'Monatlich' : 'Einmalig'}</td>
                <td className="px-4 py-3 text-sm text-bd-text-body">
                  {Number(s.commission_rate) > 0 ? (
                    <span className="text-bd-accent font-medium">{Number(s.commission_rate)}%</span>
                  ) : (
                    <span className="text-bd-text-muted">–</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge color={s.is_active ? 'text-green-400' : 'text-red-400'} bg={s.is_active ? 'bg-green-400/10' : 'bg-red-400/10'}>
                    {s.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(s)} className="text-xs text-bd-accent hover:brightness-110 mr-3">Bearbeiten</button>
                  {s.is_active && (
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Deaktivieren</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    name: '', description: '', base_price: '', price_model: 'einmalig',
    type: 'paket' as 'paket' | 'addon', sort_order: '0', commission_rate: '0',
  });
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useState(() => {
    if (service) {
      setForm({
        name: service.name,
        description: service.description || '',
        base_price: service.base_price.toString(),
        price_model: service.price_model,
        type: service.type,
        sort_order: service.sort_order.toString(),
        commission_rate: (service.commission_rate || 0).toString(),
      });
    } else {
      setForm({ name: '', description: '', base_price: '', price_model: 'einmalig', type: 'paket', sort_order: '0', commission_rate: '0' });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        base_price: parseFloat(form.base_price),
        price_model: form.price_model,
        type: form.type,
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Name *</label>
          <input required className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Beschreibung</label>
          <textarea rows={2} className="w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Basispreis (€) *</label>
            <input required type="number" step="0.01" min="0" className="w-full" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Provision (%)</label>
            <input type="number" step="0.01" min="0" max="100" className="w-full" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Preismodell</label>
            <select className="w-full" value={form.price_model} onChange={(e) => setForm({ ...form, price_model: e.target.value })}>
              <option value="einmalig">Einmalig</option>
              <option value="monatlich">Monatlich</option>
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
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Sortierung</label>
          <input type="number" className="w-full" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </form>
    </Modal>
  );
}
