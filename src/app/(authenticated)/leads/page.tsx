'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Lead, LeadLock, User } from '@/types';
import { STATUS_CONFIG, formatRelative } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

const ALL_STATUSES = ['neu', 'kontaktiert', 'qualifiziert', 'angebot', 'gewonnen', 'verloren'] as const;

const MISSING_FIELD_OPTIONS = [
  { value: 'phone', label: 'Kein Telefon' },
  { value: 'email', label: 'Keine E-Mail' },
  { value: 'website', label: 'Keine Website' },
  { value: 'contact_person', label: 'Kein Kontakt' },
  { value: 'city', label: 'Keine Stadt' },
  { value: 'bundesland', label: 'Kein Bundesland' },
];

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [bundeslandFilter, setBundeslandFilter] = useState('');
  const [missingFieldFilter, setMissingFieldFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [perPage, setPerPage] = useState(50);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Distinct values for filters
  const [bundeslaender, setBundeslaender] = useState<string[]>([]);

  useEffect(() => {
    api.get('/leads/distinct-values').then(r => {
      setBundeslaender(r.data.bundeslaender || []);
    }).catch(() => {});
  }, []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned_to', assignedFilter);
    if (search) params.set('search', search);
    if (bundeslandFilter) params.set('bundesland', bundeslandFilter);
    if (missingFieldFilter) params.set('missing_field', missingFieldFilter);
    params.set('per_page', perPage.toString());
    return params.toString();
  }, [statusFilter, assignedFilter, search, bundeslandFilter, missingFieldFilter, perPage]);

  const { data: leadsData, refetch } = usePolling(
    () => api.get(`/leads?${buildQuery()}`).then((r) => r.data),
    5000
  );

  const { data: locks } = usePolling<LeadLock[]>(
    () => api.get('/leads/locks').then((r) => r.data),
    5000
  );

  const { data: users } = usePolling<User[]>(
    () => api.get('/users').then((r) => r.data),
    30000
  );

  const leads = (leadsData?.leads || []) as Lead[];
  const lockMap = new Map((locks || []).map((l) => [l.lead_id, l]));

  // Selection helpers
  const allSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, assignedFilter, search, bundeslandFilter, missingFieldFilter, perPage]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await api.delete('/leads/bulk', { data: { ids: Array.from(selectedIds) } });
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      refetch();
      // Refresh distinct values after delete
      api.get('/leads/distinct-values').then(r => {
        setBundeslaender(r.data.bundeslaender || []);
      }).catch(() => {});
    } catch {
      alert('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl font-bold">Leads</h1>
        <div className="flex gap-2">
          <Link
            href="/leads/import"
            className="px-4 py-2 text-sm bg-bd-card border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors"
          >
            Excel Import
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
          >
            + Neuer Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 col-span-2"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Alle Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}>
          <option value="">Alle Mitarbeiter</option>
          {(users || []).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={bundeslandFilter} onChange={(e) => setBundeslandFilter(e.target.value)}>
          <option value="">Alle Bundesländer</option>
          {bundeslaender.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select value={missingFieldFilter} onChange={(e) => setMissingFieldFilter(e.target.value)}>
          <option value="">Fehlende Felder</option>
          {MISSING_FIELD_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select value={perPage} onChange={(e) => setPerPage(parseInt(e.target.value))}>
          <option value={50}>50 pro Seite</option>
          <option value={100}>100 pro Seite</option>
          <option value={200}>200 pro Seite</option>
          <option value={500}>500 pro Seite</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-bd-accent/10 border border-bd-accent/30 rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? 'Lead' : 'Leads'} ausgewählt
          </span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Ausgewählte löschen
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-sm border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors"
          >
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-bd-card rounded-bd border border-bd-border overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-bd-border text-left">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-bd-border cursor-pointer accent-bd-accent"
                />
              </th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Firma</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Website</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Kontakt</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Telefon</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Stadt</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Zugewiesen</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Aktualisiert</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider w-10"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const lock = lockMap.get(lead.id);
              const isSelected = selectedIds.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={`border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors ${isSelected ? 'bg-bd-accent/5' : ''}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(lead.id)}
                      className="rounded border-bd-border cursor-pointer accent-bd-accent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:text-bd-accent transition-colors">
                      {lead.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lead.website ? (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-bd-accent hover:brightness-110 transition-colors truncate block max-w-[180px]">
                        {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : (
                      <span className="text-bd-text-muted">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-bd-text-body">{lead.contact_person || '–'}</td>
                  <td className="px-4 py-3 text-sm text-bd-text-body">
                    {lead.phone ? (
                      <span>{lead.phone}</span>
                    ) : (
                      <span className="text-red-400 text-xs">fehlt</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-bd-text-body">{lead.city || '–'}</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_CONFIG[lead.status].color} bg={STATUS_CONFIG[lead.status].bg}>
                      {STATUS_CONFIG[lead.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-bd-text-body">{lead.assigned_to_name || '–'}</td>
                  <td className="px-4 py-3 text-xs text-bd-text-muted">{formatRelative(lead.updated_at)}</td>
                  <td className="px-4 py-3">
                    {lock && (
                      <span className="text-yellow-400 text-xs" title={`Bearbeitet von ${lock.user_name}`}>
                        🔒
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-bd-text-muted">
                  Keine Leads gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-bd-text-muted mt-2">{leadsData?.total || 0} Leads insgesamt</p>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Leads löschen">
        <div className="space-y-4">
          <p className="text-sm text-bd-text-body">
            Sollen <strong className="text-red-400">{selectedIds.size}</strong> {selectedIds.size === 1 ? 'Lead' : 'Leads'} endgültig gelöscht werden?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              {deleting ? 'Löschen...' : `${selectedIds.size} Leads löschen`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Lead Modal */}
      <CreateLeadModal open={showCreate} onClose={() => setShowCreate(false)} users={users || []} onCreated={refetch} />
    </div>
  );
}

function CreateLeadModal({ open, onClose, users, onCreated }: {
  open: boolean;
  onClose: () => void;
  users: User[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    company_name: '', contact_person: '', email: '', phone: '', website: '', city: '', notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/leads', form);
      onCreated();
      onClose();
      setForm({ company_name: '', contact_person: '', email: '', phone: '', website: '', city: '', notes: '' });
    } catch {
      alert('Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Neuer Lead">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Firmenname *</label>
          <input required className="w-full" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Kontaktperson</label>
            <input className="w-full" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Telefon</label>
            <input className="w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">E-Mail</label>
            <input type="email" className="w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Stadt</label>
            <input className="w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Website</label>
          <input className="w-full" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Notizen</label>
          <textarea rows={2} className="w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Erstellen...' : 'Lead erstellen'}
        </button>
      </form>
    </Modal>
  );
}
