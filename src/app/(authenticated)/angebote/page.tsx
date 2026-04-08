'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Offer, OfferStatus } from '@/types';

const statusLabels: Record<OfferStatus, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
};

const statusColors: Record<OfferStatus, string> = {
  entwurf: 'bg-gray-100 text-gray-700',
  gesendet: 'bg-blue-100 text-blue-700',
  angenommen: 'bg-green-100 text-green-700',
  abgelehnt: 'bg-red-100 text-red-700',
};

export default function AngebotePage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchOffers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await api.get(`/offers?${params}`);
    setOffers(res.data.offers);
    setTotal(res.data.total);
    setLoading(false);
  };

  useEffect(() => { fetchOffers(); }, [search, statusFilter]); // eslint-disable-line

  const formatEur = (n: number | string) => {
    const num = typeof n === 'string' ? parseFloat(n) : n;
    return num.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Angebote</h1>
        <Link
          href="/kalkulator"
          className="bg-bd-accent text-white px-4 py-2 rounded-full font-heading font-bold text-sm hover:bg-[#d64f3e] transition-colors"
        >
          + Neues Angebot
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['', 'entwurf', 'gesendet', 'angenommen', 'abgelehnt'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-bd-accent text-white' : 'bg-bd-bg-secondary text-bd-text-body hover:bg-bd-border'}`}
            >
              {s ? statusLabels[s as OfferStatus] : 'Alle'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-bd-border rounded-bd overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-bd-text-muted">Laden...</div>
        ) : offers.length === 0 ? (
          <div className="p-8 text-center text-bd-text-muted">Keine Angebote gefunden</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bd-bg-secondary text-bd-text-muted text-left">
                  <th className="px-4 py-3 font-medium">Nr.</th>
                  <th className="px-4 py-3 font-medium">Kunde</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Brutto</th>
                  <th className="px-4 py-3 font-medium">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-t border-bd-border hover:bg-bd-bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/angebote/${offer.id}`} className="text-bd-accent font-medium hover:underline">
                        {offer.offer_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{offer.customer_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[offer.status]}`}>
                        {statusLabels[offer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatEur(offer.gross_total)}</td>
                    <td className="px-4 py-3 text-bd-text-muted">
                      {new Date(offer.created_at).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-bd-border text-sm text-bd-text-muted">
            {total} Angebot{total !== 1 ? 'e' : ''} gesamt
          </div>
        )}
      </div>
    </div>
  );
}
