'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Customer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

export default function KundenPage() {
  const [search, setSearch] = useState('');

  const { data } = usePolling(
    () => api.get(`/customers?search=${encodeURIComponent(search)}`).then((r) => r.data),
    10000
  );

  const customers = (data?.customers || []) as Customer[];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Kunden</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="bg-bd-card rounded-bd border border-bd-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-bd-border text-left">
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Firma</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Kontakt</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Services</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Umsatz</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Konvertiert</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/kunden/${c.id}`} className="font-medium hover:text-bd-accent transition-colors">
                    {c.company_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-bd-text-body">{c.contact_person || '–'}</td>
                <td className="px-4 py-3">
                  <Badge color="text-bd-accent" bg="bg-bd-accent-dim">
                    {c.service_count} Service{Number(c.service_count) !== 1 ? 's' : ''}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{formatCurrency(Number(c.total_revenue))}</td>
                <td className="px-4 py-3 text-xs text-bd-text-muted">{formatDate(c.converted_at)}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-bd-text-muted">
                  Keine Kunden gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-bd-text-muted mt-2">{data?.total || 0} Kunden insgesamt</p>
    </div>
  );
}
