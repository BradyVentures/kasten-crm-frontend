'use client';

import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { DashboardStats, LeadActivity } from '@/types';
import { formatCurrency, formatRelative, STATUS_CONFIG, ACTIVITY_LABELS } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

export default function DashboardPage() {
  const { data: stats } = usePolling<DashboardStats>(
    () => api.get('/dashboard/stats').then((r) => r.data),
    10000
  );

  const { data: activities } = usePolling<LeadActivity[]>(
    () => api.get('/dashboard/recent-activity').then((r) => r.data),
    10000
  );

  const statCards = [
    {
      label: 'Offene Leads',
      value: stats
        ? (stats.leads_by_status['neu'] || 0) +
          (stats.leads_by_status['kontaktiert'] || 0) +
          (stats.leads_by_status['qualifiziert'] || 0) +
          (stats.leads_by_status['angebot'] || 0)
        : '-',
    },
    { label: 'Gewonnen', value: stats?.won_leads ?? '-' },
    { label: 'Konvertierungsrate', value: stats ? `${stats.conversion_rate}%` : '-' },
    { label: 'Gesamtumsatz', value: stats ? formatCurrency(stats.total_revenue) : '-' },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <p className="text-sm text-bd-text-secondary">{card.label}</p>
            <p className="text-2xl font-bold font-heading mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Conversion Funnel */}
      {stats && (
        <div className="bg-bd-card rounded-bd p-5 border border-bd-border mb-8">
          <h2 className="font-heading text-lg font-semibold mb-4">Lead-Pipeline</h2>
          <div className="space-y-2.5">
            {(['neu', 'kontaktiert', 'qualifiziert', 'angebot', 'gewonnen', 'verloren'] as const).map((status) => {
              const count = stats.leads_by_status[status] || 0;
              const total = Math.max(stats.total_leads, 1);
              const pct = (count / total) * 100;
              const cfg = STATUS_CONFIG[status];

              return (
                <div key={status} className="flex items-center gap-3">
                  <span className={`text-sm w-28 ${cfg.color}`}>{cfg.label}</span>
                  <div className="flex-1 bg-bd-bg-secondary rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.bg} flex items-center pl-2`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    >
                      <span className="text-xs font-medium">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Revenue */}
      {stats && (
        <div className="bg-bd-card rounded-bd p-5 border border-bd-border mb-8">
          <h2 className="font-heading text-lg font-semibold mb-2">Monatlicher Umsatz</h2>
          <p className="text-3xl font-bold text-bd-accent">{formatCurrency(stats.monthly_revenue)}</p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
        <h2 className="font-heading text-lg font-semibold mb-4">Letzte Aktivitäten</h2>
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-bd-border last:border-0">
                <div className="w-7 h-7 rounded-full bg-bd-accent/10 text-bd-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {a.user_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.user_name}</span>
                    <span className="text-bd-text-secondary"> – </span>
                    <Badge color={STATUS_CONFIG[a.type as keyof typeof STATUS_CONFIG]?.color || 'text-bd-text-secondary'}
                           bg={STATUS_CONFIG[a.type as keyof typeof STATUS_CONFIG]?.bg || 'bg-bd-bg-secondary'}>
                      {ACTIVITY_LABELS[a.type] || a.type}
                    </Badge>
                  </p>
                  <p className="text-xs text-bd-text-muted mt-0.5 truncate">
                    {a.company_name} {a.description && `– ${a.description}`}
                  </p>
                </div>
                <span className="text-xs text-bd-text-muted shrink-0">{formatRelative(a.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-bd-text-muted">Noch keine Aktivitäten vorhanden.</p>
        )}
      </div>
    </div>
  );
}
