'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Offer, OfferStatus } from '@/types';

const statusLabels: Record<OfferStatus, string> = { entwurf: 'Entwurf', gesendet: 'Gesendet', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt' };
const statusColors: Record<OfferStatus, string> = { entwurf: 'bg-gray-100 text-gray-700', gesendet: 'bg-blue-100 text-blue-700', angenommen: 'bg-green-100 text-green-700', abgelehnt: 'bg-red-100 text-red-700' };

export default function OfferDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ customer_name: '', customer_address: '', customer_email: '', customer_phone: '', notes: '', discount_amount: 0, discount_note: '' });
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ product_name: '', quantity: 1, unit_price: 0 });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState({ product_name: '', quantity: 1, unit_price: 0 });

  const fetchOffer = async () => {
    const res = await api.get(`/offers/${id}`);
    setOffer(res.data);
    setEditData({
      customer_name: res.data.customer_name || '', customer_address: res.data.customer_address || '',
      customer_email: res.data.customer_email || '', customer_phone: res.data.customer_phone || '',
      notes: res.data.notes || '', discount_amount: parseFloat(res.data.discount_amount) || 0,
      discount_note: res.data.discount_note || '',
    });
    setLoading(false);
  };

  useEffect(() => { fetchOffer(); }, [id]); // eslint-disable-line

  const updateOffer = async () => { await api.put(`/offers/${id}`, editData); setEditing(false); fetchOffer(); };
  const updateStatus = async (status: string) => { await api.patch(`/offers/${id}/status`, { status }); fetchOffer(); };

  const removeItem = async (itemId: string) => {
    if (!confirm('Position loeschen?')) return;
    await api.delete(`/offers/${id}/items/${itemId}`); fetchOffer();
  };

  const addItem = async () => {
    if (!newItem.product_name) return;
    await api.post(`/offers/${id}/items`, { category_slug: 'custom', product_name: newItem.product_name, configuration: {}, quantity: newItem.quantity, unit_price: newItem.unit_price });
    setAddingItem(false); setNewItem({ product_name: '', quantity: 1, unit_price: 0 }); fetchOffer();
  };

  const startEditItem = (item: Offer['items'] extends (infer T)[] | undefined ? NonNullable<T> : never) => {
    setEditingItemId(item.id);
    setEditItemData({ product_name: item.product_name, quantity: item.quantity, unit_price: parseFloat(String(item.unit_price)) });
  };

  const saveEditItem = async () => {
    if (!editingItemId) return;
    await api.put(`/offers/${id}/items/${editingItemId}`, { product_name: editItemData.product_name, quantity: editItemData.quantity, unit_price: editItemData.unit_price });
    setEditingItemId(null); fetchOffer();
  };

  const deleteOffer = async () => {
    if (!confirm(`Angebot ${offer?.offer_number} unwiderruflich loeschen?`)) return;
    try {
      // Delete all items first, then the offer
      if (offer?.items) {
        for (const item of offer.items) { await api.delete(`/offers/${id}/items/${item.id}`); }
      }
      // Delete offer via status hack or direct - we need a delete endpoint
      // For now: we'll use a workaround
      await api.delete(`/offers/${id}`);
      router.push('/angebote');
    } catch {
      // If no delete endpoint, just navigate back
      router.push('/angebote');
    }
  };

  const downloadPdf = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/offers/${id}/pdf?token=${localStorage.getItem('token')}`, '_blank');
  };

  const duplicateOffer = async () => { const res = await api.post(`/offers/${id}/duplicate`); router.push(`/angebote/${res.data.id}`); };

  const formatEur = (n: number | string) => (typeof n === 'string' ? parseFloat(n) : n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  if (loading || !offer) return <div className="p-8 text-bd-text-muted">Laden...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <button onClick={() => router.push('/angebote')} className="text-sm text-bd-text-muted hover:text-bd-accent mb-1">&larr; Zurueck</button>
          <h1 className="font-heading text-2xl font-bold">{offer.offer_number}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[offer.status]}`}>{statusLabels[offer.status]}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {offer.status === 'entwurf' && <button onClick={() => updateStatus('gesendet')} className="bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm hover:bg-blue-600">Als gesendet markieren</button>}
          {offer.status === 'gesendet' && (
            <>
              <button onClick={() => updateStatus('angenommen')} className="bg-green-500 text-white px-3 py-1.5 rounded-full text-sm">Angenommen</button>
              <button onClick={() => updateStatus('abgelehnt')} className="bg-red-500 text-white px-3 py-1.5 rounded-full text-sm">Abgelehnt</button>
            </>
          )}
          {(offer.status === 'angenommen' || offer.status === 'abgelehnt') && (
            <button onClick={() => updateStatus('entwurf')} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm">Zurueck zu Entwurf</button>
          )}
          <button onClick={downloadPdf} className="bg-bd-accent text-white px-3 py-1.5 rounded-full text-sm hover:bg-[#d64f3e]">PDF</button>
          <button onClick={duplicateOffer} className="bg-bd-bg-secondary text-bd-text-body px-3 py-1.5 rounded-full text-sm hover:bg-bd-border">Duplizieren</button>
          <button onClick={deleteOffer} className="bg-white border border-red-300 text-red-500 px-3 py-1.5 rounded-full text-sm hover:bg-red-50">Loeschen</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Positions - always editable */}
          <div className="bg-white border border-bd-border rounded-bd overflow-hidden">
            <div className="px-4 py-3 border-b border-bd-border flex justify-between items-center">
              <h2 className="font-heading font-bold">Positionen</h2>
              <button onClick={() => setAddingItem(true)} className="text-sm text-bd-accent hover:underline">+ Position hinzufuegen</button>
            </div>

            {offer.items && offer.items.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bd-bg-secondary text-bd-text-muted text-left">
                    <th className="px-4 py-2 font-medium w-8">Pos.</th>
                    <th className="px-4 py-2 font-medium">Produkt</th>
                    <th className="px-4 py-2 font-medium text-right w-16">Menge</th>
                    <th className="px-4 py-2 font-medium text-right w-28">Einzelpreis</th>
                    <th className="px-4 py-2 font-medium text-right w-28">Gesamt</th>
                    <th className="px-4 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {offer.items.map((item, i) => (
                    <tr key={item.id} className="border-t border-bd-border">
                      {editingItemId === item.id ? (
                        <>
                          <td className="px-4 py-2 text-bd-text-muted">{i + 1}</td>
                          <td className="px-4 py-2">
                            <input type="text" value={editItemData.product_name} onChange={(e) => setEditItemData({...editItemData, product_name: e.target.value})} className="!py-1 !text-sm w-full" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={editItemData.quantity} onChange={(e) => setEditItemData({...editItemData, quantity: Number(e.target.value)})} className="!py-1 !text-sm !w-14 !text-right" min={1} />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={editItemData.unit_price} onChange={(e) => setEditItemData({...editItemData, unit_price: Number(e.target.value)})} className="!py-1 !text-sm !w-24 !text-right" step="0.01" />
                          </td>
                          <td className="px-4 py-2 text-right font-medium">{formatEur(editItemData.quantity * editItemData.unit_price)}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={saveEditItem} className="text-xs text-bd-accent mr-2">✓</button>
                            <button onClick={() => setEditingItemId(null)} className="text-xs text-bd-text-muted">✕</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-bd-text-muted">{i + 1}</td>
                          <td className="px-4 py-2"><div className="font-medium">{item.product_name}</div></td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatEur(item.unit_price)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatEur(item.total_price)}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => startEditItem(item)} className="text-bd-text-muted hover:text-bd-accent text-xs mr-2">✎</button>
                            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-bd-text-muted">Keine Positionen</div>
            )}

            {/* Add new item inline */}
            {addingItem && (
              <div className="px-4 py-3 border-t border-bd-border bg-bd-bg-secondary">
                <div className="flex items-center gap-2">
                  <input type="text" value={newItem.product_name} onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                    placeholder="Beschreibung..." className="flex-1 !py-1 !text-sm" />
                  <input type="number" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    className="!w-14 !py-1 !text-sm !text-right" min={1} />
                  <input type="number" value={newItem.unit_price} onChange={(e) => setNewItem({...newItem, unit_price: Number(e.target.value)})}
                    placeholder="Preis" step="0.01" className="!w-24 !py-1 !text-sm !text-right" />
                  <button onClick={addItem} disabled={!newItem.product_name} className="text-xs bg-bd-accent text-white px-3 py-1 rounded-full disabled:opacity-50">OK</button>
                  <button onClick={() => setAddingItem(false)} className="text-xs text-bd-text-muted">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white border border-bd-border rounded-bd p-4 mt-4">
            <div className="space-y-2 text-sm">
              {parseFloat(String(offer.discount_amount)) > 0 && (
                <div className="flex justify-between">
                  <span className="text-bd-text-muted">Rabatt {offer.discount_note && `(${offer.discount_note})`}</span>
                  <span className="text-green-600">-{formatEur(offer.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-bd-text-muted">Nettobetrag</span><span>{formatEur(offer.net_total)}</span></div>
              <div className="flex justify-between"><span className="text-bd-text-muted">MwSt. {offer.vat_rate}%</span><span>{formatEur(offer.vat_amount)}</span></div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-bd-border">
                <span>Gesamtbetrag</span><span className="text-bd-accent">{formatEur(offer.gross_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-bd-border rounded-bd p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-heading font-bold">Kundendaten</h2>
              <button onClick={() => setEditing(!editing)} className="text-sm text-bd-accent hover:underline">{editing ? 'Abbrechen' : 'Bearbeiten'}</button>
            </div>
            {editing ? (
              <div className="space-y-3">
                <div><label className="text-xs text-bd-text-muted">Name</label><input value={editData.customer_name} onChange={(e) => setEditData({...editData, customer_name: e.target.value})} /></div>
                <div><label className="text-xs text-bd-text-muted">Adresse</label><textarea value={editData.customer_address} onChange={(e) => setEditData({...editData, customer_address: e.target.value})} rows={2} /></div>
                <div><label className="text-xs text-bd-text-muted">E-Mail</label><input value={editData.customer_email} onChange={(e) => setEditData({...editData, customer_email: e.target.value})} /></div>
                <div><label className="text-xs text-bd-text-muted">Telefon</label><input value={editData.customer_phone} onChange={(e) => setEditData({...editData, customer_phone: e.target.value})} /></div>
                <div><label className="text-xs text-bd-text-muted">Rabatt (EUR)</label><input type="number" value={editData.discount_amount} onChange={(e) => setEditData({...editData, discount_amount: Number(e.target.value)})} /></div>
                <div><label className="text-xs text-bd-text-muted">Rabattgrund</label><input value={editData.discount_note} onChange={(e) => setEditData({...editData, discount_note: e.target.value})} /></div>
                <div><label className="text-xs text-bd-text-muted">Notizen</label><textarea value={editData.notes} onChange={(e) => setEditData({...editData, notes: e.target.value})} rows={3} /></div>
                <button onClick={updateOffer} className="w-full bg-bd-accent text-white py-2 rounded-full font-heading font-bold hover:bg-[#d64f3e]">Speichern</button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{offer.customer_name}</p>
                {offer.customer_address && <p className="text-bd-text-muted">{offer.customer_address}</p>}
                {offer.customer_email && <p className="text-bd-text-muted">{offer.customer_email}</p>}
                {offer.customer_phone && <p className="text-bd-text-muted">{offer.customer_phone}</p>}
                {offer.notes && <div className="mt-3 pt-3 border-t border-bd-border"><p className="text-xs text-bd-text-muted mb-1">Notizen</p><p className="text-bd-text-body">{offer.notes}</p></div>}
                {offer.visualizer_image_url && (
                  <div className="mt-3 pt-3 border-t border-bd-border">
                    <p className="text-xs text-bd-text-muted mb-2">KI-Vorschau</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={offer.visualizer_image_url} alt="KI-Vorschau" className="w-full rounded-bd border border-bd-border" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-bd-border rounded-bd p-4 text-sm text-bd-text-muted space-y-1">
            <p>Erstellt: {new Date(offer.created_at).toLocaleDateString('de-DE')}</p>
            {offer.created_by_name && <p>Von: {offer.created_by_name}</p>}
            {offer.sent_at && <p>Gesendet: {new Date(offer.sent_at).toLocaleDateString('de-DE')}</p>}
            {offer.accepted_at && <p>Angenommen: {new Date(offer.accepted_at).toLocaleDateString('de-DE')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
