'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-bd-card rounded-t-xl sm:rounded-bd border-0 sm:border border-bd-border w-full sm:max-w-lg sm:mx-4 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-bd-border">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-bd-text-muted hover:text-bd-text text-2xl leading-none rounded-lg hover:bg-bd-card-hover transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
