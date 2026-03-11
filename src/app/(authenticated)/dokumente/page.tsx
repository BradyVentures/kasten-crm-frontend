'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/context/AuthContext';
import { Document as DocType } from '@/types';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

const CATEGORIES = ['Alle', 'Gesprächsleitfaden', 'Service-Info', 'Schulung', 'Sonstiges'] as const;

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  'Gesprächsleitfaden': { color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Service-Info': { color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'Schulung': { color: 'text-green-400', bg: 'bg-green-400/10' },
  'Sonstiges': { color: 'text-bd-text-secondary', bg: 'bg-bd-bg-secondary' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'IMG';
  if (mimeType.includes('word')) return 'DOC';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLS';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
  return 'TXT';
}

export default function DokumentePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeCategory, setActiveCategory] = useState<string>('Alle');
  const [showUpload, setShowUpload] = useState(false);

  const { data: documents, refetch } = usePolling<DocType[]>(
    () => api.get('/documents').then(r => r.data),
    30000
  );

  const filtered = activeCategory === 'Alle'
    ? documents || []
    : (documents || []).filter(d => d.category === activeCategory);

  const handleDownload = async (doc: DocType) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Fehler beim Download');
    }
  };

  const handlePreview = async (doc: DocType) => {
    if (doc.mime_type === 'application/pdf' || doc.mime_type.startsWith('image/')) {
      try {
        const response = await api.get(`/documents/${doc.id}/preview`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: doc.mime_type }));
        window.open(url, '_blank');
      } catch {
        alert('Fehler beim Anzeigen');
      }
    } else {
      handleDownload(doc);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument endgültig löschen?')) return;
    try {
      await api.delete(`/documents/${id}`);
      refetch();
    } catch {
      alert('Fehler beim Löschen');
    }
  };

  // Group by category for display
  const groupedByCategory = (filtered || []).reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, DocType[]>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Dokumente</h1>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 text-sm bg-bd-accent text-bd-bg font-semibold rounded-lg hover:brightness-110 transition-all"
          >
            + Dokument hochladen
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeCategory === cat
                ? 'bg-bd-accent text-bd-bg font-semibold'
                : 'bg-bd-card border border-bd-border text-bd-text-body hover:bg-bd-card-hover'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Documents */}
      {Object.keys(groupedByCategory).length === 0 ? (
        <div className="bg-bd-card rounded-bd border border-bd-border p-8 text-center">
          <p className="text-bd-text-muted">Keine Dokumente vorhanden.</p>
          {isAdmin && (
            <p className="text-sm text-bd-text-muted mt-1">Klicke auf &quot;+ Dokument hochladen&quot; um zu beginnen.</p>
          )}
        </div>
      ) : (
        Object.entries(groupedByCategory).map(([category, docs]) => (
          <div key={category} className="mb-6">
            {activeCategory === 'Alle' && (
              <h2 className="font-heading font-semibold mb-3">{category}</h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {docs.map(doc => (
                <div key={doc.id} className="bg-bd-card rounded-bd border border-bd-border p-4 hover:bg-bd-card-hover transition-colors">
                  <div className="flex items-start gap-3">
                    {/* File Type Icon */}
                    <div className="w-10 h-10 rounded-lg bg-bd-accent/10 text-bd-accent flex items-center justify-center text-xs font-bold shrink-0">
                      {getFileIcon(doc.mime_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-bd-text-muted mt-0.5 line-clamp-2">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          color={CATEGORY_COLORS[doc.category]?.color || 'text-bd-text-secondary'}
                          bg={CATEGORY_COLORS[doc.category]?.bg || 'bg-bd-bg-secondary'}
                        >
                          {doc.category}
                        </Badge>
                        <span className="text-[10px] text-bd-text-muted">{formatFileSize(doc.file_size)}</span>
                        <span className="text-[10px] text-bd-text-muted">{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-bd-border">
                    {(doc.mime_type === 'application/pdf' || doc.mime_type.startsWith('image/')) && (
                      <button
                        onClick={() => handlePreview(doc)}
                        className="flex-1 text-xs text-center py-1.5 bg-bd-bg-secondary rounded hover:brightness-110 transition-colors"
                      >
                        Vorschau
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex-1 text-xs text-center py-1.5 bg-bd-accent/10 text-bd-accent rounded hover:bg-bd-accent/20 transition-colors"
                    >
                      Download
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-xs text-center py-1.5 px-3 text-red-400 hover:text-red-300 transition-colors"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload Modal */}
      {isAdmin && (
        <UploadModal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { refetch(); setShowUpload(false); }}
        />
      )}
    </div>
  );
}

function UploadModal({ open, onClose, onUploaded }: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Sonstiges');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Bitte wähle eine Datei aus.'); return; }
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description);
      formData.append('category', category);

      await api.post('/documents', formData, {
        headers: { 'Content-Type': undefined as unknown as string },
      });

      setFile(null);
      setTitle('');
      setDescription('');
      setCategory('Sonstiges');
      onUploaded();
    } catch {
      setError('Fehler beim Hochladen. Bitte versuche es erneut.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dokument hochladen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-bd-accent bg-bd-accent/5' : 'border-bd-border hover:border-bd-text-muted'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <div>
              <p className="font-medium text-bd-accent">{file.name}</p>
              <p className="text-xs text-bd-text-muted mt-1">{formatFileSize(file.size)}</p>
              <p className="text-xs text-bd-text-muted mt-1">Klicken um Datei zu ändern</p>
            </div>
          ) : (
            <div>
              <p className="text-bd-text-body">Datei hierher ziehen oder klicken</p>
              <p className="text-xs text-bd-text-muted mt-1">PDF, DOC, XLS, PPT, Bilder (max. 50 MB)</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Titel *</label>
          <input required className="w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Beschreibung</label>
          <textarea rows={2} className="w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm text-bd-text-secondary mb-1">Kategorie</label>
          <select className="w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Gesprächsleitfaden">Gesprächsleitfaden</option>
            <option value="Service-Info">Service-Info</option>
            <option value="Schulung">Schulung</option>
            <option value="Sonstiges">Sonstiges</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full bg-bd-accent text-bd-bg font-semibold py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {uploading ? 'Hochladen...' : 'Dokument hochladen'}
        </button>
      </form>
    </Modal>
  );
}
