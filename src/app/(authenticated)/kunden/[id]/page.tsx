'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Customer, Todo } from '@/types';
import { formatCurrency, formatDate, OFFER_STATUS_CONFIG } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

export default function KundenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
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

  const handleDeleteCustomer = async () => {
    if (!confirm(`Kunde "${customer?.company_name}" wirklich loeschen?`)) return;
    try {
      await api.delete(`/customers/${id}`);
      router.push('/kunden');
    } catch {
      alert('Fehler beim Loeschen des Kunden');
    }
  };

  if (!customer) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-bd-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div>
      <button onClick={() => router.push('/kunden')} className="text-sm text-bd-text-muted hover:text-bd-accent mb-4 block">
        &larr; Zurueck zu Kunden
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">{customer.company_name}</h1>
          {customer.customer_number && <p className="text-sm text-bd-text-muted">Kd.-Nr.: {customer.customer_number}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowEdit(true)} className="px-4 py-2 text-sm border border-bd-border text-bd-text-body rounded-full hover:bg-bd-bg-secondary transition-all">
            Bearbeiten
          </button>
          <Link href={`/kalkulator`} className="px-4 py-2 text-sm bg-bd-accent text-white font-bold rounded-full hover:bg-[#d64f3e] transition-all">
            + Neues Angebot
          </Link>
          <button onClick={() => setShowCreateTodo(true)} className="px-4 py-2 text-sm border border-bd-border text-bd-text-body rounded-full hover:bg-bd-bg-secondary transition-all">
            + Todo
          </button>
          <button onClick={handleDeleteCustomer} className="px-4 py-2 text-sm border border-red-300 text-red-500 rounded-full hover:bg-red-50 transition-all">
            Loeschen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info + Offers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-bd p-5 border border-bd-border">
            <h2 className="font-heading font-semibold mb-4">Kundendaten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-bd-text-muted">Ansprechpartner</span>
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
                <span className="text-bd-text-muted">Mobil</span>
                <p className="mt-1">{customer.mobile || '–'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">Adresse</span>
                <p className="mt-1">{customer.address || '–'}</p>
              </div>
              <div>
                <span className="text-bd-text-muted">PLZ / Ort</span>
                <p className="mt-1">{customer.postal_code ? `${customer.postal_code} ${customer.city || ''}` : '–'}</p>
              </div>
            </div>
            {customer.notes && (
              <div className="mt-4 pt-4 border-t border-bd-border">
                <span className="text-sm text-bd-text-muted">Notizen</span>
                <p className="text-sm mt-1">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Offers */}
          <div className="bg-white rounded-bd p-5 border border-bd-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold">Angebote</h2>
              <Link href="/kalkulator" className="text-sm text-bd-accent hover:underline">+ Neues Angebot</Link>
            </div>
            {customer.offers && customer.offers.length > 0 ? (
              <div className="space-y-2">
                {customer.offers.map((o) => {
                  const cfg = OFFER_STATUS_CONFIG[o.status as keyof typeof OFFER_STATUS_CONFIG];
                  return (
                    <Link key={o.id} href={`/angebote/${o.id}`} className="flex items-center justify-between py-2 border-b border-bd-border last:border-0 hover:bg-bd-bg-secondary/50 -mx-2 px-2 rounded transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{o.offer_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg?.bg} ${cfg?.color}`}>
                          {cfg?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrency(parseFloat(String(o.gross_total)))}</span>
                        <span className="text-xs text-bd-text-muted">{formatDate(o.created_at)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-bd-text-muted">Noch keine Angebote fuer diesen Kunden.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-bd p-5 border border-bd-border">
            <h2 className="font-heading font-semibold mb-3">Info</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-bd-text-muted">Zugewiesen an</p>
                <p>{customer.assigned_to_name || 'Nicht zugewiesen'}</p>
              </div>
              <div>
                <p className="text-bd-text-muted">Kunde seit</p>
                <p>{formatDate(customer.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Todos */}
          <div className="bg-white rounded-bd p-5 border border-bd-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold">Offene Todos</h2>
              <span className="text-xs text-bd-text-muted">{customerTodos.length}</span>
            </div>
            {customerTodos.length > 0 ? (
              <div className="space-y-2">
                {customerTodos.map((todo) => (
                  <div key={todo.id} className="flex items-start gap-2 py-1.5 border-b border-bd-border last:border-0">
                    <button
                      onClick={async () => { await api.put(`/todos/${todo.id}`, { status: 'erledigt' }); fetchTodos(); }}
                      className="w-4 h-4 rounded border border-bd-border hover:border-bd-accent shrink-0 mt-0.5 transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{todo.title}</p>
                      {todo.due_date && (
                        <p className={`text-[11px] mt-0.5 ${new Date(todo.due_date) < new Date() ? 'text-red-500' : 'text-bd-text-muted'}`}>
                          Faellig: {formatDate(todo.due_date)}
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

      <EditCustomerModal open={showEdit} onClose={() => setShowEdit(false)} customer={customer} onSaved={fetchCustomer} />
      <CreateTodoModal open={showCreateTodo} onClose={() => setShowCreateTodo(false)} customerId={id} customerName={customer.company_name} onCreated={fetchTodos} />
    </div>
  );
}

function CreateTodoModal({ open, onClose, customerId, customerName, onCreated }: {
  open: boolean; onClose: () => void; customerId: string; customerName: string; onCreated: () => void;
}) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', assigned_to: '' });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({ title: '', description: '', due_date: '', assigned_to: '' });
    api.get('/users').then((r) => setUsers(r.data.filter((u: { is_active: boolean }) => u.is_active))).catch(() => {});
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/todos', { ...form, customer_id: customerId });
      onCreated(); onClose();
    } catch { alert('Fehler beim Erstellen des Todos'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Todo erstellen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-bd-text-muted">Fuer: {customerName}</p>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Titel *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full" />
        </div>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Beschreibung</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Faellig am</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Zuweisen an</label>
            <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="w-full">
              <option value="">Nicht zugewiesen</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading || !form.title.trim()} className="w-full bg-bd-accent text-white font-semibold py-2.5 rounded-full hover:bg-[#d64f3e] disabled:opacity-50">
          {loading ? 'Erstelle...' : 'Todo erstellen'}
        </button>
      </form>
    </Modal>
  );
}

function EditCustomerModal({ open, onClose, customer, onSaved }: {
  open: boolean; onClose: () => void; customer: Customer; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    company_name: customer.company_name,
    contact_person: customer.contact_person || '',
    email: customer.email || '',
    phone: customer.phone || '',
    mobile: customer.mobile || '',
    address: customer.address || '',
    city: customer.city || '',
    postal_code: customer.postal_code || '',
    customer_number: customer.customer_number || '',
    notes: customer.notes || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm({
      company_name: customer.company_name,
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      address: customer.address || '',
      city: customer.city || '',
      postal_code: customer.postal_code || '',
      customer_number: customer.customer_number || '',
      notes: customer.notes || '',
    });
  }, [open, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await api.put(`/customers/${customer.id}`, form); onSaved(); onClose(); }
    catch { alert('Fehler beim Speichern'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Kunde bearbeiten">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Firmenname *</label>
            <input required className="w-full" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Kd.-Nr.</label>
            <input className="w-full" value={form.customer_number} onChange={(e) => setForm({ ...form, customer_number: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Ansprechpartner</label>
            <input className="w-full" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">E-Mail</label>
            <input type="email" className="w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Telefon</label>
            <input className="w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Mobil</label>
            <input className="w-full" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Adresse</label>
          <input className="w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">PLZ</label>
            <input className="w-full" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Stadt</label>
            <input className="w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Notizen</label>
          <textarea rows={3} className="w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="submit" disabled={loading || !form.company_name.trim()} className="w-full bg-bd-accent text-white font-semibold py-2.5 rounded-full hover:bg-[#d64f3e] disabled:opacity-50">
          {loading ? 'Speichern...' : 'Aenderungen speichern'}
        </button>
      </form>
    </Modal>
  );
}
