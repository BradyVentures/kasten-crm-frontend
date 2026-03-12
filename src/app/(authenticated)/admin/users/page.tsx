'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { User } from '@/types';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

export default function AdminUsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [showReset, setShowReset] = useState<User | null>(null);

  const { data: users, refetch } = usePolling<User[]>(
    () => api.get('/users').then((r) => r.data),
    30000
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl font-bold">Benutzer verwalten</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          + Neuer Benutzer
        </button>
      </div>

      <div className="bg-bd-card rounded-bd border border-bd-border overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-bd-border text-left">
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">E-Mail</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Rolle</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider w-36"></th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id} className="border-b border-bd-border last:border-0 hover:bg-bd-card-hover transition-colors">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-sm text-bd-text-body">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge color={u.role === 'admin' ? 'text-bd-accent' : 'text-blue-400'}
                         bg={u.role === 'admin' ? 'bg-bd-accent-dim' : 'bg-blue-400/10'}>
                    {u.role === 'admin' ? 'Admin' : 'Mitarbeiter'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge color={u.is_active ? 'text-green-400' : 'text-red-400'} bg={u.is_active ? 'bg-green-400/10' : 'bg-red-400/10'}>
                    {u.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(u); setShowForm(true); }} className="text-xs text-bd-accent hover:brightness-110 mr-3">
                    Bearbeiten
                  </button>
                  <button onClick={() => setShowReset(u)} className="text-xs text-bd-text-muted hover:text-bd-text">
                    Passwort
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit User Modal */}
      <UserFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        user={editing}
        onSaved={refetch}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={!!showReset}
        onClose={() => setShowReset(null)}
        user={showReset}
        onSaved={refetch}
      />
    </div>
  );
}

function UserFormModal({ open, onClose, user, onSaved }: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', is_active: true });
  const [loading, setLoading] = useState(false);

  // Reset form when user changes
  useState(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active });
    } else {
      setForm({ name: '', email: '', password: '', role: 'employee', is_active: true });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) {
        await api.put(`/users/${user.id}`, {
          name: form.name, email: form.email, role: form.role, is_active: form.is_active,
        });
      } else {
        await api.post('/users', {
          name: form.name, email: form.email, password: form.password, role: form.role,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Name *</label>
          <input required className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">E-Mail *</label>
          <input required type="email" className="w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        {!user && (
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Passwort *</label>
            <input required type="password" minLength={6} className="w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-bd-text-secondary mb-1">Rolle</label>
            <select className="w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Mitarbeiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {user && (
            <div>
              <label className="block text-sm text-bd-text-secondary mb-1">Status</label>
              <select className="w-full" value={form.is_active.toString()} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                <option value="true">Aktiv</option>
                <option value="false">Inaktiv</option>
              </select>
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ open, onClose, user, onSaved }: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await api.patch(`/users/${user.id}/password`, { password });
      onSaved();
      onClose();
      setPassword('');
    } catch {
      alert('Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Passwort zurücksetzen: ${user?.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Neues Passwort *</label>
          <input required type="password" minLength={6} className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {loading ? 'Zurücksetzen...' : 'Passwort zurücksetzen'}
        </button>
      </form>
    </Modal>
  );
}
