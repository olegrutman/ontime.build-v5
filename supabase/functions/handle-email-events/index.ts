import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Records terminal delivery outcomes in the app's own tables so the office can
// see which addresses stopped receiving mail. These rows are notification-only:
// Lovable enforces suppression at send time.
function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

type Outcome = {
  logStatus: 'bounced' | 'complained' | 'suppressed'
  reason: 'bounce' | 'complaint' | 'unsubscribe'
  message: string
}

async function record(
  event: { event_id: string; data: { recipient: string; message_id?: string | null } },
  outcome: Outcome,
) {
  const supabase = serviceClient()
  const email = String(event.data.recipient ?? '').toLowerCase()

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: email,
    status: outcome.logStatus,
    error_message: outcome.message,
  })
  if (logError) {
    console.error('Failed to log email outcome', {
      event_id: event.event_id,
      code: logError.code,
      message: logError.message,
    })
    throw new Error('Failed to log email outcome')
  }

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason: outcome.reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Failed to record suppression', {
      event_id: event.event_id,
      code: suppressError.code,
      message: suppressError.message,
    })
    throw new Error('Failed to record suppression')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record(event, {
        logStatus: 'bounced',
        reason: 'bounce',
        message: 'Email bounced — address suppressed',
      })
    },
    'email.complaint': async (event) => {
      await record(event, {
        logStatus: 'complained',
        reason: 'complaint',
        message: 'Recipient marked the email as spam — address suppressed',
      })
    },
    'email.unsubscribed': async (event) => {
      await record(event, {
        logStatus: 'suppressed',
        reason: 'unsubscribe',
        message: 'Recipient unsubscribed',
      })
    },
  },
})

Deno.serve((req) => handler(req))
