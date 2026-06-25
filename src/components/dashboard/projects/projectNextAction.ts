import type { RecentDoc } from '@/hooks/useDashboardData';

interface AttentionItem {
  id: string;
  type: 'invoice' | 'invite' | 'sent_invite';
  title: string;
  projectName: string;
  projectId: string;
}

export interface NextAction {
  label: string;
  href: string;
  tone: 'urgent' | 'normal' | 'neutral';
}

/**
 * Resolve the highest-priority next action for a given project from existing
 * recentDocs + attentionItems already loaded by the dashboard.
 *
 * Priority order:
 *   1. Attention item belonging to this project (invoice awaiting approval, sent invite)
 *   2. Pending change order on this project
 *   3. Submitted invoice on this project
 *   4. Fallback: "View project"
 */
export function resolveProjectNextAction(
  projectId: string,
  recentDocs: RecentDoc[],
  attentionItems: AttentionItem[],
): NextAction {
  const att = attentionItems.find((a) => a.projectId === projectId);
  if (att) {
    if (att.type === 'invoice') {
      return { label: `Approve ${truncate(att.title, 22)}`, href: `/project/${projectId}?tab=invoices`, tone: 'urgent' };
    }
    if (att.type === 'sent_invite') {
      return { label: 'Chase pending invite', href: `/project/${projectId}`, tone: 'normal' };
    }
  }

  const pendingCO = recentDocs.find(
    (d) => d.projectId === projectId && d.type === 'change_order' && ['draft', 'shared', 'submitted'].includes(d.status),
  );
  if (pendingCO) {
    return { label: `Review ${truncate(pendingCO.title, 22)}`, href: `/project/${projectId}/change-orders`, tone: 'normal' };
  }

  const submittedInvoice = recentDocs.find(
    (d) => d.projectId === projectId && d.type === 'invoice' && d.status === 'SUBMITTED',
  );
  if (submittedInvoice) {
    return { label: `Invoice ${truncate(submittedInvoice.title, 22)}`, href: `/project/${projectId}?tab=invoices`, tone: 'normal' };
  }

  return { label: 'View project', href: `/project/${projectId}`, tone: 'neutral' };
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
