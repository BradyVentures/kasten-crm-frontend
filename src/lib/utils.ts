import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { OfferStatus } from '@/types';

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

export const OFFER_STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; bg: string }> = {
  entwurf: { label: 'Entwurf', color: 'text-gray-600', bg: 'bg-gray-100' },
  gesendet: { label: 'Gesendet', color: 'text-blue-600', bg: 'bg-blue-100' },
  angenommen: { label: 'Angenommen', color: 'text-green-600', bg: 'bg-green-100' },
  abgelehnt: { label: 'Abgelehnt', color: 'text-red-600', bg: 'bg-red-100' },
};
