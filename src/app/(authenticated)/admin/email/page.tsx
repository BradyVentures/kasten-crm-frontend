'use client';

export default function EmailSettingsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-6">E-Mail Einstellungen</h1>
      <div className="bg-white border border-bd-border rounded-bd p-8 text-center">
        <div className="text-5xl mb-4">✉️</div>
        <h2 className="font-heading text-xl font-bold mb-2">SMTP-Konfiguration</h2>
        <p className="text-bd-text-muted">Hier werden SMTP-Server, Templates und Absender konfiguriert.</p>
        <p className="text-sm text-bd-text-muted mt-2">Wird in Phase 4 implementiert.</p>
      </div>
    </div>
  );
}
