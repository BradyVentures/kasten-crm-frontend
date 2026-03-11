import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LeadStatus, ActivityType } from '@/types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(date: string): string {
  return format(new Date(date), 'dd.MM.yyyy', { locale: de });
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de });
}

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  neu: { label: 'Neu', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  kontaktiert: { label: 'Kontaktiert', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  qualifiziert: { label: 'Qualifiziert', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  angebot: { label: 'Angebot', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  gewonnen: { label: 'Gewonnen', color: 'text-bd-accent', bg: 'bg-bd-accent-dim' },
  verloren: { label: 'Verloren', color: 'text-red-400', bg: 'bg-red-400/10' },
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  anruf: 'Anruf',
  email: 'E-Mail',
  status_aenderung: 'Status geändert',
  notiz: 'Notiz',
  zuweisung: 'Zugewiesen',
  erstellt: 'Erstellt',
  import: 'Importiert',
  konvertiert: 'Konvertiert',
};
