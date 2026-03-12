'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Lead, LeadLock, User, Region } from '@/types';
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
];

type SortField = 'company_name' | 'city' | 'updated_at';

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [missingFieldFilter, setMissingFieldFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [perPage, setPerPage] = useState(50);
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Regions
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionCounts, setRegionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.get('/regions').then(r => setRegions(r.data)).catch(() => {});
  }, []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned_to', assignedFilter);
    if (search) params.set('search', search);
    if (missingFieldFilter) params.set('missing_field', missingFieldFilter);
    if (selectedRegions.size > 0) params.set('regions', Array.from(selectedRegions).join(','));
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    params.set('per_page', perPage.toString());
    return params.toString();
  }, [statusFilter, assignedFilter, search, missingFieldFilter, selectedRegions, sortBy, sortOrder, perPage]);

  const buildFilterQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned_to', assignedFilter);
    if (search) params.set('search', search);
    if (missingFieldFilter) params.set('missing_field', missingFieldFilter);
    return params.toString();
  }, [statusFilter, assignedFilter, search, missingFieldFilter]);

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

  // Fetch region counts whenever base filters change
  useEffect(() => {
    const q = buildFilterQuery();
    api.get(`/leads/region-counts?${q}`).then(r => setRegionCounts(r.data)).catch(() => {});
  }, [buildFilterQuery]);

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRegion = (regionId: string) => {
    setSelectedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, assignedFilter, search, missingFieldFilter, selectedRegions, perPage]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await api.delete('/leads/bulk', { data: { ids: Array.from(selectedIds) } });
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      refetch();
    } catch {
      alert('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'updated_at' ? 'desc' : 'asc');
    }
  };

  const resetFilters = () => {
    setStatusFilter('');
    setAssignedFilter('');
    setMissingFieldFilter('');
    setSearch('');
    setSelectedRegions(new Set());
  };

  const hasActiveFilters = statusFilter || assignedFilter || missingFieldFilter || search || selectedRegions.size > 0;

  const totalRegionLeads = Object.values(regionCounts).reduce((a, b) => a + b, 0);

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
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

      {/* Region Cards */}
      {regions.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedRegions(new Set())}
            className={`shrink-0 px-4 py-2 text-sm rounded-lg border transition-colors ${
              selectedRegions.size === 0
                ? 'border-bd-accent text-bd-accent bg-bd-accent-dim'
                : 'border-bd-border bg-bd-card hover:border-bd-border-accent'
            }`}
          >
            Alle
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              selectedRegions.size === 0 ? 'bg-bd-accent/20 text-bd-accent' : 'bg-bd-bg-secondary text-bd-text-muted'
            }`}>
              {leadsData?.total || 0}
            </span>
          </button>
          {regions.map((region) => {
            const isActive = selectedRegions.has(region.id);
            const count = regionCounts[region.id] || 0;
            return (
              <button
                key={region.id}
                onClick={() => toggleRegion(region.id)}
                className={`shrink-0 px-4 py-2 text-sm rounded-lg border transition-colors ${
                  isActive
                    ? 'border-bd-accent text-bd-accent bg-bd-accent-dim'
                    : 'border-bd-border bg-bd-card hover:border-bd-border-accent'
                }`}
              >
                {region.name}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-bd-accent/20 text-bd-accent' : 'bg-bd-bg-secondary text-bd-text-muted'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-4">
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
        <select value={missingFieldFilter} onChange={(e) => setMissingFieldFilter(e.target.value)}>
          <option value="">Fehlende Felder</option>
          {MISSING_FIELD_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 col-span-2"
        />
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors text-bd-text-secondary"
          >
            Filter zurücksetzen
          </button>
        )}
        <select value={perPage} onChange={(e) => setPerPage(parseInt(e.target.value))} className="ml-auto">
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
        <table className="w-full min-w-[1000px]">
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
              <th
                className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider cursor-pointer hover:text-bd-text transition-colors select-none"
                onClick={() => handleSort('company_name')}
              >
                Firma<SortArrow field="company_name" />
              </th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Website</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Kontakt</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Telefon</th>
              <th
                className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider cursor-pointer hover:text-bd-text transition-colors select-none"
                onClick={() => handleSort('city')}
              >
                Stadt<SortArrow field="city" />
              </th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">PLZ</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Zugewiesen</th>
              <th
                className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider cursor-pointer hover:text-bd-text transition-colors select-none"
                onClick={() => handleSort('updated_at')}
              >
                Aktualisiert<SortArrow field="updated_at" />
              </th>
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
                  <td className="px-4 py-3 text-sm text-bd-text-body">{lead.postal_code || '–'}</td>
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
                <td colSpan={11} className="px-4 py-8 text-center text-bd-text-muted">
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
    company_name: '', contact_person: '', email: '', phone: '', website: '',
    address: '', postal_code: '', city: '', assigned_to: '', notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/leads', {
        ...form,
        assigned_to: form.assigned_to || null,
      });
      onCreated();
      onClose();
      setForm({ company_name: '', contact_person: '', email: '', phone: '', website: '', address: '', postal_code: '', city: '', assigned_to: '', notes: '' });
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
            <label className="block text-sm text-bd-text-secondary mb-1">Website</label>
            <input className="w-full" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Adresse</label>
          <input className="w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">PLZ</label>
            <input className="w-full" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Stadt</label>
            <input className="w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Zugewiesen an</label>
          <select className="w-full" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">Nicht zugewiesen</option>
            {users.filter(u => u.is_active).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
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
