'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Todo, User, Customer } from '@/types';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

type StatusFilter = 'alle' | 'offen' | 'erledigt';

function CreateTodoModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', assigned_to: '', customer_id: '' });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useState(() => {
    if (!open) return;
    api.get('/users').then((r) => setUsers(r.data.filter((u: User) => u.is_active))).catch(() => {});
    api.get('/customers?per_page=100').then((r) => setCustomers(r.data.customers || [])).catch(() => {});
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/todos', form); onCreated(); onClose(); setForm({ title: '', description: '', due_date: '', assigned_to: '', customer_id: '' }); }
    catch { alert('Fehler beim Erstellen des Todos'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Neues Todo">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Titel *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Was muss erledigt werden?" className="w-full" />
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
        <div>
          <label className="block text-sm text-bd-text-muted mb-1">Kunde (optional)</label>
          <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full">
            <option value="">Kein Kunde</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading || !form.title.trim()} className="w-full bg-bd-accent text-white font-semibold py-2.5 rounded-full hover:bg-[#d64f3e] disabled:opacity-50">
          {loading ? 'Erstelle...' : 'Todo erstellen'}
        </button>
      </form>
    </Modal>
  );
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().split('T')[0];
}

export default function TodosPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('offen');
  const [showCreate, setShowCreate] = useState(false);

  const queryParam = statusFilter === 'alle' ? '' : `?status=${statusFilter}`;

  const { data: todos, refetch } = usePolling<Todo[]>(
    () => api.get(`/todos${queryParam}`).then((r) => r.data),
    10000
  );

  const toggleStatus = useCallback(async (todo: Todo) => {
    const newStatus = todo.status === 'offen' ? 'erledigt' : 'offen';
    try { await api.put(`/todos/${todo.id}`, { status: newStatus }); refetch(); }
    catch { alert('Fehler beim Aktualisieren'); }
  }, [refetch]);

  const deleteTodo = useCallback(async (id: string) => {
    if (!confirm('Todo wirklich loeschen?')) return;
    try { await api.delete(`/todos/${id}`); refetch(); }
    catch { alert('Fehler beim Loeschen'); }
  }, [refetch]);

  const list = todos || [];
  const openCount = list.filter((t) => t.status === 'offen').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">Todos</h1>
          {statusFilter !== 'erledigt' && openCount > 0 && (
            <span className="text-xs bg-bd-accent/15 text-bd-accent px-2 py-0.5 rounded-full font-medium">{openCount} offen</span>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-bd-accent text-white px-4 py-2 rounded-full font-heading font-bold text-sm hover:bg-[#d64f3e] transition-all">
          + Neues Todo
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-bd-bg-secondary rounded-lg p-1 w-fit">
        {(['offen', 'alle', 'erledigt'] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === s ? 'bg-white text-bd-accent shadow-sm' : 'text-bd-text-muted hover:text-bd-text'}`}>
            {s === 'offen' ? 'Offen' : s === 'erledigt' ? 'Erledigt' : 'Alle'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((todo) => (
          <div key={todo.id} className={`bg-white rounded-bd border border-bd-border p-4 flex items-start gap-3 group hover:border-bd-border-accent/30 transition-colors ${todo.status === 'erledigt' ? 'opacity-60' : ''}`}>
            <button onClick={() => toggleStatus(todo)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${todo.status === 'erledigt' ? 'bg-bd-accent border-bd-accent text-white' : 'border-bd-border hover:border-bd-accent'}`}>
              {todo.status === 'erledigt' && <span className="text-xs">✓</span>}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${todo.status === 'erledigt' ? 'line-through text-bd-text-muted' : ''}`}>{todo.title}</p>
              {todo.description && <p className="text-xs text-bd-text-body mt-0.5 line-clamp-2">{todo.description}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {todo.customer_name && <Link href={`/kunden/${todo.customer_id}`} className="text-xs text-bd-accent hover:underline">{todo.customer_name}</Link>}
                {todo.offer_number && <span className="text-[10px] bg-bd-bg-secondary text-bd-text-muted px-1.5 py-0.5 rounded">{todo.offer_number}</span>}
                {todo.assigned_to_name && <span className="text-xs text-bd-text-muted">→ {todo.assigned_to_name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {todo.due_date && (
                <span className={`text-xs px-2 py-0.5 rounded ${todo.status === 'erledigt' ? 'text-bd-text-muted' : isOverdue(todo.due_date) ? 'text-red-500 bg-red-50' : isToday(todo.due_date) ? 'text-orange-500 bg-orange-50' : 'text-bd-text-muted'}`}>
                  {formatDate(todo.due_date)}
                </span>
              )}
              <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-bd-text-muted hover:text-red-500 transition-all text-sm">✕</button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="bg-white rounded-bd border border-bd-border p-8 text-center text-bd-text-muted">
            {statusFilter === 'erledigt' ? 'Keine erledigten Todos.' : 'Keine offenen Todos.'}
          </div>
        )}
      </div>

      <CreateTodoModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={refetch} />
    </div>
  );
}
