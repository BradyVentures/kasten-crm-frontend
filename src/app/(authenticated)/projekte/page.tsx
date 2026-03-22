'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Project, ProjectStatus, User } from '@/types';
import { formatCurrency, formatRelative } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

// ─── Status config ──────────────────────────────────────────

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

const KANBAN_COLUMNS: ProjectStatus[] = [
  'entwurf', 'angebot', 'verhandlung', 'beauftragt', 'in_umsetzung', 'live',
];

type ViewMode = 'list' | 'kanban';

export default function ProjektePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [search, setSearch] = useState('');

  // ─── Data fetching ──────────────────────────────────────

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (assignedFilter) params.set('assigned_to', assignedFilter);
    if (search) params.set('search', search);
    return params.toString();
  }, [statusFilter, assignedFilter, search]);

  const { data: projects, refetch } = usePolling<Project[]>(
    () => api.get(`/projects?${buildQuery()}`).then((r) => r.data),
    5000
  );

  const { data: users } = usePolling<User[]>(
    () => api.get('/users').then((r) => r.data),
    30000
  );

  // ─── Kanban drag & drop ─────────────────────────────────

  const dragProject = useRef<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  const handleDragStart = (projectId: string) => {
    dragProject.current = projectId;
  };

  const handleDragOver = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (status: ProjectStatus) => {
    const projectId = dragProject.current;
    dragProject.current = null;
    setDragOverColumn(null);
    if (!projectId) return;

    const project = (projects || []).find((p) => p.id === projectId);
    if (!project || project.status === status) return;

    try {
      await api.patch(`/projects/${projectId}`, { status });
      refetch();
    } catch {
      alert('Fehler beim Aktualisieren des Status');
    }
  };

  // ─── Helpers ────────────────────────────────────────────

  const getJahreswert = (p: Project) =>
    Number(p.total_setup_price_customer || 0) + Number(p.total_monthly_price_customer || 0) * 12;

  const getDisplayName = (p: Project) =>
    p.customer_name || p.prospect_name || '–';

  // ─── Render ─────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl font-bold">Projekte</h1>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-bd-border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-bd-accent text-bd-bg font-semibold'
                  : 'bg-bd-card text-bd-text-body hover:bg-bd-card-hover'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-bd-accent text-bd-bg font-semibold'
                  : 'bg-bd-card text-bd-text-body hover:bg-bd-card-hover'
              }`}
            >
              Kanban
            </button>
          </div>
          <Link
            href="/projekte/neu"
            className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
          >
            + Neues Projekt
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Alle Status</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}>
          <option value="">Alle Mitarbeiter</option>
          {(users || []).filter((u) => u.is_active).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-56"
        />
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-bd-card rounded-bd border border-bd-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bd-border">
                {['Titel', 'Kunde', 'Status', 'Module', 'Setup', 'Monatlich', 'Jahreswert', 'Zugewiesen', 'Aktualisiert'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(projects || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-bd-text-muted">
                    Keine Projekte gefunden
                  </td>
                </tr>
              ) : (
                (projects || []).map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/projekte/${p.id}`)}
                    className="border-b border-bd-border last:border-0 hover:bg-bd-card-hover cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3 text-bd-text-body">{getDisplayName(p)}</td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_CONFIG[p.status].color} bg={STATUS_CONFIG[p.status].bg}>
                        {STATUS_CONFIG[p.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-bd-text-body">{p.module_count || 0}</td>
                    <td className="px-4 py-3 text-bd-text-body">{formatCurrency(Number(p.total_setup_price_customer || 0))}</td>
                    <td className="px-4 py-3 text-bd-text-body">{formatCurrency(Number(p.total_monthly_price_customer || 0))}</td>
                    <td className="px-4 py-3 font-medium text-bd-accent">{formatCurrency(getJahreswert(p))}</td>
                    <td className="px-4 py-3 text-bd-text-body">{p.assigned_to_name || '–'}</td>
                    <td className="px-4 py-3 text-xs text-bd-text-muted">{formatRelative(p.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => {
            const columnProjects = (projects || []).filter((p) => p.status === status);
            const isOver = dragOverColumn === status;
            return (
              <div
                key={status}
                className={`flex-shrink-0 w-72 bg-bd-bg-secondary rounded-bd border transition-colors ${
                  isOver ? 'border-bd-accent' : 'border-bd-border'
                }`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-3 border-b border-bd-border">
                  <div className="flex items-center gap-2">
                    <Badge color={STATUS_CONFIG[status].color} bg={STATUS_CONFIG[status].bg}>
                      {STATUS_CONFIG[status].label}
                    </Badge>
                    <span className="text-xs text-bd-text-muted">{columnProjects.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[120px]">
                  {columnProjects.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(p.id)}
                      onClick={() => router.push(`/projekte/${p.id}`)}
                      className="bg-bd-card rounded-lg border border-bd-border p-3 cursor-grab active:cursor-grabbing hover:border-bd-accent/50 transition-colors"
                    >
                      <p className="font-medium text-sm mb-1 truncate">{p.title}</p>
                      <p className="text-xs text-bd-text-muted mb-2 truncate">{getDisplayName(p)}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-bd-text-muted">{p.module_count || 0} Module</span>
                        <span className="text-bd-accent font-medium">{formatCurrency(getJahreswert(p))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
