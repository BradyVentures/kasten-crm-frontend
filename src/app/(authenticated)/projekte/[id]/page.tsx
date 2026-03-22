'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/context/AuthContext';
import {
  Project, ProjectStatus, ProjectModule, ProjectDocument, ProjectActivity,
  ProjectDocumentType, ModuleCategory, ModuleStatus, ModuleComplexity,
  ProjectActivityType, User,
} from '@/types';
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

// ─── Config Maps ──────────────────────────────────────────────

const PROJECT_STATUSES: ProjectStatus[] = [
  'entwurf', 'angebot', 'verhandlung', 'beauftragt', 'in_umsetzung', 'live', 'pausiert', 'abgebrochen',
];

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  entwurf:       { label: 'Entwurf',       color: 'text-gray-400',    bg: 'bg-gray-400/10' },
  angebot:       { label: 'Angebot',       color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  verhandlung:   { label: 'Verhandlung',   color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  beauftragt:    { label: 'Beauftragt',    color: 'text-green-400',   bg: 'bg-green-400/10' },
  in_umsetzung:  { label: 'In Umsetzung', color: 'text-purple-400',  bg: 'bg-purple-400/10' },
  live:          { label: 'Live',          color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  pausiert:      { label: 'Pausiert',      color: 'text-orange-400',  bg: 'bg-orange-400/10' },
  abgebrochen:   { label: 'Abgebrochen',   color: 'text-red-400',     bg: 'bg-red-400/10' },
};

const MODULE_STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; bg: string }> = {
  geplant:   { label: 'Geplant',   color: 'text-gray-400',   bg: 'bg-gray-400/10' },
  in_arbeit: { label: 'In Arbeit', color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  fertig:    { label: 'Fertig',    color: 'text-green-400',  bg: 'bg-green-400/10' },
  pausiert:  { label: 'Pausiert',  color: 'text-orange-400', bg: 'bg-orange-400/10' },
};

const ALL_MODULE_STATUSES: ModuleStatus[] = ['geplant', 'in_arbeit', 'fertig', 'pausiert'];

const CATEGORY_CONFIG: Record<ModuleCategory, { label: string; color: string; bg: string }> = {
  crm:              { label: 'CRM',              color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  ki_chatbot:       { label: 'KI-Chatbot',       color: 'text-purple-400',  bg: 'bg-purple-400/10' },
  ki_telefon:       { label: 'KI-Telefon',       color: 'text-violet-400',  bg: 'bg-violet-400/10' },
  automatisierung:  { label: 'Automatisierung',  color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  routenplanung:    { label: 'Routenplanung',    color: 'text-green-400',   bg: 'bg-green-400/10' },
  website:          { label: 'Website',          color: 'text-cyan-400',    bg: 'bg-cyan-400/10' },
  seo_marketing:    { label: 'SEO & Marketing',  color: 'text-pink-400',    bg: 'bg-pink-400/10' },
  analytics:        { label: 'Analytics',        color: 'text-teal-400',    bg: 'bg-teal-400/10' },
  sonstiges:        { label: 'Sonstiges',        color: 'text-gray-400',    bg: 'bg-gray-400/10' },
};

const ALL_CATEGORIES: ModuleCategory[] = [
  'crm', 'ki_chatbot', 'ki_telefon', 'automatisierung', 'routenplanung', 'website', 'seo_marketing', 'analytics', 'sonstiges',
];

const COMPLEXITY_CONFIG: Record<ModuleComplexity, string> = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch',
};

const ALL_COMPLEXITIES: ModuleComplexity[] = ['niedrig', 'mittel', 'hoch'];

const DOC_TYPE_CONFIG: Record<ProjectDocumentType, { label: string; color: string; bg: string }> = {
  briefing:         { label: 'Briefing',          color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  angebot:          { label: 'Angebot',           color: 'text-green-400',  bg: 'bg-green-400/10' },
  vertrag:          { label: 'Vertrag',           color: 'text-purple-400', bg: 'bg-purple-400/10' },
  av_vertrag:       { label: 'AV-Vertrag',        color: 'text-violet-400', bg: 'bg-violet-400/10' },
  kalkulation:      { label: 'Kalkulation',       color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  statusbericht:    { label: 'Statusbericht',     color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
  technische_doku:  { label: 'Technische Doku',   color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};

const ALL_DOC_TYPES: ProjectDocumentType[] = [
  'briefing', 'angebot', 'kalkulation', 'vertrag', 'av_vertrag', 'statusbericht', 'technische_doku',
];

const ACTIVITY_ICONS: Record<ProjectActivityType, string> = {
  erstellt: '\u2726',
  status_aenderung: '\u21BB',
  modul_hinzugefuegt: '+',
  modul_aktualisiert: '\u270E',
  dokument_erstellt: '\u25EB',
  notiz: '\u270E',
  meeting: '\u25C7',
  kalkulation_aktualisiert: '\u27F3',
};

type TabId = 'uebersicht' | 'module' | 'dokumente' | 'aktivitaeten';

// ─── Main Component ─────────────────────────────────────────────

export default function ProjektDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<TabId>('uebersicht');
  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Modals
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModule, setEditingModule] = useState<ProjectModule | null>(null);
  const [showGenerateDoc, setShowGenerateDoc] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Note form
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Quick action feedback
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [quickActionSuccess, setQuickActionSuccess] = useState<string | null>(null);

  // Recalculate
  const [recalculating, setRecalculating] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────

  const fetchProject = useCallback(async () => {
    const { data } = await api.get(`/projects/${id}`);
    setProject(data);
  }, [id]);

  const fetchModules = useCallback(async () => {
    const { data } = await api.get(`/projects/${id}/modules`);
    setModules(data || []);
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    const { data } = await api.get(`/projects/${id}/documents`);
    setDocuments(data || []);
  }, [id]);

  const fetchActivities = useCallback(async () => {
    const { data } = await api.get(`/projects/${id}/activities`);
    setActivities(data || []);
  }, [id]);

  useEffect(() => {
    fetchProject();
    fetchModules();
    fetchDocuments();
    fetchActivities();
    api.get('/users').then((r) => setUsers(r.data.filter((u: User) => u.is_active))).catch(() => {});
  }, [fetchProject, fetchModules, fetchDocuments, fetchActivities]);

  // Poll project data
  usePolling(
    () => api.get(`/projects/${id}`).then((r) => { setProject(r.data); return r.data; }),
    10000,
  );

  // ─── Actions ──────────────────────────────────────────────────

  const handleStatusChange = async (status: ProjectStatus) => {
    try {
      await api.patch(`/projects/${id}/status`, { status });
      fetchProject();
      fetchActivities();
    } catch {
      alert('Fehler beim Aktualisieren');
    }
  };

  const handleAssignChange = async (assignedTo: string) => {
    try {
      await api.put(`/projects/${id}`, { assigned_to: assignedTo || null });
      fetchProject();
      fetchActivities();
    } catch {
      alert('Fehler beim Zuweisen');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    try {
      await api.delete(`/projects/${id}`);
      router.push('/projekte');
    } catch {
      alert('Fehler beim Löschen');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post(`/projects/${id}/recalculate`);
      fetchProject();
      fetchModules();
    } catch {
      alert('Fehler beim Neuberechnen');
    } finally {
      setRecalculating(false);
    }
  };

  const handleQuickAction = async (type: ProjectDocumentType) => {
    const titleMap: Record<ProjectDocumentType, string> = {
      briefing: 'Meeting-Briefing',
      angebot: 'Kundenangebot',
      kalkulation: 'Interne Kalkulation',
      vertrag: 'Dienstleistungsvertrag',
      av_vertrag: 'AV-Vertrag',
      statusbericht: 'Statusbericht',
      technische_doku: 'Technische Dokumentation',
    };
    setQuickActionLoading(type);
    setQuickActionSuccess(null);
    try {
      await api.post(`/projects/${id}/documents/generate`, {
        type,
        title: `${titleMap[type]} \u2014 ${project?.title || ''}`,
      });
      setQuickActionSuccess(type);
      fetchDocuments();
      fetchActivities();
      setTimeout(() => {
        setQuickActionSuccess(null);
        setActiveTab('dokumente');
      }, 2000);
    } catch {
      alert('Fehler beim Generieren des Dokuments');
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Modul wirklich entfernen?')) return;
    try {
      await api.delete(`/projects/${id}/modules/${moduleId}`);
      fetchModules();
      fetchProject();
      fetchActivities();
    } catch {
      alert('Fehler beim Löschen');
    }
  };

  const handleModuleStatusChange = async (moduleId: string, status: ModuleStatus) => {
    try {
      await api.put(`/projects/${id}/modules/${moduleId}`, { status });
      fetchModules();
      fetchActivities();
    } catch {
      alert('Fehler beim Aktualisieren');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    try {
      await api.delete(`/projects/${id}/documents/${docId}`);
      fetchDocuments();
      fetchActivities();
    } catch {
      alert('Fehler beim Löschen');
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/projects/${id}/activities`, {
        type: 'notiz' as ProjectActivityType,
        description: noteText.trim(),
      });
      setNoteText('');
      fetchActivities();
    } catch {
      alert('Fehler beim Hinzufügen der Notiz');
    } finally {
      setAddingNote(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-bd-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Computed values ──────────────────────────────────────────

  const setupIntern = Number(project.total_setup_cost_internal || 0);
  const setupKunde = Number(project.total_setup_price_customer || 0);
  const setupMarge = setupKunde > 0 ? ((setupKunde - setupIntern) / setupKunde) * 100 : 0;

  const monthlyIntern = Number(project.total_monthly_cost_internal || 0);
  const monthlyKunde = Number(project.total_monthly_price_customer || 0);
  const monthlyMarge = monthlyKunde > 0 ? ((monthlyKunde - monthlyIntern) / monthlyKunde) * 100 : 0;

  const jahreswert = monthlyKunde * 12;
  const jahreswertIntern = monthlyIntern * 12;
  const gesamtwert = setupKunde + jahreswert;
  const gesamtwertIntern = setupIntern + jahreswertIntern;
  const gesamtMarge = gesamtwert > 0 ? ((gesamtwert - gesamtwertIntern) / gesamtwert) * 100 : 0;

  // Module totals for summary row
  const sortedModules = [...modules].sort(
    (a, b) => (a.phase || 99) - (b.phase || 99) || a.sort_order - b.sort_order,
  );

  const moduleSums = modules.reduce(
    (acc, m) => ({
      setup_cost_internal: acc.setup_cost_internal + Number(m.setup_cost_internal || 0),
      setup_price_customer: acc.setup_price_customer + Number(m.setup_price_customer || 0),
      monthly_cost_internal: acc.monthly_cost_internal + Number(m.monthly_cost_internal || 0),
      monthly_price_customer: acc.monthly_price_customer + Number(m.monthly_price_customer || 0),
      estimated_hours: acc.estimated_hours + Number(m.estimated_hours || 0),
    }),
    { setup_cost_internal: 0, setup_price_customer: 0, monthly_cost_internal: 0, monthly_price_customer: 0, estimated_hours: 0 },
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'uebersicht', label: 'Übersicht' },
    { id: 'module', label: `Module (${modules.length})` },
    { id: 'dokumente', label: `Dokumente (${documents.length})` },
    { id: 'aktivitaeten', label: 'Aktivitäten' },
  ];

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push('/projekte')}
        className="text-sm text-bd-text-muted hover:text-bd-text mb-4 block"
      >
        &larr; Zur&uuml;ck zu Projekte
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">{project.title}</h1>
          <Badge color={STATUS_CONFIG[project.status].color} bg={STATUS_CONFIG[project.status].bg}>
            {STATUS_CONFIG[project.status].label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            className="text-sm"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <select
            value={project.assigned_to || ''}
            onChange={(e) => handleAssignChange(e.target.value)}
            className="text-sm"
          >
            <option value="">Nicht zugewiesen</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {project.status === 'entwurf' && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
            >
              Löschen
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-bd-border mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-bd-accent text-bd-accent'
                : 'border-transparent text-bd-text-muted hover:text-bd-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Übersicht ─────────────────────────────────────── */}
      {activeTab === 'uebersicht' && (
        <div className="space-y-6">
          {/* Finance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Setup */}
            <div className="bg-bd-card rounded-bd p-4 border border-bd-border">
              <p className="text-xs text-bd-text-muted uppercase tracking-wider mb-2">Setup</p>
              {isAdmin && (
                <p className="text-xs text-bd-text-muted">Intern: {formatCurrency(setupIntern)}</p>
              )}
              <p className="text-lg font-bold">{formatCurrency(setupKunde)}</p>
              {isAdmin && setupMarge > 0 && (
                <p className="text-xs text-green-400 mt-1">Marge: {setupMarge.toFixed(1)}%</p>
              )}
            </div>

            {/* Monthly */}
            <div className="bg-bd-card rounded-bd p-4 border border-bd-border">
              <p className="text-xs text-bd-text-muted uppercase tracking-wider mb-2">Monatlich</p>
              {isAdmin && (
                <p className="text-xs text-bd-text-muted">Intern: {formatCurrency(monthlyIntern)}</p>
              )}
              <p className="text-lg font-bold">{formatCurrency(monthlyKunde)}</p>
              {isAdmin && monthlyMarge > 0 && (
                <p className="text-xs text-green-400 mt-1">Marge: {monthlyMarge.toFixed(1)}%</p>
              )}
            </div>

            {/* Jahreswert */}
            <div className="bg-bd-card rounded-bd p-4 border border-bd-border">
              <p className="text-xs text-bd-text-muted uppercase tracking-wider mb-2">Jahreswert</p>
              <p className="text-lg font-bold text-bd-accent">{formatCurrency(jahreswert)}</p>
              <p className="text-xs text-bd-text-muted mt-1">monatlich &times; 12</p>
            </div>

            {/* Gesamtwert */}
            <div className="bg-bd-card rounded-bd p-4 border border-bd-accent/30">
              <p className="text-xs text-bd-text-muted uppercase tracking-wider mb-2">Gesamtwert (1. Jahr)</p>
              <p className="text-lg font-bold text-bd-accent">{formatCurrency(gesamtwert)}</p>
              {isAdmin && gesamtMarge > 0 && (
                <p className="text-xs text-green-400 mt-1">Marge: {gesamtMarge.toFixed(1)}%</p>
              )}
              <p className="text-xs text-bd-text-muted mt-1">Setup + Jahreswert</p>
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <h2 className="font-heading font-semibold mb-4">Projektdetails</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <span className="text-bd-text-muted">Beschreibung</span>
                <p className="mt-1">{project.description || '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Kunde / Interessent</span>
                <p className="mt-1">
                  {project.customer_id ? (
                    <Link href={`/kunden/${project.customer_id}`} className="text-bd-accent hover:underline">
                      {project.customer_name}
                    </Link>
                  ) : project.prospect_name ? (
                    <span>
                      {project.prospect_name}
                      {project.prospect_contact && (
                        <span className="text-bd-text-muted"> ({project.prospect_contact})</span>
                      )}
                    </span>
                  ) : '\u2013'}
                </p>
              </div>
              {!project.customer_id && project.prospect_email && (
                <div>
                  <span className="text-bd-text-muted">E-Mail (Interessent)</span>
                  <p className="mt-1">{project.prospect_email}</p>
                </div>
              )}
              {!project.customer_id && project.prospect_phone && (
                <div>
                  <span className="text-bd-text-muted">Telefon (Interessent)</span>
                  <p className="mt-1">{project.prospect_phone}</p>
                </div>
              )}
              <div>
                <span className="text-bd-text-muted">Zugewiesen an</span>
                <p className="mt-1">{project.assigned_to_name || '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Geplanter Start</span>
                <p className="mt-1">{project.estimated_start ? formatDate(project.estimated_start) : '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Geplantes Ende</span>
                <p className="mt-1">{project.estimated_end ? formatDate(project.estimated_end) : '\u2013'}</p>
              </div>
              {project.actual_start && (
                <div>
                  <span className="text-bd-text-muted">Tatsächlicher Start</span>
                  <p className="mt-1">{formatDate(project.actual_start)}</p>
                </div>
              )}
              {project.actual_end && (
                <div>
                  <span className="text-bd-text-muted">Tatsächliches Ende</span>
                  <p className="mt-1">{formatDate(project.actual_end)}</p>
                </div>
              )}
              <div>
                <span className="text-bd-text-muted">Erstellt am</span>
                <p className="mt-1">{formatDate(project.created_at)}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Erstellt von</span>
                <p className="mt-1">{project.created_by_name || '\u2013'}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <h2 className="font-heading font-semibold mb-4">Schnellaktionen</h2>
            <div className="flex flex-wrap gap-2">
              <QuickActionButton
                label="Briefing generieren"
                type="briefing"
                loading={quickActionLoading}
                success={quickActionSuccess}
                onClick={handleQuickAction}
                variant="primary"
              />
              <QuickActionButton
                label="Angebot erstellen"
                type="angebot"
                loading={quickActionLoading}
                success={quickActionSuccess}
                onClick={handleQuickAction}
                variant="secondary"
              />
              {isAdmin && (
                <QuickActionButton
                  label="Kalkulation erstellen"
                  type="kalkulation"
                  loading={quickActionLoading}
                  success={quickActionSuccess}
                  onClick={handleQuickAction}
                  variant="secondary"
                />
              )}
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="px-4 py-2 text-sm border border-bd-border text-bd-text-body rounded-lg hover:bg-bd-card-hover transition-all disabled:opacity-50"
              >
                {recalculating ? 'Berechne...' : 'Finanzen aktualisieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Module ──────────────────────────────────────────── */}
      {activeTab === 'module' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddModule(true)}
              className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
            >
              + Modul hinzufügen
            </button>
          </div>

          <div className="bg-bd-card rounded-bd border border-bd-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bd-border">
                  <th className="text-left px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Kategorie</th>
                  <th className="text-left px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Phase</th>
                  <th className="text-left px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Komplexität</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Setup intern</th>
                  )}
                  <th className="text-right px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Setup Kunde</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Mtl. intern</th>
                  )}
                  <th className="text-right px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Mtl. Kunde</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Marge %</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Stunden</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedModules.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 12 : 8} className="text-center py-12 text-bd-text-muted">
                      Noch keine Module
                    </td>
                  </tr>
                ) : (
                  <>
                    {sortedModules.map((m) => {
                      const totalKunde = Number(m.setup_price_customer || 0) + Number(m.monthly_price_customer || 0) * 12;
                      const totalIntern = Number(m.setup_cost_internal || 0) + Number(m.monthly_cost_internal || 0) * 12;
                      const marge = totalKunde > 0 ? ((totalKunde - totalIntern) / totalKunde) * 100 : 0;
                      return (
                        <tr key={m.id} className="border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors">
                          <td className="px-4 py-3 font-medium">{m.name}</td>
                          <td className="px-4 py-3">
                            <Badge color={CATEGORY_CONFIG[m.category]?.color} bg={CATEGORY_CONFIG[m.category]?.bg}>
                              {CATEGORY_CONFIG[m.category]?.label || m.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-bd-text-body">{m.phase || '\u2013'}</td>
                          <td className="px-4 py-3 text-bd-text-body">{COMPLEXITY_CONFIG[m.complexity] || m.complexity}</td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right text-bd-text-muted">{formatCurrency(Number(m.setup_cost_internal || 0))}</td>
                          )}
                          <td className="px-4 py-3 text-right">{formatCurrency(Number(m.setup_price_customer || 0))}</td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right text-bd-text-muted">{formatCurrency(Number(m.monthly_cost_internal || 0))}</td>
                          )}
                          <td className="px-4 py-3 text-right">{formatCurrency(Number(m.monthly_price_customer || 0))}</td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <span className={marge > 0 ? 'text-green-400' : 'text-bd-text-muted'}>{marge.toFixed(1)}%</span>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <select
                              value={m.status}
                              onChange={(e) => handleModuleStatusChange(m.id, e.target.value as ModuleStatus)}
                              className="text-xs bg-transparent border border-bd-border rounded px-1.5 py-1"
                            >
                              {ALL_MODULE_STATUSES.map((s) => (
                                <option key={s} value={s}>{MODULE_STATUS_CONFIG[s].label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right text-bd-text-body">{m.estimated_hours || '\u2013'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingModule(m)}
                                className="px-2 py-1 text-xs border border-bd-border rounded hover:bg-bd-card-hover"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteModule(m.id)}
                                className="px-2 py-1 text-xs border border-red-500/30 text-red-400 rounded hover:bg-red-500/10"
                              >
                                Löschen
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Summary row */}
                    <tr className="border-t-2 border-bd-border bg-bd-bg-secondary font-semibold">
                      <td className="px-4 py-3">Gesamt</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right text-bd-text-muted">{formatCurrency(moduleSums.setup_cost_internal)}</td>
                      )}
                      <td className="px-4 py-3 text-right">{formatCurrency(moduleSums.setup_price_customer)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right text-bd-text-muted">{formatCurrency(moduleSums.monthly_cost_internal)}</td>
                      )}
                      <td className="px-4 py-3 text-right">{formatCurrency(moduleSums.monthly_price_customer)}</td>
                      {isAdmin && <td className="px-4 py-3"></td>}
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right">{moduleSums.estimated_hours > 0 ? moduleSums.estimated_hours : '\u2013'}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Add Module Modal */}
          <ModuleFormModal
            open={showAddModule}
            onClose={() => setShowAddModule(false)}
            projectId={id}
            isAdmin={isAdmin}
            onSaved={() => { fetchModules(); fetchProject(); fetchActivities(); setShowAddModule(false); }}
          />

          {/* Edit Module Modal */}
          {editingModule && (
            <ModuleFormModal
              open={!!editingModule}
              onClose={() => setEditingModule(null)}
              projectId={id}
              isAdmin={isAdmin}
              existingModule={editingModule}
              onSaved={() => { fetchModules(); fetchProject(); fetchActivities(); setEditingModule(null); }}
            />
          )}
        </div>
      )}

      {/* ─── Tab: Dokumente ───────────────────────────────────────── */}
      {activeTab === 'dokumente' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowGenerateDoc(true)}
              className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
            >
              + Dokument generieren
            </button>
          </div>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="bg-bd-card rounded-bd border border-bd-border p-8 text-center text-bd-text-muted">
                Noch keine Dokumente
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="bg-bd-card rounded-bd border border-bd-border">
                  <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        color={DOC_TYPE_CONFIG[doc.type]?.color || 'text-gray-400'}
                        bg={DOC_TYPE_CONFIG[doc.type]?.bg || 'bg-gray-400/10'}
                      >
                        {DOC_TYPE_CONFIG[doc.type]?.label || doc.type}
                      </Badge>
                      <span className="font-medium text-sm truncate">{doc.title}</span>
                      <span className="text-xs text-bd-text-muted flex-shrink-0">v{doc.version}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-bd-text-muted">{doc.created_by_name || 'System'}</span>
                      <span className="text-xs text-bd-text-muted">{formatDate(doc.created_at)}</span>
                      <button
                        onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                        className="px-3 py-1.5 text-xs border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors"
                      >
                        {expandedDocId === doc.id ? 'Schließen' : 'Anzeigen'}
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-3 py-1.5 text-xs border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                  {expandedDocId === doc.id && doc.generated_html && (
                    <div className="border-t border-bd-border px-4 py-4">
                      <div
                        className="bg-white rounded-lg p-6 text-black prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: doc.generated_html }}
                      />
                    </div>
                  )}
                  {expandedDocId === doc.id && !doc.generated_html && (
                    <div className="border-t border-bd-border px-4 py-4 text-center text-bd-text-muted text-sm">
                      Kein Inhalt vorhanden
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Generate Document Modal */}
          <GenerateDocumentModal
            open={showGenerateDoc}
            onClose={() => setShowGenerateDoc(false)}
            projectId={id}
            projectTitle={project.title}
            onCreated={() => { fetchDocuments(); fetchActivities(); setShowGenerateDoc(false); }}
          />
        </div>
      )}

      {/* ─── Tab: Aktivitäten ───────────────────────────────────── */}
      {activeTab === 'aktivitaeten' && (
        <div>
          {/* Add note form */}
          <div className="bg-bd-card rounded-bd border border-bd-border p-4 mb-4">
            <h3 className="font-heading text-sm font-semibold mb-2">Notiz hinzufügen</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              placeholder="Notiz hinzufügen..."
              className="w-full mb-2"
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !noteText.trim()}
              className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
            >
              {addingNote ? 'Speichere...' : 'Notiz hinzufügen'}
            </button>
          </div>

          {/* Activity list */}
          <div className="space-y-2">
            {activities.length === 0 ? (
              <div className="bg-bd-card rounded-bd border border-bd-border p-8 text-center text-bd-text-muted">
                Noch keine Aktivitäten
              </div>
            ) : (
              [...activities]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((a) => (
                  <div key={a.id} className="bg-bd-card rounded-bd border border-bd-border px-4 py-3 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-bd-bg-secondary flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {ACTIVITY_ICONS[a.type as ProjectActivityType] || '\u2022'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-bd-text-muted mt-0.5">
                        {a.user_name || 'System'} &middot; {formatRelative(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────

function QuickActionButton({
  label,
  type,
  loading,
  success,
  onClick,
  variant,
}: {
  label: string;
  type: ProjectDocumentType;
  loading: string | null;
  success: string | null;
  onClick: (type: ProjectDocumentType) => void;
  variant: 'primary' | 'secondary';
}) {
  const isLoading = loading === type;
  const isSuccess = success === type;

  const baseClass = variant === 'primary'
    ? 'px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50'
    : 'px-4 py-2 text-sm border border-bd-border text-bd-text-body rounded-lg hover:bg-bd-card-hover transition-all disabled:opacity-50';

  return (
    <button
      onClick={() => onClick(type)}
      disabled={isLoading || loading !== null}
      className={baseClass}
    >
      {isLoading ? 'Generiere...' : isSuccess ? '\u2713 Erstellt' : label}
    </button>
  );
}

// ─── Module Form Modal (Add + Edit) ──────────────────────────────

function ModuleFormModal({
  open,
  onClose,
  projectId,
  isAdmin,
  existingModule,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  isAdmin: boolean;
  existingModule?: ProjectModule;
  onSaved: () => void;
}) {
  const isEdit = !!existingModule;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'crm' as ModuleCategory,
    phase: '',
    complexity: 'mittel' as ModuleComplexity,
    status: 'geplant' as ModuleStatus,
    setup_cost_internal: '0',
    setup_price_customer: '0',
    monthly_cost_internal: '0',
    monthly_price_customer: '0',
    estimated_hours: '',
    estimated_weeks: '',
    tech_stack: '',
    dependencies: '',
    risks: '',
    dsgvo_notes: '',
  });

  useEffect(() => {
    if (!open) return;
    if (existingModule) {
      setForm({
        name: existingModule.name,
        description: existingModule.description || '',
        category: existingModule.category,
        phase: existingModule.phase !== null ? String(existingModule.phase) : '',
        complexity: existingModule.complexity,
        status: existingModule.status,
        setup_cost_internal: String(existingModule.setup_cost_internal || 0),
        setup_price_customer: String(existingModule.setup_price_customer || 0),
        monthly_cost_internal: String(existingModule.monthly_cost_internal || 0),
        monthly_price_customer: String(existingModule.monthly_price_customer || 0),
        estimated_hours: existingModule.estimated_hours !== null ? String(existingModule.estimated_hours) : '',
        estimated_weeks: existingModule.estimated_weeks !== null ? String(existingModule.estimated_weeks) : '',
        tech_stack: existingModule.tech_stack || '',
        dependencies: existingModule.dependencies || '',
        risks: existingModule.risks || '',
        dsgvo_notes: existingModule.dsgvo_notes || '',
      });
    } else {
      setForm({
        name: '', description: '', category: 'crm', phase: '', complexity: 'mittel', status: 'geplant',
        setup_cost_internal: '0', setup_price_customer: '0', monthly_cost_internal: '0', monthly_price_customer: '0',
        estimated_hours: '', estimated_weeks: '', tech_stack: '', dependencies: '', risks: '', dsgvo_notes: '',
      });
    }
  }, [open, existingModule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      phase: form.phase ? parseInt(form.phase) : null,
      complexity: form.complexity,
      status: form.status,
      setup_cost_internal: parseFloat(form.setup_cost_internal) || 0,
      setup_price_customer: parseFloat(form.setup_price_customer) || 0,
      monthly_cost_internal: parseFloat(form.monthly_cost_internal) || 0,
      monthly_price_customer: parseFloat(form.monthly_price_customer) || 0,
      estimated_hours: form.estimated_hours ? parseInt(form.estimated_hours) : null,
      estimated_weeks: form.estimated_weeks ? parseInt(form.estimated_weeks) : null,
      tech_stack: form.tech_stack || null,
      dependencies: form.dependencies || null,
      risks: form.risks || null,
      dsgvo_notes: form.dsgvo_notes || null,
    };
    try {
      if (isEdit && existingModule) {
        await api.put(`/projects/${projectId}/modules/${existingModule.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/modules`, payload);
      }
      onSaved();
    } catch {
      alert(isEdit ? 'Fehler beim Aktualisieren des Moduls' : 'Fehler beim Erstellen des Moduls');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modul bearbeiten' : 'Modul hinzufügen'}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Modulname" className="w-full" />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Beschreibung</label>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={2} className="w-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Kategorie</label>
            <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full">
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Komplexität</label>
            <select value={form.complexity} onChange={(e) => update('complexity', e.target.value)} className="w-full">
              {ALL_COMPLEXITIES.map((c) => (
                <option key={c} value={c}>{COMPLEXITY_CONFIG[c]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Phase</label>
            <input type="number" min="1" value={form.phase} onChange={(e) => update('phase', e.target.value)} placeholder="z.B. 1" className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Status</label>
            <select value={form.status} onChange={(e) => update('status', e.target.value)} className="w-full">
              {ALL_MODULE_STATUSES.map((s) => (
                <option key={s} value={s}>{MODULE_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Setup Kunde</label>
            <input type="number" step="0.01" min="0" value={form.setup_price_customer} onChange={(e) => update('setup_price_customer', e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Monatlich Kunde</label>
            <input type="number" step="0.01" min="0" value={form.monthly_price_customer} onChange={(e) => update('monthly_price_customer', e.target.value)} className="w-full" />
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-bd-text-secondary mb-1">Setup intern</label>
              <input type="number" step="0.01" min="0" value={form.setup_cost_internal} onChange={(e) => update('setup_cost_internal', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm text-bd-text-secondary mb-1">Monatlich intern</label>
              <input type="number" step="0.01" min="0" value={form.monthly_cost_internal} onChange={(e) => update('monthly_cost_internal', e.target.value)} className="w-full" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Geschätzte Stunden</label>
            <input type="number" min="0" value={form.estimated_hours} onChange={(e) => update('estimated_hours', e.target.value)} placeholder="z.B. 40" className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Geschätzte Wochen</label>
            <input type="number" min="0" value={form.estimated_weeks} onChange={(e) => update('estimated_weeks', e.target.value)} placeholder="z.B. 4" className="w-full" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Tech-Stack</label>
          <input type="text" value={form.tech_stack} onChange={(e) => update('tech_stack', e.target.value)} placeholder="z.B. React, Node.js, PostgreSQL" className="w-full" />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Abhängigkeiten</label>
          <input type="text" value={form.dependencies} onChange={(e) => update('dependencies', e.target.value)} placeholder="z.B. Modul A muss zuerst fertig sein" className="w-full" />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Risiken</label>
          <textarea value={form.risks} onChange={(e) => update('risks', e.target.value)} rows={2} className="w-full" placeholder="Bekannte Risiken..." />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">DSGVO-Hinweise</label>
          <textarea value={form.dsgvo_notes} onChange={(e) => update('dsgvo_notes', e.target.value)} rows={2} className="w-full" placeholder="Datenschutz-relevante Anmerkungen..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || !form.name.trim()} className="px-5 py-2.5 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50">
            {loading ? (isEdit ? 'Speichere...' : 'Erstelle...') : (isEdit ? 'Speichern' : 'Modul hinzufügen')}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-bd-border text-bd-text-body rounded-lg hover:bg-bd-card-hover transition-all">
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Generate Document Modal ──────────────────────────────────────

function GenerateDocumentModal({
  open,
  onClose,
  projectId,
  projectTitle,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<ProjectDocumentType>('briefing');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) { setType('briefing'); setTitle(''); }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/documents/generate`, {
        type,
        title: title || `${DOC_TYPE_CONFIG[type].label} \u2014 ${projectTitle}`,
      });
      onCreated();
    } catch {
      alert('Fehler beim Generieren des Dokuments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dokument generieren">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Dokumenttyp</label>
          <select value={type} onChange={(e) => setType(e.target.value as ProjectDocumentType)} className="w-full">
            {ALL_DOC_TYPES.map((t) => (
              <option key={t} value={t}>{DOC_TYPE_CONFIG[t].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Titel (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${DOC_TYPE_CONFIG[type].label} \u2014 ${projectTitle}`}
            className="w-full"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50">
            {loading ? 'Generiere...' : 'Generieren'}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm border border-bd-border text-bd-text-body rounded-lg hover:bg-bd-card-hover transition-all">
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  );
}
