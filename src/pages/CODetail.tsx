import { useIsMobile } from '@/hooks/use-mobile';
import { CODetailPage } from '@/components/change-orders/CODetailPage';
import { COJobTicket } from '@/components/change-orders/COJobTicket';

export default function CODetail() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <COJobTicket />;
  }

  return <CODetailPage />;
}
