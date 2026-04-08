'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Customer, User } from '@/types';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

function CreateCustomerModal({
  open,
  onClose,
  users,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  users: User[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    postal_code: '',
    notes: '',
    customer_number: '',
    assigned_to: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/customers', form);
      setForm({ company_name: '', contact_person: '', email: '', phone: '', mobile: '', address: '', city: '', postal_code: '', notes: '', customer_number: '', assigned_to: '' });
      onCreated();
      onClose();
    } catch {
      alert('Fehler beim Erstellen des Kunden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Neuer Kunde">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Firmenname *</label>
          <input type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required className="w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Kundennummer</label>
            <input type="text" value={form.customer_number} onChange={(e) => setForm({ ...form, customer_number: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Ansprechpartner</label>
            <input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Telefon</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Mobil</label>
            <input type="text" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="w-full" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">E-Mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
        </div>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Adresse</label>
          <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">PLZ</label>
            <input type="text" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-bd-text-muted mb-1">Stadt</label>
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Zugewiesen an</label>
          <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="w-full">
            <option value="">Nicht zugewiesen</option>
            {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Notizen</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full" />
        </div>
        <button type="submit" disabled={loading || !form.company_name.trim()} className="w-full bg-bd-accent text-white font-semibold py-2.5 rounded-full hover:bg-[#d64f3e] disabled:opacity-50 transition-all">
          {loading ? 'Erstelle...' : 'Kunde anlegen'}
        </button>
      </form>
    </Modal>
  );
}

export default function KundenPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, refetch } = usePolling(
    () => api.get(`/customers?search=${encodeURIComponent(search)}`).then((r) => r.data),
    10000
  );

  const customers = (data?.customers || []) as Customer[];

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const handleOpenCreate = async () => {
    if (!usersLoaded) {
      try {
        const res = await api.get('/users');
        setUsers(res.data.filter((u: User) => u.is_active));
        setUsersLoaded(true);
      } catch { /* proceed */ }
    }
    setShowCreate(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl font-bold">Kunden</h1>
        <button onClick={handleOpenCreate} className="bg-bd-accent text-white px-4 py-2 rounded-full font-heading font-bold text-sm hover:bg-[#d64f3e] transition-all">
          + Neuer Kunde
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
      </div>

      <div className="bg-white rounded-bd border border-bd-border overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-bd-border bg-bd-bg-secondary text-left">
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium">Firma</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium">Kontakt</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium">Kd.-Nr.</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium">Angebote</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium">Erstellt</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-bd-border last:border-0 hover:bg-bd-bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/kunden/${c.id}`} className="font-medium hover:text-bd-accent transition-colors">
                    {c.company_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-bd-text-body">{c.contact_person || '–'}</td>
                <td className="px-4 py-3 text-sm text-bd-text-muted">{c.customer_number || '–'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-bd-accent-dim text-bd-accent">
                    {c.offer_count || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-bd-text-muted">{formatDate(c.created_at)}</td>
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

      <CreateCustomerModal open={showCreate} onClose={() => setShowCreate(false)} users={users} onCreated={refetch} />
    </div>
  );
}
