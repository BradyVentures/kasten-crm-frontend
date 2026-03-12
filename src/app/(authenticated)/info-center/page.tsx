'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/context/AuthContext';
import { Service } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

interface InfoPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_by_name: string | null;
  updated_at: string;
}

type Tab = 'katalog' | 'leitfaden' | 'einwaende' | 'rechner' | 'faq';

const TABS: { key: Tab; label: string }[] = [
  { key: 'katalog', label: 'Service-Katalog' },
  { key: 'leitfaden', label: 'Gesprächsleitfaden' },
  { key: 'einwaende', label: 'Einwandbehandlung' },
  { key: 'rechner', label: 'Preisrechner' },
  { key: 'faq', label: 'FAQ' },
];

export default function InfoCenterPage() {
  const [activeTab, setActiveTab] = useState<Tab>('katalog');

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Info Center</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-bd-border overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
              activeTab === tab.key
                ? 'border-bd-accent text-bd-accent'
                : 'border-transparent text-bd-text-muted hover:text-bd-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'katalog' && <ServiceKatalog />}
      {activeTab === 'leitfaden' && <EditablePage slug="gespraechsleitfaden" />}
      {activeTab === 'einwaende' && <EditablePage slug="einwandbehandlung" />}
      {activeTab === 'rechner' && <Preisrechner />}
      {activeTab === 'faq' && <EditablePage slug="faq" />}
    </div>
  );
}

// ── Service-Katalog ──────────────────────────────────────────────

function ServiceKatalog() {
  const { data: services } = usePolling<Service[]>(
    () => api.get('/services').then((r) => r.data),
    30000
  );

  const activeServices = (services || []).filter((s) => s.is_active);
  const categories = Array.from(new Set(activeServices.map((s) => s.category).filter(Boolean)));

  return (
    <div className="space-y-8">
      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="font-heading font-semibold text-lg mb-4">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeServices
              .filter((s) => s.category === cat)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
          </div>
        </div>
      ))}
      {categories.length === 0 && (
        <p className="text-bd-text-muted text-sm">Keine aktiven Services gefunden.</p>
      )}
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-bd-card rounded-bd border border-bd-border p-4 hover:border-bd-border-accent transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium">{service.name}</h3>
        <div className="text-right flex-shrink-0 ml-3">
          <span className="font-semibold text-bd-accent">{formatCurrency(service.base_price)}</span>
          <p className="text-xs text-bd-text-muted">
            {service.price_model === 'monatlich' ? '/Monat' : 'einmalig'}
          </p>
        </div>
      </div>

      {service.short_description && (
        <p className="text-sm text-bd-text-body mb-2">{service.short_description}</p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <Badge
          color={service.type === 'paket' ? 'text-blue-400' : 'text-purple-400'}
          bg={service.type === 'paket' ? 'bg-blue-400/10' : 'bg-purple-400/10'}
        >
          {service.type === 'paket' ? 'Paket' : 'Add-on'}
        </Badge>
        {service.commission_rate > 0 && (
          <Badge color="text-bd-text-secondary" bg="bg-bd-bg-secondary">
            {service.commission_rate}% Provision
          </Badge>
        )}
      </div>

      {(service.description || service.includes) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-bd-accent hover:underline mt-1"
        >
          {expanded ? 'Weniger anzeigen' : 'Details anzeigen'}
        </button>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-bd-border space-y-2">
          {service.description && (
            <p className="text-sm text-bd-text-body">{service.description}</p>
          )}
          {service.includes && (
            <div>
              <p className="text-xs text-bd-text-muted font-medium mb-1">Inklusive:</p>
              <p className="text-sm text-bd-text-body whitespace-pre-line">{service.includes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Editable Page (Leitfaden, Einwaende, FAQ) ────────────────────

function EditablePage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [page, setPage] = useState<InfoPage | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPage = useCallback(async () => {
    try {
      const { data } = await api.get(`/info-pages/${slug}`);
      setPage(data);
    } catch {
      // page may not exist yet
    }
  }, [slug]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const handleEdit = () => {
    setEditContent(page?.content || '');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/info-pages/${slug}`, { content: editContent });
      await fetchPage();
      setEditing(false);
    } catch {
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (!page) {
    return <p className="text-bd-text-muted text-sm">Wird geladen...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          {page.updated_by_name && (
            <p className="text-xs text-bd-text-muted">
              Zuletzt bearbeitet von {page.updated_by_name}
            </p>
          )}
        </div>
        {isAdmin && !editing && (
          <button
            onClick={handleEdit}
            className="px-3 py-1.5 text-sm bg-bd-bg-secondary border border-bd-border rounded-lg hover:border-bd-border-accent transition-colors"
          >
            Bearbeiten
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={25}
            className="w-full font-mono text-sm"
            placeholder="Inhalt im Markdown-Format..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all text-sm"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-bd-bg-secondary border border-bd-border rounded-lg hover:border-bd-border-accent transition-colors text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-bd-card rounded-bd border border-bd-border p-6">
          <MarkdownContent content={page.content} />
        </div>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown renderer for headings, bold, lists, paragraphs
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="font-heading font-semibold text-lg mt-6 mb-3 first:mt-0">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="font-heading font-semibold mt-5 mb-2 text-bd-accent">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('- ')) {
      // Collect consecutive list items
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="list-disc list-inside space-y-1.5 my-3 text-sm text-bd-text-body">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue; // skip the i++ at end since we already advanced
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      elements.push(
        <p key={i} className="text-sm text-bd-text-body my-2 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }

    i++;
  }

  return <div>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-bd-text">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Preisrechner ─────────────────────────────────────────────────

function Preisrechner() {
  const { data: services } = usePolling<Service[]>(
    () => api.get('/services').then((r) => r.data),
    30000
  );

  const activeServices = (services || []).filter((s) => s.is_active);

  const [selectedServices, setSelectedServices] = useState<
    { serviceId: string; months: number }[]
  >([]);
  const [addServiceId, setAddServiceId] = useState('');

  const handleAdd = () => {
    if (!addServiceId) return;
    if (selectedServices.some((s) => s.serviceId === addServiceId)) return;
    setSelectedServices([...selectedServices, { serviceId: addServiceId, months: 12 }]);
    setAddServiceId('');
  };

  const handleRemove = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.serviceId !== serviceId));
  };

  const handleMonthsChange = (serviceId: string, months: number) => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.serviceId === serviceId ? { ...s, months } : s
      )
    );
  };

  // Calculate totals
  let totalEinmalig = 0;
  let totalMonatlich = 0;
  let totalVertragswert = 0;

  const items = selectedServices.map((sel) => {
    const svc = activeServices.find((s) => s.id === sel.serviceId);
    if (!svc) return null;

    if (svc.price_model === 'einmalig') {
      totalEinmalig += svc.base_price;
      totalVertragswert += svc.base_price;
    } else {
      totalMonatlich += svc.base_price;
      totalVertragswert += svc.base_price * sel.months;
    }

    return { ...sel, service: svc };
  }).filter(Boolean) as { serviceId: string; months: number; service: Service }[];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {/* Service Selector */}
        <div className="flex gap-2 mb-4">
          <select
            className="flex-1"
            value={addServiceId}
            onChange={(e) => setAddServiceId(e.target.value)}
          >
            <option value="">Service hinzufügen...</option>
            {activeServices
              .filter((s) => !selectedServices.some((sel) => sel.serviceId === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatCurrency(s.base_price)} / {s.price_model})
                </option>
              ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!addServiceId}
            className="px-4 py-2 bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all text-sm"
          >
            +
          </button>
        </div>

        {/* Selected Services List */}
        {items.length > 0 ? (
          <div className="bg-bd-card rounded-bd border border-bd-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bd-border text-left">
                  <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Preis</th>
                  <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider">Laufzeit</th>
                  <th className="px-4 py-3 text-xs text-bd-text-muted font-medium uppercase tracking-wider text-right">Gesamt</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ serviceId, months, service }) => {
                  const isMonthly = service.price_model === 'monatlich';
                  const lineTotal = isMonthly ? service.base_price * months : service.base_price;
                  return (
                    <tr key={serviceId} className="border-b border-bd-border last:border-0">
                      <td className="px-4 py-3 text-sm">
                        {service.name}
                        <span className="ml-2">
                          <Badge
                            color={isMonthly ? 'text-bd-text-secondary' : 'text-blue-400'}
                            bg={isMonthly ? 'bg-bd-bg-secondary' : 'bg-blue-400/10'}
                          >
                            {isMonthly ? 'Monatlich' : 'Einmalig'}
                          </Badge>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(service.base_price)}{isMonthly ? '/Mo' : ''}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isMonthly ? (
                          <input
                            type="number"
                            min="1"
                            value={months}
                            onChange={(e) => handleMonthsChange(serviceId, parseInt(e.target.value) || 1)}
                            className="w-20 text-center text-sm"
                          />
                        ) : (
                          <span className="text-bd-text-muted">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemove(serviceId)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-bd-card rounded-bd border border-bd-border p-8 text-center">
            <p className="text-bd-text-muted text-sm">
              Wählen Sie Services aus, um eine Preisberechnung zu erstellen.
            </p>
          </div>
        )}
      </div>

      {/* Summary Sidebar */}
      <div className="space-y-4">
        <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
          <h2 className="font-heading font-semibold mb-3">Zusammenfassung</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-bd-text-secondary">Einmalige Kosten</p>
              <p className="text-xl font-bold">{formatCurrency(totalEinmalig)}</p>
            </div>
            <div>
              <p className="text-sm text-bd-text-secondary">Monatliche Kosten</p>
              <p className="text-xl font-bold text-bd-accent">{formatCurrency(totalMonatlich)}</p>
            </div>
            <div className="pt-3 border-t border-bd-border">
              <p className="text-sm text-bd-text-secondary">Gesamter Vertragswert</p>
              <p className="text-2xl font-bold">{formatCurrency(totalVertragswert)}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-bd-text-muted">
          Preise können im Verkaufsgespräch angepasst werden. Hier werden die Listenpreise verwendet.
        </p>
      </div>
    </div>
  );
}
