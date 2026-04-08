'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { ImportPreviewRow } from '@/types';

export default function ImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/import/customers/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows(res.data.rows);
      setSelectedRows(new Set(res.data.rows.map((_: ImportPreviewRow, i: number) => i)));
      setStep(2);
    } catch (err) {
      alert('Fehler beim Hochladen: ' + ((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Unbekannter Fehler'));
    }
    setUploading(false);
  };

  const toggleRow = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateRow = (index: number, field: string, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const executeImport = async () => {
    setImporting(true);
    const selectedData = rows
      .filter((_, i) => selectedRows.has(i))
      .map((r) => ({
        company_name: r.company_name || '',
        contact_person: r.contact_person || undefined,
        email: r.email || undefined,
        phone: r.phone || undefined,
        mobile: r.mobile || undefined,
        address: r.address || undefined,
        city: r.city || undefined,
        postal_code: r.postal_code || undefined,
      }))
      .filter((r) => r.company_name);

    try {
      const res = await api.post('/import/customers/execute', { rows: selectedData });
      setResult(res.data);
      setStep(3);
    } catch {
      alert('Fehler beim Importieren');
    }
    setImporting(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-6">Kunden-Import</h1>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white border border-bd-border rounded-bd p-8 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="font-heading text-xl font-bold mb-2">Word-Datei hochladen</h2>
          <p className="text-bd-text-muted mb-6">Laden Sie eine .docx-Datei mit Kundendaten hoch. Die Daten werden automatisch erkannt.</p>

          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-bd-accent text-white px-6 py-3 rounded-full font-heading font-bold hover:bg-[#d64f3e] transition-colors disabled:opacity-50"
          >
            {uploading ? 'Wird verarbeitet...' : 'Datei auswaehlen'}
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-bd-text-muted">{rows.length} Eintraege erkannt, {selectedRows.size} ausgewaehlt</p>
            <div className="flex gap-2">
              <button onClick={() => { setStep(1); setRows([]); }} className="text-sm text-bd-text-muted hover:text-bd-accent">
                Zurueck
              </button>
              <button
                onClick={executeImport}
                disabled={importing || selectedRows.size === 0}
                className="bg-bd-accent text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#d64f3e] disabled:opacity-50"
              >
                {importing ? 'Importiere...' : `${selectedRows.size} Kunden importieren`}
              </button>
            </div>
          </div>

          <div className="bg-white border border-bd-border rounded-bd overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bd-bg-secondary text-bd-text-muted text-left">
                  <th className="px-3 py-2 font-medium w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === rows.length}
                      onChange={() => {
                        if (selectedRows.size === rows.length) setSelectedRows(new Set());
                        else setSelectedRows(new Set(rows.map((_, i) => i)));
                      }}
                      className="w-3.5 h-3.5"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Firma</th>
                  <th className="px-3 py-2 font-medium">Ansprechpartner</th>
                  <th className="px-3 py-2 font-medium">E-Mail</th>
                  <th className="px-3 py-2 font-medium">Telefon</th>
                  <th className="px-3 py-2 font-medium">PLZ</th>
                  <th className="px-3 py-2 font-medium">Ort</th>
                  <th className="px-3 py-2 font-medium w-12">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-t border-bd-border ${row.confidence < 0.3 ? 'bg-red-50' : row.confidence < 0.6 ? 'bg-yellow-50' : ''}`}>
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(i)}
                        onChange={() => toggleRow(i)}
                        className="w-3.5 h-3.5"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={row.company_name || ''}
                        onChange={(e) => updateRow(i, 'company_name', e.target.value)}
                        className="w-full !py-1 !text-xs !border-0 !bg-transparent focus:!bg-white focus:!border focus:!border-bd-border"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={row.contact_person || ''} onChange={(e) => updateRow(i, 'contact_person', e.target.value)} className="w-full !py-1 !text-xs !border-0 !bg-transparent focus:!bg-white focus:!border focus:!border-bd-border" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={row.email || ''} onChange={(e) => updateRow(i, 'email', e.target.value)} className="w-full !py-1 !text-xs !border-0 !bg-transparent focus:!bg-white focus:!border focus:!border-bd-border" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={row.phone || ''} onChange={(e) => updateRow(i, 'phone', e.target.value)} className="w-full !py-1 !text-xs !border-0 !bg-transparent focus:!bg-white focus:!border focus:!border-bd-border" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={row.postal_code || ''} onChange={(e) => updateRow(i, 'postal_code', e.target.value)} className="w-full !py-1 !text-xs !border-0 !bg-transparent focus:!bg-white focus:!border focus:!border-bd-border max-w-[70px]" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={row.city || ''} onChange={(e) => updateRow(i, 'city', e.target.value)} className="w-full !py-1 !text-xs !border-0 !bg-transparent focus:!bg-white focus:!border focus:!border-bd-border" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`text-xs font-medium ${row.confidence >= 0.6 ? 'text-green-600' : row.confidence >= 0.3 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round(row.confidence * 100)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div className="bg-white border border-bd-border rounded-bd p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-heading text-xl font-bold mb-2">Import abgeschlossen</h2>
          <p className="text-bd-text-muted mb-6">{result.imported} von {result.total} Kunden erfolgreich importiert.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setStep(1); setRows([]); setResult(null); }}
              className="bg-bd-bg-secondary text-bd-text-body px-4 py-2 rounded-full text-sm hover:bg-bd-border"
            >
              Weitere Datei importieren
            </button>
            <button
              onClick={() => window.location.href = '/kunden'}
              className="bg-bd-accent text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#d64f3e]"
            >
              Zur Kundenliste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
