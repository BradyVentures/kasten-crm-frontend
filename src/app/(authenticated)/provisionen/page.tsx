'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/context/AuthContext';
import { CommissionData, User } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ProvisionenPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (isAdmin && selectedEmployee) params.set('employee_id', selectedEmployee);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [isAdmin, selectedEmployee, dateFrom, dateTo]);

  const { data } = usePolling<CommissionData>(
    () => api.get(`/dashboard/commissions${buildQuery()}`).then(r => r.data),
    30000
  );

  const { data: users } = usePolling<User[]>(
    () => api.get('/users').then(r => r.data),
    60000
  );

  const summary = data?.summary || [];
  const details = data?.details || [];

  const totalCommission = summary.reduce((sum, s) => sum + Number(s.total_commission), 0);
  const totalRevenue = summary.reduce((sum, s) => sum + Number(s.total_revenue), 0);
  const totalSales = summary.reduce((sum, s) => sum + Number(s.total_sales), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Provisionen</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {isAdmin && (
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            <option value="">Alle Mitarbeiter</option>
            {(users || []).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs text-bd-text-muted">Von:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-bd-text-muted">Bis:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
        </div>
        {(dateFrom || dateTo || selectedEmployee) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setSelectedEmployee(''); }}
            className="text-xs text-bd-text-muted hover:text-bd-text transition-colors"
          >
            Filter zur\u00fccksetzen
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
          <p className="text-sm text-bd-text-secondary">Verk\u00e4ufe gesamt</p>
          <p className="text-2xl font-bold mt-1">{totalSales}</p>
        </div>
        <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
          <p className="text-sm text-bd-text-secondary">Umsatz gesamt</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-bd-card rounded-bd p-5 border border-bd-accent/30">
          <p className="text-sm text-bd-text-secondary">Provisionen gesamt</p>
          <p className="text-2xl font-bold text-bd-accent mt-1">{formatCurrency(totalCommission)}</p>
        </div>
      </div>

      {/* Per-Employee Summary */}
      {isAdmin && summary.length > 0 && (
        <div className="mb-6">
          <h2 className="font-heading font-semibold mb-3">\u00dcbersicht pro Mitarbeiter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.filter(s => Number(s.total_sales) > 0).map((s) => (
              <div key={s.employee_id} className="bg-bd-card rounded-bd p-4 border border-bd-border">
                <p className="font-medium mb-2">{s.employee_name}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-bd-text-muted text-xs">Verk\u00e4ufe</p>
                    <p className="font-semibold">{Number(s.total_sales)}</p>
                  </div>
                  <div>
                    <p className="text-bd-text-muted text-xs">Umsatz</p>
                    <p className="font-semibold">{formatCurrency(Number(s.total_revenue))}</p>
                  </div>
                  <div>
                    <p className="text-bd-text-muted text-xs">Provision</p>
                    <p className="font-semibold text-bd-accent">{formatCurrency(Number(s.total_commission))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Table */}
      <div className="bg-bd-card rounded-bd border border-bd-border overflow-hidden">
        <div className="px-4 py-3 border-b border-bd-border">
          <h2 className="font-heading font-semibold">Einzelne Verk\u00e4ufe</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-bd-border text-left">
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Datum</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Kunde</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Service</th>
              {isAdmin && <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Mitarbeiter</th>}
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider text-right">Verkaufspreis</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider text-right">Basis</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider text-right">Rate</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider text-right">Provision</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d) => {
              const isMonthly = d.price_model === 'monatlich';
              const months = d.contract_months;
              const base = isMonthly && months ? Number(d.sold_price) * months : Number(d.sold_price);
              return (
                <tr key={d.id} className="border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors">
                  <td className="px-4 py-3 text-sm">{formatDate(d.sold_date)}</td>
                  <td className="px-4 py-3 text-sm">{d.customer_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {d.service_name}
                    {isMonthly && months && (
                      <span className="text-xs text-bd-text-muted ml-1">({months} Mo)</span>
                    )}
                  </td>
                  {isAdmin && <td className="px-4 py-3 text-sm text-bd-text-body">{d.employee_name || '\u2013'}</td>}
                  <td className="px-4 py-3 text-sm text-right">
                    {formatCurrency(Number(d.sold_price))}{isMonthly ? '/Mo' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-bd-text-body">
                    {formatCurrency(base)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-bd-text-body">{Number(d.commission_rate)}%</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-bd-accent">{formatCurrency(Number(d.commission_amount))}</td>
                </tr>
              );
            })}
            {details.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-bd-text-muted">
                  Keine Verk\u00e4ufe gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
