'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { User, Customer, ProjectTemplate } from '@/types';

export default function NeuesProjektPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    customer_id: '',
    prospect_name: '',
    prospect_contact: '',
    prospect_email: '',
    prospect_phone: '',
    template_id: '',
    assigned_to: '',
    estimated_start: '',
    estimated_end: '',
  });

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data.filter((u: User) => u.is_active))).catch(() => {});
    api.get('/customers?per_page=200').then((r) => setCustomers(r.data.customers || r.data || [])).catch(() => {});
    api.get('/project-templates').then((r) => setTemplates(r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);

    try {
      let res;
      if (form.template_id) {
        res = await api.post(`/projects/from-template/${form.template_id}`, {
          title: form.title,
          description: form.description || null,
          customer_id: form.customer_id || null,
          prospect_name: !form.customer_id ? form.prospect_name || null : null,
          prospect_contact: !form.customer_id ? form.prospect_contact || null : null,
          prospect_email: !form.customer_id ? form.prospect_email || null : null,
          prospect_phone: !form.customer_id ? form.prospect_phone || null : null,
          assigned_to: form.assigned_to || null,
          estimated_start: form.estimated_start || null,
          estimated_end: form.estimated_end || null,
        });
      } else {
        res = await api.post('/projects', {
          title: form.title,
          description: form.description || null,
          customer_id: form.customer_id || null,
          prospect_name: !form.customer_id ? form.prospect_name || null : null,
          prospect_contact: !form.customer_id ? form.prospect_contact || null : null,
          prospect_email: !form.customer_id ? form.prospect_email || null : null,
          prospect_phone: !form.customer_id ? form.prospect_phone || null : null,
          assigned_to: form.assigned_to || null,
          estimated_start: form.estimated_start || null,
          estimated_end: form.estimated_end || null,
        });
      }
      const projectId = res.data?.id || res.data?.project?.id;
      router.push(projectId ? `/projekte/${projectId}` : '/projekte');
    } catch {
      alert('Fehler beim Erstellen des Projekts');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <button onClick={() => router.push('/projekte')} className="text-sm text-bd-text-muted hover:text-bd-text mb-4 block">
        &larr; Zur&uuml;ck zu Projekte
      </button>

      <h1 className="font-heading text-2xl font-bold mb-6">Neues Projekt</h1>

      <form onSubmit={handleSubmit} className="bg-bd-card rounded-bd border border-bd-border p-5 space-y-5 max-w-2xl">
        {/* Title */}
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Titel *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
            placeholder="Projektname"
            className="w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Beschreibung</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            placeholder="Projektbeschreibung..."
            className="w-full"
          />
        </div>

        {/* Customer */}
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Kunde</label>
          <select value={form.customer_id} onChange={(e) => update('customer_id', e.target.value)}>
            <option value="">– Kein Kunde (Interessent) –</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>

        {/* Prospect fields (when no customer selected) */}
        {!form.customer_id && (
          <div className="bg-bd-bg-secondary rounded-lg p-4 space-y-3 border border-bd-border">
            <p className="text-xs text-bd-text-muted uppercase tracking-wider font-semibold">Interessent-Daten</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-bd-text-secondary mb-1">Firma / Name</label>
                <input
                  type="text"
                  value={form.prospect_name}
                  onChange={(e) => update('prospect_name', e.target.value)}
                  placeholder="Firmenname"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-bd-text-secondary mb-1">Ansprechpartner</label>
                <input
                  type="text"
                  value={form.prospect_contact}
                  onChange={(e) => update('prospect_contact', e.target.value)}
                  placeholder="Name"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-bd-text-secondary mb-1">E-Mail</label>
                <input
                  type="email"
                  value={form.prospect_email}
                  onChange={(e) => update('prospect_email', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-bd-text-secondary mb-1">Telefon</label>
                <input
                  type="tel"
                  value={form.prospect_phone}
                  onChange={(e) => update('prospect_phone', e.target.value)}
                  placeholder="+49..."
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Template */}
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Vorlage</label>
          <select value={form.template_id} onChange={(e) => update('template_id', e.target.value)}>
            <option value="">– Keine Vorlage –</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {form.template_id && (
            <p className="text-xs text-bd-text-muted mt-1">
              Module werden automatisch aus der Vorlage übernommen.
            </p>
          )}
        </div>

        {/* Assigned to */}
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Zugewiesen an</label>
          <select value={form.assigned_to} onChange={(e) => update('assigned_to', e.target.value)}>
            <option value="">– Nicht zugewiesen –</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Geplanter Start</label>
            <input
              type="date"
              value={form.estimated_start}
              onChange={(e) => update('estimated_start', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Geplantes Ende</label>
            <input
              type="date"
              value={form.estimated_end}
              onChange={(e) => update('estimated_end', e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className="px-6 py-2.5 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Erstelle...' : 'Projekt erstellen'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/projekte')}
            className="px-6 py-2.5 text-sm border border-bd-border text-bd-text-body rounded-lg hover:bg-bd-card-hover transition-all"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
