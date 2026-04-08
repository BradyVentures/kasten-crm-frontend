'use client';

export default function RechnungenPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-bold mb-6">Rechnungen</h1>
      <div className="bg-white border border-bd-border rounded-bd p-8 text-center">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="font-heading text-xl font-bold mb-2">Rechnungssystem</h2>
        <p className="text-bd-text-muted">Rechnungen koennen aus angenommenen Angeboten erstellt werden.</p>
        <p className="text-sm text-bd-text-muted mt-2">Wird in Phase 3 implementiert.</p>
      </div>
    </div>
  );
}
