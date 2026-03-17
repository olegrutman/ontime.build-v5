import { supabase } from '@/integrations/supabase/client';

interface CONotificationPayload {
  recipient_user_id: string;
  co_id: string;
  project_id: string;
  type: string;
  title: string;
  body: string;
  amount?: number;
}

export async function sendCONotification(payload: CONotificationPayload) {
  try {
    const { error } = await supabase.from('notifications').insert({
      recipient_user_id: payload.recipient_user_id,
      type: payload.type as any,
      title: payload.title,
      body: payload.body,
      entity_type: 'change_order',
      entity_id: payload.co_id,
      action_url: `/projects/${payload.project_id}/co/${payload.co_id}`,
      is_read: false,
    });

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
  amount?: number
): { title: string; body: string } {
  const label = coTitle ?? 'Change Order';

  const fmtAmount = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const map: Record<string, { title: string; body: string }> = {
    CO_SHARED: {
      title: 'Change order shared with you',
      body: `${label} has been shared for your review`,
    },
    CHANGE_SUBMITTED: {
      title: 'Change order submitted for approval',
      body:
        amount != null
          ? `${label} — ${fmtAmount(amount)} awaiting your approval`
          : `${label} awaiting your approval`,
    },
    CHANGE_APPROVED: {
      title: 'Change order approved',
      body: `${label} has been approved`,
    },
    CHANGE_REJECTED: {
      title: 'Change order rejected',
      body: `${label} was rejected — check the detail page for the reason`,
    },
    CO_RECALLED: {
      title: 'Change order recalled',
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
  };

  return map[type] ?? { title: 'Change order update', body: label };
}
