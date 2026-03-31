'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Customer, Service, Promotion, Todo } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

export default function KundenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreateTodo, setShowCreateTodo] = useState(false);
  const [customerTodos, setCustomerTodos] = useState<Todo[]>([]);

  const fetchCustomer = useCallback(async () => {
    const { data } = await api.get(`/customers/${id}`);
    setCustomer(data);
  }, [id]);

  const fetchTodos = useCallback(async () => {
    try {
      const { data } = await api.get(`/todos?customer_id=${id}&status=offen`);
      setCustomerTodos(data);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { fetchCustomer(); fetchTodos(); }, [fetchCustomer, fetchTodos]);

  const { data: services } = usePolling<Service[]>(
    () => api.get('/services').then((r) => r.data),
    30000
  );

  const handleDeleteCustomer = async () => {
    if (!confirm(`Kunde "${customer?.company_name}" wirklich endgültig löschen? Alle zugewiesenen Services werden ebenfalls entfernt.`)) return;
    try {
      await api.delete(`/customers/${id}`);
      router.push('/kunden');
    } catch {
      alert('Fehler beim Löschen des Kunden');
    }
  };

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl font-bold">{customer.company_name}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="px-4 py-2 text-sm border border-bd-border text-bd-text-body rounded-lg hover:bg-bd-card-hover transition-all">
            Bearbeiten
          </button>
          <button onClick={() => setShowAssign(true)} className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all">
            + Service zuweisen
          </button>
          <button onClick={() => setShowCreateTodo(true)} className="px-4 py-2 text-sm border border-bd-border text-bd-text-body rounded-lg hover:bg-bd-card-hover transition-all">
            + Todo
          </button>
          <button onClick={handleDeleteCustomer} className="px-4 py-2 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
            Löschen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2">
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border mb-6">
            <h2 className="font-heading font-semibold mb-4">Kundendaten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-bd-text-muted">Kontaktperson</span>
                <p className="mt-1">{customer.contact_person || '–'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">E-Mail</span>
                <p className="mt-1">{customer.email || '–'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Telefon</span>
                <p className="mt-1">{customer.phone || '–'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Website</span>
                <p className="mt-1">{customer.website || '–'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Stadt</span>
                <p className="mt-1">{customer.city || '–'}</p>
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
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-bd-border last:border-0">
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
                        {s.original_price && Number(s.discount_amount) > 0 ? (
                          <>
                            <span className="text-xs text-bd-text-muted line-through mr-2">{formatCurrency(Number(s.original_price))}</span>
                            <span className="font-semibold text-emerald-400">{formatCurrency(Number(s.sold_price))}{s.price_model === 'monatlich' ? '/Mo' : ''}</span>
                          </>
                        ) : (
                          <span className="font-semibold">{formatCurrency(Number(s.sold_price))}{s.price_model === 'monatlich' ? '/Mo' : ''}</span>
                        )}
                        {Number(s.setup_price) > 0 && (
                          <p className="text-xs text-bd-text-secondary mt-0.5">+ {formatCurrency(Number(s.setup_price))} Einrichtung</p>
                        )}
                        {s.promotion_name && (
                          <p className="text-xs text-bd-accent mt-0.5">{s.promotion_name}</p>
                        )}
                        {Number(s.commission_rate) > 0 && (
                          <p className="text-xs text-bd-text-muted">
                            Prov: {formatCurrency(Number(s.commission_amount))} ({Number(s.commission_rate)}%
                            {s.price_model === 'monatlich' && s.contract_months ? ` × ${s.contract_months} Mo` : ''})
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
            <h2 className="font-heading font-semibold mb-3">Umsatz-Übersicht</h2>
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

          {/* Customer Todos */}
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold">Offene Todos</h2>
              <span className="text-xs text-bd-text-muted">{customerTodos.length}</span>
            </div>
            {customerTodos.length > 0 ? (
              <div className="space-y-2">
                {customerTodos.map((todo) => (
                  <div key={todo.id} className="flex items-start gap-2 py-1.5 border-b border-bd-border last:border-0">
                    <button
                      onClick={async () => {
                        await api.put(`/todos/${todo.id}`, { status: 'erledigt' });
                        fetchTodos();
                      }}
                      className="w-4 h-4 rounded border border-bd-border hover:border-bd-accent shrink-0 mt-0.5 transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{todo.title}</p>
                      {todo.due_date && (
                        <p className={`text-[11px] mt-0.5 ${new Date(todo.due_date) < new Date() ? 'text-red-400' : 'text-bd-text-muted'}`}>
                          Fällig: {formatDate(todo.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-bd-text-muted">Keine offenen Todos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        customer={customer}
        onSaved={fetchCustomer}
      />

      {/* Assign Service Modal */}
      <AssignServiceModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        customerId={id}
        services={services || []}
        onAssigned={fetchCustomer}
      />

      {/* Create Todo Modal */}
      <CreateTodoFromCustomerModal
        open={showCreateTodo}
        onClose={() => setShowCreateTodo(false)}
        customerId={id}
        customerName={customer.company_name}
        customerServices={(customer.services || []).map((s) => ({ id: s.id, service_name: s.service_name }))}
        onCreated={() => { fetchTodos(); }}
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
  const [setupPrice, setSetupPrice] = useState('0');
  const [priceModel, setPriceModel] = useState('einmalig');
  const [contractMonths, setContractMonths] = useState('12');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [promotionId, setPromotionId] = useState('');
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>([]);

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedPromotion = availablePromotions.find((p) => p.id === promotionId);

  const handleServiceSelect = async (id: string) => {
    setServiceId(id);
    setPromotionId('');
    setAvailablePromotions([]);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setSoldPrice(svc.base_price.toString());
      setSetupPrice((svc.setup_price || 0).toString());
      setPriceModel(svc.price_model);
      // Load available promotions for this service
      try {
        const { data } = await api.get(`/promotions/for-service/${id}`);
        setAvailablePromotions(data);
      } catch {
        // silently fail
      }
    }
  };

  // Live discount preview
  const soldPriceNum = parseFloat(soldPrice) || 0;
  const contractMonthsNum = parseInt(contractMonths) || 0;

  let discountAmount = 0;
  let finalPrice = soldPriceNum;
  if (selectedPromotion) {
    if (selectedPromotion.discount_type === 'fixed') {
      discountAmount = Math.min(Number(selectedPromotion.discount_value), soldPriceNum);
    } else {
      discountAmount = Math.round(soldPriceNum * Number(selectedPromotion.discount_value)) / 100;
    }
    finalPrice = Math.max(0, Math.round((soldPriceNum - discountAmount) * 100) / 100);
  }

  const commissionRate = selectedService?.commission_rate || 0;
  const commissionBase = priceModel === 'monatlich'
    ? finalPrice * contractMonthsNum
    : finalPrice;
  const commissionPreview = commissionBase * commissionRate / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/customers/${customerId}/services`, {
        service_id: serviceId,
        sold_price: parseFloat(soldPrice),
        setup_price: parseFloat(setupPrice) || 0,
        price_model: priceModel,
        contract_months: priceModel === 'monatlich' ? parseInt(contractMonths) : undefined,
        notes: notes || undefined,
        promotion_id: promotionId || undefined,
      });
      onAssigned();
      onClose();
      setServiceId('');
      setSoldPrice('');
      setSetupPrice('0');
      setContractMonths('12');
      setNotes('');
      setPromotionId('');
      setAvailablePromotions([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      alert(msg);
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
            <option value="">Service auswählen...</option>
            {services.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatCurrency(s.base_price)} / {s.price_model}{Number(s.setup_price) > 0 ? ` + ${formatCurrency(Number(s.setup_price))} Einrichtung` : ''})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Verkaufspreis (EUR) *</label>
            <input required type="number" step="0.01" min="0" className="w-full" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Einrichtung (EUR)</label>
            <input type="number" step="0.01" min="0" className="w-full" value={setupPrice} onChange={(e) => setSetupPrice(e.target.value)} />
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

        {/* Promotion Dropdown */}
        {availablePromotions.length > 0 && (
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Aktion anwenden</label>
            <select className="w-full" value={promotionId} onChange={(e) => setPromotionId(e.target.value)}>
              <option value="">Keine Aktion</option>
              {availablePromotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{Number(p.discount_value) > 0
                    ? ` (${p.discount_type === 'fixed' ? formatCurrency(Number(p.discount_value)) : `${Number(p.discount_value)}%`} Rabatt)`
                    : ' (Sonderaktion)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Discount Preview */}
        {selectedPromotion && soldPriceNum > 0 && discountAmount > 0 && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-xs text-bd-text-muted mb-1">Rabatt-Vorschau</p>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-bd-text-muted line-through">{formatCurrency(soldPriceNum)}</span>
                <span className="text-sm text-bd-text-muted mx-2">→</span>
                <span className="text-lg font-bold text-emerald-400">{formatCurrency(finalPrice)}</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-medium">
                -{formatCurrency(discountAmount)}
              </span>
            </div>
            <p className="text-xs text-bd-text-muted mt-1">{selectedPromotion.name}</p>
          </div>
        )}

        {/* No-discount promotion info */}
        {selectedPromotion && Number(selectedPromotion.discount_value) === 0 && (
          <div className="bg-bd-accent/5 border border-bd-accent/20 rounded-lg p-3">
            <p className="text-xs text-bd-text-muted mb-1">Sonderaktion</p>
            <p className="text-sm font-semibold text-bd-accent">{selectedPromotion.name}</p>
            {selectedPromotion.description && (
              <p className="text-xs text-bd-text-muted mt-1">{selectedPromotion.description}</p>
            )}
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
                {formatCurrency(finalPrice)}/Mo × {contractMonthsNum} Mo × {commissionRate}%
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

function CreateTodoFromCustomerModal({
  open,
  onClose,
  customerId,
  customerName,
  customerServices,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerServices: { id: string; service_name: string }[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', assigned_to: '', customer_service_id: '' });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({ title: '', description: '', due_date: '', assigned_to: '', customer_service_id: '' });
    api.get('/users').then((r) => setUsers(r.data.filter((u: { is_active: boolean }) => u.is_active))).catch(() => {});
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/todos', { ...form, customer_id: customerId });
      onCreated();
      onClose();
    } catch {
      alert('Fehler beim Erstellen des Todos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Todo erstellen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Kunde</label>
          <p className="text-sm font-medium">{customerName}</p>
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Titel *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Was muss erledigt werden?" className="w-full" />
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Beschreibung</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Weitere Details..." className="w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Fällig am</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Zuweisen an</label>
            <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="w-full">
              <option value="">Nicht zugewiesen</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        {customerServices.length > 0 && (
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Service (optional)</label>
            <select value={form.customer_service_id} onChange={(e) => setForm({ ...form, customer_service_id: e.target.value })} className="w-full">
              <option value="">Kein spezifischer Service</option>
              {customerServices.map((s) => <option key={s.id} value={s.id}>{s.service_name}</option>)}
            </select>
          </div>
        )}
        <button type="submit" disabled={loading || !form.title.trim()} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Erstelle...' : 'Todo erstellen'}
        </button>
      </form>
    </Modal>
  );
}

function EditCustomerModal({ open, onClose, customer, onSaved }: {
  open: boolean;
  onClose: () => void;
  customer: Customer;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    company_name: customer.company_name,
    contact_person: customer.contact_person || '',
    email: customer.email || '',
    phone: customer.phone || '',
    website: customer.website || '',
    address: customer.address || '',
    city: customer.city || '',
    postal_code: customer.postal_code || '',
    notes: customer.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        company_name: customer.company_name,
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: customer.phone || '',
        website: customer.website || '',
        address: customer.address || '',
        city: customer.city || '',
        postal_code: customer.postal_code || '',
        notes: customer.notes || '',
      });
    }
  }, [open, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/customers/${customer.id}`, form);
      onSaved();
      onClose();
    } catch {
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Kunde bearbeiten">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Firmenname *</label>
          <input required className="w-full" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Kontaktperson</label>
            <input className="w-full" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">E-Mail</label>
            <input type="email" className="w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Telefon</label>
            <input className="w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Website</label>
            <input className="w-full" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Adresse</label>
          <input className="w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">PLZ</label>
            <input className="w-full" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Stadt</label>
            <input className="w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Notizen</label>
          <textarea rows={3} className="w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <button type="submit" disabled={loading || !form.company_name.trim()} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Speichern...' : 'Änderungen speichern'}
        </button>
      </form>
    </Modal>
  );
}
