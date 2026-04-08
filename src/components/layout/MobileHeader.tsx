'use client';

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

export default function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-bd-border px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="font-heading text-lg font-bold text-bd-accent">Bauelemente Kasten</h1>
        <p className="text-[10px] text-bd-text-muted">CRM</p>
      </div>
      <button
        onClick={onMenuToggle}
        className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-bd-bg-secondary transition-colors"
        aria-label="Menue"
      >
        <div className="space-y-1.5">
          <span className="block w-5 h-0.5 bg-bd-text" />
          <span className="block w-5 h-0.5 bg-bd-text" />
          <span className="block w-5 h-0.5 bg-bd-text" />
        </div>
      </button>
    </header>
  );
}
