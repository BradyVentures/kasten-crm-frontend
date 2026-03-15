'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Lead, LeadLock, User, Region, WebsiteStatus } from '@/types';
import { STATUS_CONFIG, formatRelative } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

const ALL_STATUSES = ['neu', 'kontaktiert', 'qualifiziert', 'angebot', 'gewonnen', 'verloren'] as const;

const WEBSITE_STATUS_CONFIG: Record<WebsiteStatus, { label: string; color: string; bg: string }> = {
  keine: { label: 'Keine', color: 'text-red-400', bg: 'bg-red-500/15' },
  veraltet: { label: 'Veraltet', color: 'text-orange-400', bg: 'bg-orange-500/15' },
  einfach: { label: 'Einfach', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  ok: { label: 'OK', color: 'text-green-400', bg: 'bg-green-500/15' },
  unbekannt: { label: 'Unbekannt', color: 'text-bd-text-muted', bg: 'bg-bd-bg-secondary' },
};

type SortField = 'company_name' | 'contact_person' | 'city' | 'postal_code' | 'updated_at';

const FILTER_STORAGE_KEY = 'leads-filters';

function loadFilters(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const s = sessionStorage.getItem(FILTER_STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

export default function LeadsPage() {
  const saved = useRef(loadFilters());
  const [statusFilter, setStatusFilter] = useState(saved.current.status || '');
  const [assignedFilter, setAssignedFilter] = useState(saved.current.assigned_to || '');
  const [brancheFilter, setBrancheFilter] = useState(saved.current.branche || '');
  const [websiteStatusFilter, setWebsiteStatusFilter] = useState(saved.current.website_status || '');
  const [phoneFilter, setPhoneFilter] = useState(saved.current.phone_filter || '');
  const [search, setSearch] = useState(saved.current.search || '');
  const [showCreate, setShowCreate] = useState(false);
  const [perPage, setPerPage] = useState(parseInt(saved.current.per_page || '50') || 50);
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(() => {
    const r = saved.current.regions;
    return r ? new Set(r.split(',')) : new Set();
  });
  const [sortBy, setSortBy] = useState<SortField>((saved.current.sort_by as SortField) || 'updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((saved.current.sort_order as 'asc' | 'desc') || 'desc');

  // Persist filter state to sessionStorage
  useEffect(() => {
    const data: Record<string, string> = {};
    if (statusFilter) data.status = statusFilter;
    if (assignedFilter) data.assigned_to = assignedFilter;
    if (brancheFilter) data.branche = brancheFilter;
    if (websiteStatusFilter) data.website_status = websiteStatusFilter;
    if (phoneFilter) data.phone_filter = phoneFilter;
    if (search) data.search = search;
    if (selectedRegions.size > 0) data.regions = Array.from(selectedRegions).join(',');
    if (sortBy !== 'updated_at') data.sort_by = sortBy;
    if (sortOrder !== 'desc') data.sort_order = sortOrder;
    if (perPage !== 50) data.per_page = perPage.toString();
    try { sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [statusFilter, assignedFilter, brancheFilter, websiteStatusFilter, phoneFilter, search, selectedRegions, sortBy, sortOrder, perPage]);

  // Distinct values for filters
  const [branchen, setBranchen] = useState<string[]>([]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Regions
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionCounts, setRegionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.get('/regions').then(r => setRegions(r.data)).catch(() => {});
    api.get('/leads/distinct-values').then(r => setBranchen(r.data.branchen || [])).catch(() => {});
  }, []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned_to', assignedFilter);
    if (search) params.set('search', search);
    if (brancheFilter) params.set('branche', brancheFilter);
    if (websiteStatusFilter) params.set('website_status', websiteStatusFilter);
    if (phoneFilter) params.set('phone_filter', phoneFilter);
    if (selectedRegions.size > 0) params.set('regions', Array.from(selectedRegions).join(','));
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    params.set('per_page', perPage.toString());
    return params.toString();
  }, [statusFilter, assignedFilter, search, brancheFilter, websiteStatusFilter, phoneFilter, selectedRegions, sortBy, sortOrder, perPage]);

  const buildFilterQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned_to', assignedFilter);
    if (search) params.set('search', search);
    if (brancheFilter) params.set('branche', brancheFilter);
    if (websiteStatusFilter) params.set('website_status', websiteStatusFilter);
    if (phoneFilter) params.set('phone_filter', phoneFilter);
    return params.toString();
  }, [statusFilter, assignedFilter, search, brancheFilter, websiteStatusFilter, phoneFilter]);

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

  const toggleRegionGroup = (regionIds: string[]) => {
    setSelectedRegions(prev => {
      const next = new Set(prev);
      const allSelected = regionIds.every(id => next.has(id));
      if (allSelected) {
        regionIds.forEach(id => next.delete(id));
      } else {
        regionIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, assignedFilter, search, brancheFilter, websiteStatusFilter, phoneFilter, selectedRegions, perPage]);

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
      // updated_at defaults to descending (newest first), everything else ascending (A-Z)
      setSortOrder(field === 'updated_at' ? 'desc' : 'asc');
    }
  };

  const resetFilters = () => {
    setStatusFilter('');
    setAssignedFilter('');
    setBrancheFilter('');
    setWebsiteStatusFilter('');
    setPhoneFilter('');
    setSearch('');
    setSelectedRegions(new Set());
  };

  const hasActiveFilters = statusFilter || assignedFilter || brancheFilter || websiteStatusFilter || phoneFilter || search || selectedRegions.size > 0;

  const SortableTh = ({ field, children, onClick, sortBy: sb, sortOrder: so }: {
    field: SortField;
    children: React.ReactNode;
    onClick: (field: SortField) => void;
    sortBy: SortField;
    sortOrder: 'asc' | 'desc';
  }) => (
    <th
      className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider cursor-pointer hover:text-bd-text transition-colors select-none"
      onClick={() => onClick(field)}
    >
      {children}{sb === field && <span className="ml-1">{so === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );

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
        <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}>
          <option value="">Alle Mitarbeiter</option>
          {(users || []).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {regions.length > 0 && (
          <RegionDropdown
            regions={regions}
            regionCounts={regionCounts}
            selectedRegions={selectedRegions}
            onToggleGroup={toggleRegionGroup}
            onClear={() => setSelectedRegions(new Set())}
          />
        )}
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
        <table className="w-full min-w-[1100px]">
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
              <SortableTh field="company_name" onClick={handleSort} sortBy={sortBy} sortOrder={sortOrder}>Firma</SortableTh>
              <ColumnFilterTh
                label="Web-Status"
                value={websiteStatusFilter}
                onChange={setWebsiteStatusFilter}
                multi
                options={[
                  { value: 'keine', label: 'Keine', color: 'text-red-400' },
                  { value: 'veraltet', label: 'Veraltet', color: 'text-orange-400' },
                  { value: 'einfach', label: 'Einfach', color: 'text-yellow-400' },
                  { value: 'ok', label: 'OK', color: 'text-green-400' },
                  { value: 'unbekannt', label: 'Unbekannt', color: 'text-bd-text-muted' },
                ]}
              />
              <SortableTh field="contact_person" onClick={handleSort} sortBy={sortBy} sortOrder={sortOrder}>Kontakt</SortableTh>
              <ColumnFilterTh
                label="Telefon"
                value={phoneFilter}
                onChange={setPhoneFilter}
                options={[
                  { value: 'vorhanden', label: 'Vorhanden', color: 'text-green-400' },
                  { value: 'keine', label: 'Keine', color: 'text-red-400' },
                ]}
              />
              <SortableTh field="city" onClick={handleSort} sortBy={sortBy} sortOrder={sortOrder}>Stadt</SortableTh>
              <SortableTh field="postal_code" onClick={handleSort} sortBy={sortBy} sortOrder={sortOrder}>PLZ</SortableTh>
              <ColumnFilterTh
                label="Branche"
                value={brancheFilter}
                onChange={setBrancheFilter}
                options={branchen.map(b => ({ value: b, label: b }))}
              />
              <ColumnFilterTh
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={ALL_STATUSES.map(s => ({ value: s, label: STATUS_CONFIG[s].label, color: STATUS_CONFIG[s].color }))}
              />
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Zugewiesen</th>
              <SortableTh field="updated_at" onClick={handleSort} sortBy={sortBy} sortOrder={sortOrder}>Aktualisiert</SortableTh>
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
                    <div className="flex items-center gap-2">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:text-bd-accent transition-colors">
                        {lead.company_name}
                      </Link>
                      {lead.website_checked && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px]" title="Website geprüft">{'\u2713'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lead.website_status ? (
                      <Badge
                        color={WEBSITE_STATUS_CONFIG[lead.website_status].color}
                        bg={WEBSITE_STATUS_CONFIG[lead.website_status].bg}
                      >
                        {WEBSITE_STATUS_CONFIG[lead.website_status].label}
                      </Badge>
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
                  <td className="px-4 py-3 text-sm text-bd-text-body">
                    {lead.branche ? (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-bd-bg-secondary text-bd-text-secondary border border-bd-border">
                        {lead.branche}
                      </span>
                    ) : '–'}
                  </td>
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
                <td colSpan={12} className="px-4 py-8 text-center text-bd-text-muted">
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

function RegionDropdown({ regions, regionCounts, selectedRegions, onToggleGroup, onClear }: {
  regions: Region[];
  regionCounts: Record<string, number>;
  selectedRegions: Set<string>;
  onToggleGroup: (ids: string[]) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedBl, setExpandedBl] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Group regions by bundesland → landkreis
  const grouped = regions.reduce<Record<string, Record<string, Region[]>>>((acc, r) => {
    if (!acc[r.bundesland]) acc[r.bundesland] = {};
    if (!acc[r.bundesland][r.landkreis]) acc[r.bundesland][r.landkreis] = [];
    acc[r.bundesland][r.landkreis].push(r);
    return acc;
  }, {});

  const toggleBl = (bl: string) => {
    setExpandedBl(prev => {
      const next = new Set(prev);
      if (next.has(bl)) next.delete(bl);
      else next.add(bl);
      return next;
    });
  };

  // Helpers
  const lkRegionIds = (regs: Region[]) => regs.map(r => r.id);
  const lkIsSelected = (regs: Region[]) => regs.every(r => selectedRegions.has(r.id));
  const lkLeads = (regs: Region[]) => regs.reduce((sum, r) => sum + (regionCounts[r.id] || 0), 0);

  const blSelectedCount = (landkreise: Record<string, Region[]>) =>
    Object.values(landkreise).filter(regs => lkIsSelected(regs)).length;
  const blTotalLeads = (landkreise: Record<string, Region[]>) =>
    Object.values(landkreise).reduce((sum, regs) => sum + lkLeads(regs), 0);

  // Count selected Landkreise (not individual regions)
  const selectedLkCount = Object.values(grouped).reduce((sum, lks) => sum + blSelectedCount(lks), 0);

  // Label for the dropdown button
  const label = selectedLkCount === 0 ? 'Regionen' : selectedLkCount === 1
    ? (() => {
        for (const lks of Object.values(grouped)) {
          for (const [lkName, regs] of Object.entries(lks)) {
            if (lkIsSelected(regs)) return lkName;
          }
        }
        return '1 Region';
      })()
    : `${selectedLkCount} Landkreise`;

  const Chevron = ({ expanded, className }: { expanded: boolean; className?: string }) => (
    <svg
      className={`w-3 h-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''} ${className || ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
          selectedLkCount > 0
            ? 'border-bd-accent text-bd-accent bg-bd-accent-dim'
            : 'border-bd-border bg-bd-card hover:border-bd-border-accent text-bd-text-body'
        }`}
      >
        <span className="truncate max-w-[200px]">{label}</span>
        <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 w-80 max-h-80 overflow-auto bg-bd-card border border-bd-border rounded-lg shadow-xl">
          {/* Clear button */}
          {selectedLkCount > 0 && (
            <button
              onClick={() => { onClear(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-xs text-bd-text-muted hover:bg-bd-card-hover border-b border-bd-border transition-colors"
            >
              Alle Regionen anzeigen
            </button>
          )}

          {Object.entries(grouped).map(([bundesland, landkreise]) => {
            const blExpanded = expandedBl.has(bundesland);
            const blSel = blSelectedCount(landkreise);
            const blLeads = blTotalLeads(landkreise);

            return (
              <div key={bundesland}>
                {/* Bundesland row — collapsible */}
                <button
                  onClick={() => toggleBl(bundesland)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bd-card-hover transition-colors border-b border-bd-border/50"
                >
                  <Chevron expanded={blExpanded} className="text-bd-text-muted" />
                  <span className="flex-1 text-left text-xs font-bold uppercase tracking-wider text-bd-text-muted">
                    {bundesland}
                  </span>
                  {blSel > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bd-accent/20 text-bd-accent">
                      {blSel}
                    </span>
                  )}
                  <span className="text-[10px] text-bd-text-muted">{blLeads}</span>
                </button>

                {/* Landkreise — visible when bundesland expanded */}
                {blExpanded && Object.entries(landkreise).map(([landkreis, regs]) => {
                  const isActive = lkIsSelected(regs);
                  const leads = lkLeads(regs);

                  return (
                    <button
                      key={landkreis}
                      onClick={() => onToggleGroup(lkRegionIds(regs))}
                      className={`w-full flex items-center gap-3 pl-7 pr-3 py-2 text-sm transition-colors ${
                        isActive ? 'bg-bd-accent-dim text-bd-accent' : 'hover:bg-bd-card-hover text-bd-text-body'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${
                        isActive ? 'border-bd-accent bg-bd-accent text-bd-bg' : 'border-bd-border'
                      }`}>
                        {isActive && '\u2713'}
                      </span>
                      <span className="flex-1 text-left text-xs font-semibold">
                        {landkreis}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-bd-accent/20 text-bd-accent' : 'bg-bd-bg-secondary text-bd-text-muted'
                      }`}>
                        {leads}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="h-1" />
        </div>
      )}
    </div>
  );
}

function ColumnFilterTh({ label, value, onChange, options, multi = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; color?: string }[];
  multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const isActive = value !== '';
  const selectedSet = new Set(value ? value.split(',') : []);

  const handleSelect = (optValue: string) => {
    if (multi) {
      const next = new Set(selectedSet);
      if (next.has(optValue)) {
        next.delete(optValue);
      } else {
        next.add(optValue);
      }
      onChange(Array.from(next).join(','));
    } else {
      onChange(selectedSet.has(optValue) ? '' : optValue);
      setOpen(false);
    }
  };

  return (
    <th ref={ref} className="px-4 py-3 text-xs font-medium uppercase tracking-wider relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 transition-colors select-none ${
          isActive ? 'text-bd-accent' : 'text-bd-text-muted hover:text-bd-text'
        }`}
      >
        {label}
        {isActive && <span className="text-[9px] ml-0.5">&#x25CF;</span>}
        {multi && selectedSet.size > 1 && <span className="text-[9px] ml-0.5">{selectedSet.size}</span>}
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 w-52 max-h-72 overflow-auto bg-bd-card border border-bd-border rounded-lg shadow-xl">
          {/* All option */}
          <button
            onClick={() => { onChange(''); if (!multi) setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
              !value ? 'bg-bd-accent-dim text-bd-accent font-semibold' : 'hover:bg-bd-card-hover text-bd-text-body'
            }`}
          >
            Alle anzeigen
          </button>
          <div className="border-t border-bd-border" />
          {options.map((opt) => {
            const selected = selectedSet.has(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                  selected ? 'bg-bd-accent-dim text-bd-accent font-semibold' : 'hover:bg-bd-card-hover text-bd-text-body'
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 text-[8px] ${
                  selected ? 'border-bd-accent bg-bd-accent text-bd-bg' : 'border-bd-border'
                }`}>
                  {selected && '\u2713'}
                </span>
                <span className={opt.color && !selected ? opt.color : ''}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </th>
  );
}
