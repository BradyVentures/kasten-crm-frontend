'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Customer, Service } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

export default function KundenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const fetchCustomer = useCallback(async () => {
    const { data } = await api.get(`/customers/${id}`);
    setCustomer(data);
  }, [id]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  const { data: services } = usePolling<Service[]>(
    () => api.get('/services').then((r) => r.data),
    30000
  );

  const handleRemoveService = async (csId: string) => {
    if (!confirm('Service-Zuweisung entfernen?')) return;
    await api.delete(`/customers/${id}/services/${csId}`);
    fetchCustomer();
  };

  if (!customer) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-bd-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const totalEinmalig = (customer.services || [])
    .filter((s) => s.price_model === 'einmalig')
    .reduce((sum, s) => sum + Number(s.sold_price), 0);

  const totalMonatlich = (customer.services || [])
    .filter((s) => s.price_model === 'monatlich')
    .reduce((sum, s) => sum + Number(s.sold_price), 0);

  const totalCommission = (customer.services || [])
    .reduce((sum, s) => sum + Number(s.commission_amount || 0), 0);

  return (
    <div>
      <button onClick={() => router.push('/kunden')} className="text-sm text-bd-text-muted hover:text-bd-text mb-4 block">
        &larr; Zur&uuml;ck zu Kunden
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">{customer.company_name}</h1>
        <button onClick={() => setShowAssign(true)} className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all">
          + Service zuweisen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2">
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border mb-6">
            <h2 className="font-heading font-semibold mb-4">Kundendaten</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-bd-text-muted">Kontaktperson</span>
                <p className="mt-1">{customer.contact_person || '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">E-Mail</span>
                <p className="mt-1">{customer.email || '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Telefon</span>
                <p className="mt-1">{customer.phone || '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Website</span>
                <p className="mt-1">{customer.website || '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Stadt</span>
                <p className="mt-1">{customer.city || '\u2013'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Kunde seit</span>
                <p className="mt-1">{formatDate(customer.converted_at || customer.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Assigned Services */}
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <h2 className="font-heading font-semibold mb-4">Zugewiesene Services</h2>
            {customer.services && customer.services.length > 0 ? (
              <div className="space-y-3">
                {customer.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3 border-b border-bd-border last:border-0">
                    <div>
                      <p className="font-medium">{s.service_name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge color={s.service_type === 'paket' ? 'text-blue-400' : 'text-purple-400'}
                               bg={s.service_type === 'paket' ? 'bg-blue-400/10' : 'bg-purple-400/10'}>
                          {s.service_type === 'paket' ? 'Paket' : 'Add-on'}
                        </Badge>
                        <Badge color="text-bd-text-secondary" bg="bg-bd-bg-secondary">
                          {s.price_model === 'monatlich' ? 'Monatlich' : 'Einmalig'}
                        </Badge>
                        {s.price_model === 'monatlich' && s.contract_months && (
                          <Badge color="text-orange-400" bg="bg-orange-400/10">
                            {s.contract_months} Monate
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(Number(s.sold_price))}{s.price_model === 'monatlich' ? '/Mo' : ''}</span>
                        {Number(s.commission_rate) > 0 && (
                          <p className="text-xs text-bd-text-muted">
                            Prov: {formatCurrency(Number(s.commission_amount))} ({Number(s.commission_rate)}%
                            {s.price_model === 'monatlich' && s.contract_months ? ` \u00d7 ${s.contract_months} Mo` : ''})
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleRemoveService(s.id)} className="text-xs text-red-400 hover:text-red-300">
                        Entfernen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-bd-text-muted">Keine Services zugewiesen.</p>
            )}
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="space-y-4">
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <h2 className="font-heading font-semibold mb-3">Umsatz-\u00dcbersicht</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-bd-text-secondary">Einmalig</p>
                <p className="text-xl font-bold">{formatCurrency(totalEinmalig)}</p>
              </div>
              <div>
                <p className="text-sm text-bd-text-secondary">Monatlich</p>
                <p className="text-xl font-bold text-bd-accent">{formatCurrency(totalMonatlich)}</p>
              </div>
              <div className="pt-3 border-t border-bd-border">
                <p className="text-sm text-bd-text-secondary">Gesamt</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEinmalig + totalMonatlich)}</p>
              </div>
            </div>
          </div>

          <div className="bg-bd-card rounded-bd p-5 border border-bd-accent/30">
            <h2 className="font-heading font-semibold mb-3">Provision</h2>
            <p className="text-2xl font-bold text-bd-accent">{formatCurrency(totalCommission)}</p>
            <p className="text-xs text-bd-text-muted mt-1">Gesamte Verkaufsprovision</p>
          </div>
        </div>
      </div>

      {/* Assign Service Modal */}
      <AssignServiceModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        customerId={id}
        services={services || []}
        onAssigned={fetchCustomer}
      />
    </div>
  );
}

function AssignServiceModal({ open, onClose, customerId, services, onAssigned }: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  services: Service[];
  onAssigned: () => void;
}) {
  const [serviceId, setServiceId] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [priceModel, setPriceModel] = useState('einmalig');
  const [contractMonths, setContractMonths] = useState('12');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);

  const handleServiceSelect = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setSoldPrice(svc.base_price.toString());
      setPriceModel(svc.price_model);
    }
  };

  // Live commission preview
  const soldPriceNum = parseFloat(soldPrice) || 0;
  const contractMonthsNum = parseInt(contractMonths) || 0;
  const commissionRate = selectedService?.commission_rate || 0;
  const commissionBase = priceModel === 'monatlich'
    ? soldPriceNum * contractMonthsNum
    : soldPriceNum;
  const commissionPreview = commissionBase * commissionRate / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/customers/${customerId}/services`, {
        service_id: serviceId,
        sold_price: parseFloat(soldPrice),
        price_model: priceModel,
        contract_months: priceModel === 'monatlich' ? parseInt(contractMonths) : undefined,
        notes: notes || undefined,
      });
      onAssigned();
      onClose();
      setServiceId('');
      setSoldPrice('');
      setContractMonths('12');
      setNotes('');
    } catch {
      alert('Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Service zuweisen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Service *</label>
          <select required className="w-full" value={serviceId} onChange={(e) => handleServiceSelect(e.target.value)}>
            <option value="">Service ausw\u00e4hlen...</option>
            {services.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatCurrency(s.base_price)} / {s.price_model})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Verkaufspreis (\u20ac) *</label>
            <input required type="number" step="0.01" min="0" className="w-full" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Preismodell</label>
            <select className="w-full" value={priceModel} onChange={(e) => setPriceModel(e.target.value)}>
              <option value="einmalig">Einmalig</option>
              <option value="monatlich">Monatlich</option>
            </select>
          </div>
        </div>

        {priceModel === 'monatlich' && (
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Vertragslaufzeit (Monate) *</label>
            <input
              required
              type="number"
              min="1"
              step="1"
              className="w-full"
              value={contractMonths}
              onChange={(e) => setContractMonths(e.target.value)}
            />
            <p className="text-xs text-bd-text-muted mt-1">
              Vertragswert: {formatCurrency(soldPriceNum * contractMonthsNum)}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Notizen</label>
          <textarea rows={2} className="w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Commission Preview */}
        {selectedService && commissionRate > 0 && (
          <div className="bg-bd-bg-secondary rounded-lg p-3 border border-bd-border">
            <p className="text-xs text-bd-text-muted mb-1">Provisionsvorschau</p>
            <div className="flex justify-between items-center">
              <span className="text-sm">
                {commissionRate}% auf {formatCurrency(commissionBase)}
              </span>
              <span className="font-semibold text-bd-accent">{formatCurrency(commissionPreview)}</span>
            </div>
            {priceModel === 'monatlich' && (
              <p className="text-xs text-bd-text-muted mt-1">
                {formatCurrency(soldPriceNum)}/Mo \u00d7 {contractMonthsNum} Mo \u00d7 {commissionRate}%
              </p>
            )}
          </div>
        )}

        <button type="submit" disabled={loading || !serviceId} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Zuweisen...' : 'Service zuweisen'}
        </button>
      </form>
    </Modal>
  );
}
