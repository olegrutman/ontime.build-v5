import { supabase } from '@/integrations/supabase/client';

interface CONotificationPayload {
  recipient_user_id: string;
  recipient_org_id: string;
  co_id: string;
  project_id: string;
  type: string;
  title: string;
  body: string;
  amount?: number;
}

export async function sendCONotification(payload: CONotificationPayload) {
  try {
    const { error } = await supabase.from('notifications').insert([{
      recipient_user_id: payload.recipient_user_id,
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
      console.warn('Notification insert failed (non-critical):', error.message);
    }
  } catch (err) {
    console.warn('Notification send failed (non-critical):', err);
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
          ? `TC is requesting a ${fmtAmount(amount)} increase on ${label}`
          : `TC is requesting an NTE increase on ${label}`,
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
      body: `${label} has been marked as completed by TC. Acknowledgment required.`,
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
      body: `${label} has reached 100% of the NTE cap. GC must increase or close.`,
    },
    FC_PRICING_SUBMITTED: {
      title: 'FC pricing submitted',
      body: `Field crew has submitted pricing on ${label}.`,
    },
  };

  return map[type] ?? { title: `${coWord} update`, body: label };
}
