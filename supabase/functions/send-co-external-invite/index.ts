const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_GATEWAY = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { recipient_email, co_number, co_title, project_name, invite_purpose, view_url } = await req.json()

    if (!recipient_email || !view_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const purposeLabel: Record<string, string> = {
      pricing: 'Provide Pricing',
      scope_ack: 'Confirm Scope',
      acknowledge: 'Acknowledge Receipt',
    }
    const actionLabel = purposeLabel[invite_purpose] || 'Respond'

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'DM Sans', Arial, sans-serif; background: #f4f6f8; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <div style="background: #1e293b; padding: 24px 32px;">
            <h1 style="color: white; font-size: 18px; margin: 0; font-family: 'Barlow Condensed', Arial, sans-serif;">
              Change Order — ${actionLabel} Requested
            </h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
              You've been invited to respond to a change order on <strong>${project_name || 'a project'}</strong>.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">CO Number</p>
              <p style="margin: 0 0 16px; font-size: 16px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; color: #0f172a;">
                ${co_number || '—'}
              </p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Title</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                ${co_title || '—'}
              </p>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              You are being asked to: <strong>${actionLabel}</strong>
            </p>
            <a href="${view_url}" style="display: inline-block; background: #1e293b; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Review &amp; Respond
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
              This link expires in 14 days. No account required.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    const emailRes = await fetch(`${RESEND_GATEWAY}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'x-lovable-api-key': LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        from: 'OnTime Build <noreply@ontime.build>',
        to: [recipient_email],
        subject: `Change Order ${co_number || ''} — ${actionLabel} Requested`,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('Email send failed:', errText)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
