import { supabase } from '@/integrations/supabase/client';

interface CONotificationPayload {
  /** Leave null to alert the whole recipient organization. */
  recipient_user_id?: string | null;
  recipient_org_id: string;
  co_id: string;
  project_id: string;
  type: string;
  title: string;
  body: string;
  amount?: number;
}

export async function sendCONotification(payload: CONotificationPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert([{
      recipient_user_id: payload.recipient_user_id ?? null,
      recipient_org_id: payload.recipient_org_id,
      type: payload.type as any,
      title: payload.title,
      body: payload.body,
      entity_type: 'change_order',
      entity_id: payload.co_id,
      action_url: `/project/${payload.project_id}/change-orders/${payload.co_id}`,
      is_read: false,
    }]);

    if (error) {
      console.warn('Notification insert failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Notification send failed:', err);
    return false;
  }
}

export function buildCONotification(
  type: string,
  coTitle: string | null,
  amount?: number,
  isTM = false
): { title: string; body: string } {
  const label = coTitle ?? (isTM ? 'Work Order' : 'Change Order');
  const coWord = isTM ? 'Work order' : 'Change order';
  const fmtAmount = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const map: Record<string, { title: string; body: string }> = {
    CO_SHARED: {
      title: `${coWord} shared with you`,
      body: `${label} has been shared for your review`,
    },
    CHANGE_SUBMITTED: {
      title: `${coWord} submitted for approval`,
      body:
        amount != null
          ? `${label} — ${fmtAmount(amount)} awaiting your approval`
          : `${label} awaiting your approval`,
    },
    CHANGE_APPROVED: {
      title: `${coWord} approved`,
      body: `${label} has been approved`,
    },
    CHANGE_REJECTED: {
      title: `${coWord} rejected`,
      body: `${label} was rejected — check the detail page for the reason`,
    },
    CO_RECALLED: {
      title: `${coWord} recalled`,
      body: `${label} has been recalled for revision`,
    },
    NTE_REQUESTED: {
      title: 'NTE increase requested',
      body:
        amount != null
          ? `A ${fmtAmount(amount)} increase is being requested on ${label}`
          : `An NTE increase is being requested on ${label}`,
    },
    NTE_APPROVED: {
      title: 'NTE increase approved',
      body:
        amount != null
          ? `Your NTE cap has been increased by ${fmtAmount(amount)} on ${label}`
          : `Your NTE increase has been approved on ${label}`,
    },
    NTE_REJECTED: {
      title: 'NTE increase declined',
      body: `Your NTE increase request was declined on ${label}`,
    },
    CO_CLOSED_FOR_PRICING: {
      title: `${isTM ? 'WO' : 'CO'} closed for final pricing`,
      body: `${label} — scope is finalized. Submit your final pricing.`,
    },
    CO_COMPLETED: {
      title: 'Work marked complete',
      body: `${label} has been marked as completed. Acknowledgment required.`,
    },
    CO_ACKNOWLEDGED: {
      title: 'Completion acknowledged',
      body: `${label} completion has been acknowledged. You can now create an invoice.`,
    },
    CO_SCOPE_ADDED: {
      title: `New scope added to ${isTM ? 'WO' : 'CO'}`,
      body: `${label} has new line items added.`,
    },
    NTE_WARNING_80: {
      title: 'NTE cap at 80%',
      body: `${label} has reached 80% of the NTE cap.`,
    },
    NTE_BLOCKED_100: {
      title: 'NTE cap reached — additions blocked',
      body: `${label} has reached 100% of the NTE cap. It must be increased or closed.`,
    },
    FC_PRICING_SUBMITTED: {
      title: 'Crew pricing submitted',
      body: `Crew has submitted pricing on ${label}.`,
    },
    CO_WITHDRAWN: {
      title: `${coWord} withdrawn`,
      body: `${label} has been withdrawn and is no longer active.`,
    },
    BACKCHARGE_CREATED: {
      title: 'Backcharge issued against you',
      body:
        amount != null
          ? `A backcharge of ${fmtAmount(amount)} was issued on ${label}`
          : `A backcharge was issued on ${label}`,
    },
    RETAINAGE_RELEASED: {
      title: 'Retainage released',
      body:
        amount != null
          ? `${fmtAmount(amount)} of retainage was released on ${label}`
          : `Retainage was released on ${label}`,
    },
  };

  return map[type] ?? { title: `${coWord} update`, body: label };
}
