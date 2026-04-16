import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveTableProps {
  /** Desktop table view */
  tableView: ReactNode;
  /** Mobile card/list view */
  cardView: ReactNode;
  /** Breakpoint: hide table below this (default md = 768px) */
  breakpoint?: 'sm' | 'md' | 'lg';
}

/**
 * Renders a desktop table or mobile card list based on viewport.
 * Usage:
 *   <ResponsiveTable
 *     tableView={<InvoiceTableView ... />}
 *     cardView={<InvoiceCardList ... />}
 *   />
 */
export function ResponsiveTable({ tableView, cardView }: ResponsiveTableProps) {
  const isMobile = useIsMobile();
  return isMobile ? <>{cardView}</> : <>{tableView}</>;
}
