'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const FIELD_OPTIONS = [
  { value: 'company_name', label: 'Firmenname' },
  { value: 'contact_person', label: 'Kontaktperson' },
  { value: 'email', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
  { value: 'website', label: 'Website' },
  { value: 'address', label: 'Adresse' },
  { value: 'city', label: 'Stadt' },
  { value: 'postal_code', label: 'PLZ' },
  { value: 'bundesland', label: 'Bundesland' },
];

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload');
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Import data
  const [importId, setImportId] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number>>({});

  // Result
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const [error, setError] = useState('');

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Don't set Content-Type manually - axios sets the correct multipart boundary automatically
      const { data } = await api.post('/leads/import', formData, {
        headers: { 'Content-Type': undefined as unknown as string },
      });
      setImportId(data.import_id);
      setHeaders(data.headers);
      setPreviewRows(data.preview_rows);
      setTotalRows(data.total_rows);

      // Auto-map headers that match field names (German labels)
      const autoMap: Record<string, number> = {};
      const headerLower = data.headers.map((h: string) => h.toLowerCase());
      for (const field of FIELD_OPTIONS) {
        const idx = headerLower.findIndex((h: string) =>
          h.includes(field.label.toLowerCase()) ||
          h.includes(field.value.replace('_', '')) ||
          (field.value === 'company_name' && (h.includes('firma') || h.includes('unternehmen') || h.includes('company'))) ||
          (field.value === 'contact_person' && (h.includes('kontakt') || h.includes('ansprechpartner') || h.includes('name'))) ||
          (field.value === 'city' && (h.includes('ort') || h.includes('stadt') || h.includes('city'))) ||
          (field.value === 'phone' && (h.includes('tel') || h.includes('phone') || h.includes('nummer'))) ||
          (field.value === 'postal_code' && (h.includes('plz') || h.includes('postleitzahl'))) ||
          (field.value === 'notes' && (h.includes('notiz') || h.includes('notes') || h.includes('bemerkung')))
        );
        if (idx >= 0) autoMap[field.value] = idx;
      }
      setMapping(autoMap);
      setStep('mapping');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error || 'Fehler beim Hochladen der Datei';
      setError(msg);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (mapping.company_name === undefined) {
      setError('Bitte "Firmenname" einer Spalte zuweisen');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const { data } = await api.post('/leads/import/confirm', {
        import_id: importId,
        column_mapping: mapping,
      });
      setResult(data);
      setStep('result');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error || 'Fehler beim Import. Bitte erneut hochladen.';
      setError(msg);
      console.error('Confirm error:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <button onClick={() => router.push('/leads')} className="text-sm text-bd-text-muted hover:text-bd-text mb-4 block">
        ← Zurück zu Leads
      </button>
      <h1 className="font-heading text-2xl font-bold mb-6">Excel Import</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div
          className="bg-bd-card rounded-bd border-2 border-dashed border-bd-border p-12 text-center cursor-pointer hover:border-bd-border-accent transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleUpload(file);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          {uploading ? (
            <div className="w-8 h-8 border-2 border-bd-accent border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            <>
              <p className="text-lg font-medium mb-2">Excel-Datei hierher ziehen</p>
              <p className="text-sm text-bd-text-muted">oder klicken zum Auswählen (.xlsx, .xls, .csv)</p>
            </>
          )}
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-bd-card rounded-bd p-5 border border-bd-border">
            <h2 className="font-heading font-semibold mb-4">Spalten zuweisen ({totalRows} Zeilen gefunden)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELD_OPTIONS.map((field) => (
                <div key={field.value} className="flex items-center gap-2">
                  <label className="text-sm w-32 shrink-0">{field.label}{field.value === 'company_name' ? ' *' : ''}</label>
                  <select
                    className="flex-1"
                    value={mapping[field.value] ?? -1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setMapping((prev) => {
                        const next = { ...prev };
                        if (val === -1) { delete next[field.value]; } else { next[field.value] = val; }
                        return next;
                      });
                    }}
                  >
                    <option value={-1}>– Nicht zuweisen –</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-bd-card rounded-bd border border-bd-border overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bd-border">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-xs text-bd-text-muted font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-bd-border">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-bd-text-body whitespace-nowrap max-w-[200px] truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm border border-bd-border rounded-lg hover:bg-bd-card-hover transition-colors">
              Zurück
            </button>
            <button onClick={handleConfirm} disabled={importing} className="px-6 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
              {importing ? 'Importieren...' : `${totalRows} Leads importieren`}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="bg-bd-card rounded-bd p-6 border border-bd-border">
          <h2 className="font-heading text-xl font-semibold mb-4 text-bd-accent">Import abgeschlossen</h2>
          <div className="space-y-2 text-sm">
            <p>Importiert: <strong>{result.imported}</strong></p>
            <p>Übersprungen: <strong>{result.skipped}</strong></p>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-500/10 rounded-lg text-sm text-red-400 max-h-40 overflow-auto">
              {result.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
          <button onClick={() => router.push('/leads')} className="mt-4 px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all">
            Zu den Leads
          </button>
        </div>
      )}
    </div>
  );
}
