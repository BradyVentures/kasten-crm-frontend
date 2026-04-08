'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardStats, OfferSummary } from '@/types';
import { formatCurrency, formatDate, OFFER_STATUS_CONFIG } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOffers, setRecentOffers] = useState<OfferSummary[]>([]);

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data));
    api.get('/dashboard/recent-offers').then((r) => setRecentOffers(r.data));
  }, []);

  const statCards = [
    { label: 'Kunden', value: stats?.total_customers ?? '-' },
    { label: 'Offene Angebote', value: stats ? stats.offers_draft + stats.offers_sent : '-' },
    { label: 'Angenommen', value: stats?.offers_accepted ?? '-' },
    { label: 'Umsatz (angenommen)', value: stats ? formatCurrency(stats.accepted_revenue) : '-' },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-bd p-5 border border-bd-border">
            <p className="text-sm text-bd-text-muted">{card.label}</p>
            <p className="text-2xl font-bold font-heading mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Offer Pipeline */}
      {stats && (
        <div className="bg-white rounded-bd p-5 border border-bd-border mb-8">
          <h2 className="font-heading text-lg font-semibold mb-4">Angebots-Pipeline</h2>
          <div className="space-y-2.5">
            {(['entwurf', 'gesendet', 'angenommen', 'abgelehnt'] as const).map((status) => {
              const countMap: Record<string, number> = {
                entwurf: stats.offers_draft,
                gesendet: stats.offers_sent,
                angenommen: stats.offers_accepted,
                abgelehnt: stats.offers_declined,
              };
              const count = countMap[status];
              const total = Math.max(stats.offers_total, 1);
              const pct = (count / total) * 100;
              const cfg = OFFER_STATUS_CONFIG[status];

              return (
                <div key={status} className="flex items-center gap-3">
                  <span className={`text-sm w-28 shrink-0 ${cfg.color}`}>{cfg.label}</span>
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

      {/* Monthly total */}
      {stats && (
        <div className="bg-white rounded-bd p-5 border border-bd-border mb-8">
          <h2 className="font-heading text-lg font-semibold mb-2">Angebotssumme (Monat)</h2>
          <p className="text-3xl font-bold text-bd-accent">{formatCurrency(stats.monthly_offer_total)}</p>
          <p className="text-sm text-bd-text-muted mt-1">{stats.open_todos} offene Todos</p>
        </div>
      )}

      {/* Recent Offers */}
      <div className="bg-white rounded-bd p-5 border border-bd-border">
        <h2 className="font-heading text-lg font-semibold mb-4">Letzte Angebote</h2>
        {recentOffers.length > 0 ? (
          <div className="space-y-2">
            {recentOffers.map((o) => {
              const cfg = OFFER_STATUS_CONFIG[o.status as keyof typeof OFFER_STATUS_CONFIG];
              return (
                <Link key={o.id} href={`/angebote/${o.id}`} className="flex items-center justify-between py-2 border-b border-bd-border last:border-0 hover:bg-bd-bg-secondary/50 -mx-2 px-2 rounded transition-colors">
                  <div>
                    <span className="font-medium text-sm">{o.offer_number}</span>
                    <span className="text-sm text-bd-text-muted ml-2">{o.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg?.bg} ${cfg?.color}`}>
                      {cfg?.label}
                    </span>
                    <span className="text-sm font-medium">{formatCurrency(parseFloat(String(o.gross_total)))}</span>
                    <span className="text-xs text-bd-text-muted">{formatDate(o.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-bd-text-muted">Noch keine Angebote vorhanden.</p>
        )}
      </div>
    </div>
  );
}
