import type { Metadata } from 'next';
import { PublicRequestPage } from '@/components/public-request/PublicRequestPage';

export const metadata: Metadata = {
  title: 'Request technical support | Saj Service Desk',
  description: 'Prepare a technical service request for Saj Service Desk.',
};

export default function RequestPage() {
  return <PublicRequestPage />;
}
