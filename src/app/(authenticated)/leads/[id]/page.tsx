'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/context/AuthContext';
import { Lead, LeadActivity, User, LeadStatus } from '@/types';
import { STATUS_CONFIG, ACTIVITY_LABELS, formatRelative, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

const ALL_STATUSES: LeadStatus[] = ['neu', 'kontaktiert', 'qualifiziert', 'angebot', 'gewonnen', 'verloren'];

function getRatingColor(rating: number | null): string {
  if (!rating) return 'text-bd-text-muted';
  if (rating <= 3) return 'text-red-400';
  if (rating <= 5) return 'text-orange-400';
  if (rating <= 7) return 'text-yellow-400';
  return 'text-green-400';
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedByOther, setLockedByOther] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [showActivity, setShowActivity] = useState(false);
  const [showConvert, setShowConvert] = useState(false);

  // Acquire lock on mount
  useEffect(() => {
    let heartbeat: NodeJS.Timeout;

    const acquireLock = async () => {
      try {
        const { data } = await api.post(`/leads/${id}/lock`);
        if (data.locked) {
          setLocked(true);
          setLockedByOther(null);
        }
      } catch (err: unknown) {
        const error = err as { response?: { status: number; data?: { locked_by?: string } } };
        if (error.response?.status === 409) {
          setLockedByOther(error.response.data?.locked_by || 'Anderer Benutzer');
        }
      }
    };

    acquireLock();
    heartbeat = setInterval(acquireLock, 120000); // 2 min heartbeat

    return () => {
      clearInterval(heartbeat);
      api.delete(`/leads/${id}/lock`).catch(() => {});
    };
  }, [id]);

  // Release lock on page unload
  useEffect(() => {
    const handleUnload = () => {
      navigator.sendBeacon(`${process.env.NEXT_PUBLIC_API_URL}/leads/${id}/lock`);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [id]);

  // Fetch lead data
  const fetchLead = useCallback(async () => {
    const { data } = await api.get(`/leads/${id}`);
    setLead(data);
    return data;
  }, [id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const { data: activities } = usePolling<LeadActivity[]>(
    () => api.get(`/leads/${id}/activities`).then((r) => r.data),
    10000
  );

  const { data: users } = usePolling<User[]>(
    () => api.get('/users').then((r) => r.data),
    30000
  );

  const handleStatusChange = async (status: LeadStatus) => {
    await api.patch(`/leads/${id}/status`, { status });
    fetchLead();
  };

  const handleAssign = async (assignedTo: string | null) => {
    await api.patch(`/leads/${id}/assign`, { assigned_to: assignedTo || null });
    fetchLead();
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Aktivität wirklich löschen?')) return;
    try {
      await api.delete(`/leads/${id}/activities/${activityId}`);
      fetchLead();
    } catch {
      alert('Fehler beim Löschen der Aktivität');
    }
  };

  const startEditing = () => {
    if (!lead) return;
    setEditForm({
      company_name: lead.company_name || '',
      contact_person: lead.contact_person || '',
      email: lead.email || '',
      phone: lead.phone || '',
      website: lead.website || '',
      address: lead.address || '',
      postal_code: lead.postal_code || '',
      city: lead.city || '',
      branche: lead.branche || '',
      website_rating: lead.website_rating?.toString() ?? '',
      source: lead.source || '',
      notes: lead.notes || '',
      website_check_notes: lead.website_check_notes || '',
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/leads/${id}`, {
        ...editForm,
        website_rating: editForm.website_rating ? Number(editForm.website_rating) : null,
      });
      await fetchLead();
      setEditing(false);
    } catch {
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!confirm(`Lead "${lead?.company_name}" wirklich endgültig löschen? Alle Aktivitäten werden ebenfalls gelöscht.`)) return;
    try {
      await api.delete(`/leads/${id}`);
      router.push('/leads');
    } catch {
      alert('Fehler beim Löschen des Leads');
    }
  };

  const toggleWebsiteChecked = async () => {
    try {
      await api.put(`/leads/${id}`, { website_checked: !lead?.website_checked });
      fetchLead();
    } catch {
      alert('Fehler beim Speichern');
    }
  };

  if (!lead) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-bd-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const readOnly = !!lockedByOther;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-bd-text-muted hover:text-bd-text mb-2 block">
            ← Zurück zu Leads
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold">{lead.company_name}</h1>
            {!readOnly && (
              <button
                onClick={toggleWebsiteChecked}
                title={lead.website_checked ? 'Website geprüft' : 'Website noch nicht geprüft'}
                className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm transition-all ${
                  lead.website_checked
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-bd-border hover:border-bd-text-muted text-transparent hover:text-bd-text-muted'
                }`}
              >
                {lead.website_checked ? '\u2713' : '\u2713'}
              </button>
            )}
            {readOnly && lead.website_checked && (
              <span className="shrink-0 w-7 h-7 rounded-full border-2 border-green-500 bg-green-500/20 text-green-400 flex items-center justify-center text-sm" title="Website geprüft">
                {'\u2713'}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {lead.status !== 'gewonnen' && lead.status !== 'verloren' && !readOnly && (
            <button onClick={() => setShowConvert(true)} className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all">
              In Kunde umwandeln
            </button>
          )}
          {!readOnly && (
            <button onClick={handleDeleteLead} className="px-4 py-2 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
              Löschen
            </button>
          )}
        </div>
      </div>

      {lockedByOther && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm text-yellow-400">
          Wird bearbeitet von {lockedByOther} – Nur-Lesen-Modus
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold">Lead-Details</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                {!readOnly && !editing && (
                  <button onClick={startEditing} className="px-3 py-1.5 text-sm border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors">
                    Bearbeiten
                  </button>
                )}
                {!readOnly && (
                  <>
                    <select value={lead.status} onChange={(e) => handleStatusChange(e.target.value as LeadStatus)} className="text-sm">
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                    <select value={lead.assigned_to || ''} onChange={(e) => handleAssign(e.target.value || null)} className="text-sm">
                      <option value="">Nicht zugewiesen</option>
                      {(users || []).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Firmenname *</label>
                    <input required className="w-full text-sm" value={editForm.company_name} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Kontaktperson</label>
                    <input className="w-full text-sm" value={editForm.contact_person} onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">E-Mail</label>
                    <input type="email" className="w-full text-sm" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Telefon</label>
                    <input className="w-full text-sm" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Website</label>
                    <input className="w-full text-sm" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Website-Rating (1-10)</label>
                    <select className="w-full text-sm" value={editForm.website_rating} onChange={(e) => setEditForm({ ...editForm, website_rating: e.target.value })}>
                      <option value="">Kein Rating</option>
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                        <option key={n} value={n}>{n}/10</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Adresse</label>
                    <input className="w-full text-sm" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">PLZ</label>
                    <input className="w-full text-sm" value={editForm.postal_code} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Stadt</label>
                    <input className="w-full text-sm" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Branche</label>
                    <input className="w-full text-sm" value={editForm.branche} onChange={(e) => setEditForm({ ...editForm, branche: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Quelle</label>
                    <input className="w-full text-sm" value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-bd-text-muted mb-1">Web Check</label>
                  <textarea rows={15} className="w-full text-sm" placeholder="Ergebnisse der Website-Prüfung..." value={editForm.website_check_notes} onChange={(e) => setEditForm({ ...editForm, website_check_notes: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-bd-text-muted mb-1">Notizen</label>
                  <textarea rows={6} className="w-full text-sm" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 text-sm border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-bd-text-muted">Status</span>
                    <div className="mt-1">
                      <Badge color={STATUS_CONFIG[lead.status].color} bg={STATUS_CONFIG[lead.status].bg}>
                        {STATUS_CONFIG[lead.status].label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Zugewiesen an</span>
                    <p className="mt-1">{lead.assigned_to_name || '–'}</p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Kontaktperson</span>
                    <p className="mt-1">{lead.contact_person || '–'}</p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">E-Mail</span>
                    <p className="mt-1">{lead.email || '–'}</p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Telefon</span>
                    <p className="mt-1">{lead.phone || '–'}</p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Website</span>
                    <p className="mt-1">
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-bd-accent hover:underline"
                        >
                          {lead.website}
                        </a>
                      ) : '–'}
                    </p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Adresse</span>
                    <p className="mt-1">{lead.address || '–'}</p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">PLZ / Stadt</span>
                    <p className="mt-1">{[lead.postal_code, lead.city].filter(Boolean).join(' ') || '–'}</p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Quelle</span>
                    <p className="mt-1">{lead.source || '–'}</p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Branche</span>
                    <p className="mt-1">
                      {lead.branche ? (
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-bd-bg-secondary text-bd-text-secondary border border-bd-border">
                          {lead.branche}
                        </span>
                      ) : '–'}
                    </p>
                  </div>
                  <div>
                    <span className="text-bd-text-muted">Website-Rating</span>
                    <p className="mt-1">
                      {lead.website_rating ? (
                        <span className={`font-semibold ${getRatingColor(lead.website_rating)}`}>
                          {lead.website_rating}/10
                        </span>
                      ) : '–'}
                    </p>
                  </div>
                </div>

                {/* Web Check Notes */}
                <div className="mt-4 pt-4 border-t border-bd-border">
                  <span className="text-sm text-bd-text-muted">Web Check</span>
                  {!readOnly ? (
                    <InlineTextarea leadId={id} field="website_check_notes" value={lead.website_check_notes || ''} placeholder="Ergebnisse der Website-Prüfung..." rows={15} onSaved={fetchLead} />
                  ) : (
                    <p className="mt-1 text-sm text-bd-text-body whitespace-pre-wrap">{lead.website_check_notes || '–'}</p>
                  )}
                </div>

                {/* Notizen */}
                <div className="mt-4 pt-4 border-t border-bd-border">
                  <span className="text-sm text-bd-text-muted">Notizen</span>
                  {!readOnly ? (
                    <InlineTextarea leadId={id} field="notes" value={lead.notes || ''} placeholder="Notizen zum Lead..." onSaved={fetchLead} />
                  ) : (
                    <p className="mt-1 text-sm text-bd-text-body whitespace-pre-wrap">{lead.notes || '–'}</p>
                  )}
                </div>
              </>
            )}

            <p className="text-xs text-bd-text-muted mt-4">Erstellt: {formatDate(lead.created_at)}</p>
          </div>
        </div>

        {/* Activity Timeline */}
        <div>
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold">Aktivitäten</h2>
              {!readOnly && (
                <button onClick={() => setShowActivity(true)} className="text-xs text-bd-accent hover:brightness-110">
                  + Hinzufügen
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[500px] overflow-auto">
              {(activities || []).map((a) => (
                <div key={a.id} className="flex gap-3 py-2 border-b border-bd-border last:border-0 group">
                  <div className="w-6 h-6 rounded-full bg-bd-accent/10 text-bd-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {a.user_name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{a.user_name}</span>
                      <Badge className="ml-2" color="text-bd-text-secondary" bg="bg-bd-bg-secondary">
                        {ACTIVITY_LABELS[a.type] || a.type}
                      </Badge>
                    </p>
                    {a.description && <p className="text-xs text-bd-text-body mt-0.5">{a.description}</p>}
                    <p className="text-[11px] text-bd-text-muted mt-0.5">{formatRelative(a.created_at)}</p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteActivity(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-bd-text-muted hover:text-red-400 transition-opacity shrink-0 mt-0.5 text-xs"
                      title="Aktivität löschen"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <p className="text-sm text-bd-text-muted">Keine Aktivitäten.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Activity Modal */}
      <AddActivityModal leadId={id} open={showActivity} onClose={() => setShowActivity(false)} onAdded={fetchLead} />

      {/* Convert Modal — now with editable form */}
      <ConvertToCustomerModal
        lead={lead}
        users={users || []}
        open={showConvert}
        onClose={() => setShowConvert(false)}
      />
    </div>
  );
}

function ConvertToCustomerModal({ lead, users, open, onClose }: {
  lead: Lead;
  users: User[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    postal_code: '',
    city: '',
    assigned_to: '',
    notes: '',
  });

  // Pre-fill form when modal opens or lead changes
  useEffect(() => {
    if (open && lead) {
      setForm({
        company_name: lead.company_name || '',
        contact_person: lead.contact_person || '',
        email: lead.email || '',
        phone: lead.phone || '',
        website: lead.website || '',
        address: lead.address || '',
        postal_code: lead.postal_code || '',
        city: lead.city || '',
        assigned_to: lead.assigned_to || '',
        notes: lead.notes || '',
      });
    }
  }, [open, lead]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(`/leads/${lead.id}/convert`, {
        ...form,
        assigned_to: form.assigned_to || null,
      });
      router.push(`/kunden/${data.id}`);
    } catch {
      alert('Fehler bei der Konvertierung');
    } finally {
      setLoading(false);
    }
  };

  const emptyBorder = (value: string) => !value.trim() ? 'border-orange-500/50' : '';

  return (
    <Modal open={open} onClose={onClose} title="In Kunde umwandeln">
      <p className="text-sm text-bd-text-body mb-4">
        Prüfe und ergänze die Daten, bevor der Kunde angelegt wird. Der Lead-Status wird auf &quot;Gewonnen&quot; gesetzt.
      </p>
      <form onSubmit={handleConvert} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Firmenname *</label>
          <input
            required
            className={`w-full ${emptyBorder(form.company_name)}`}
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Kontaktperson</label>
            <input
              className={`w-full ${emptyBorder(form.contact_person)}`}
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Telefon</label>
            <input
              className={`w-full ${emptyBorder(form.phone)}`}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">E-Mail</label>
            <input
              type="email"
              className={`w-full ${emptyBorder(form.email)}`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Website</label>
            <input
              className={`w-full ${emptyBorder(form.website)}`}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Adresse</label>
          <input
            className={`w-full ${emptyBorder(form.address)}`}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">PLZ</label>
            <input
              className={`w-full ${emptyBorder(form.postal_code)}`}
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Stadt</label>
            <input
              className={`w-full ${emptyBorder(form.city)}`}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {loading ? 'Wird angelegt...' : 'Kunde anlegen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddActivityModal({ leadId, open, onClose, onAdded }: {
  leadId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [type, setType] = useState<'anruf' | 'email' | 'notiz'>('anruf');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/leads/${leadId}/activities`, { type, description });
      onAdded();
      onClose();
      setDescription('');
    } catch {
      alert('Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Aktivität hinzufügen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Typ</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'anruf' | 'email' | 'notiz')} className="w-full">
            <option value="anruf">Anruf</option>
            <option value="email">E-Mail</option>
            <option value="notiz">Notiz</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Beschreibung</label>
          <textarea rows={3} required className="w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </form>
    </Modal>
  );
}

function InlineTextarea({ leadId, field, value, placeholder, rows = 6, onSaved }: { leadId: string; field: string; value: string; placeholder: string; rows?: number; onSaved: () => void }) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const changed = text !== value;

  useEffect(() => { setText(value); }, [value]);

  const save = async () => {
    if (!changed) return;
    setSaving(true);
    try {
      await api.put(`/leads/${leadId}`, { [field]: text });
      onSaved();
    } catch {
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1">
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full text-sm"
      />
      {changed && (
        <div className="flex justify-end mt-1">
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1 text-xs bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {saving ? '...' : 'Speichern'}
          </button>
        </div>
      )}
    </div>
  );
}
