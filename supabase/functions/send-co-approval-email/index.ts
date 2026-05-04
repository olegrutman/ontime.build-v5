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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!LOVABLE_API_KEY || !RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { co_id, approval_type, recipient_email, token, co_title, co_number, co_total, project_name, approve_url } = await req.json()

    if (!co_id || !approval_type || !recipient_email || !token || !approve_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const roleLabel = approval_type === 'owner' ? 'Owner' : 'Architect'
    const total = typeof co_total === 'number' ? `$${co_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : co_total

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'DM Sans', Arial, sans-serif; background: #f4f6f8; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <div style="background: #1e293b; padding: 24px 32px;">
            <h1 style="color: white; font-size: 18px; margin: 0; font-family: 'Barlow Condensed', Arial, sans-serif;">Change Order ${roleLabel} Approval Required</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
              A change order on <strong>${project_name || 'the project'}</strong> requires your review and approval.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">CO Number</p>
              <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #0f172a;">${co_number || 'N/A'}</p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Description</p>
              <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #0f172a;">${co_title}</p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Total Amount</p>
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; font-family: 'IBM Plex Mono', monospace;">${total}</p>
            </div>
            <a href="${approve_url}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Review & Approve
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
              This link is unique to this approval request. Do not forward this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    const emailResponse = await fetch(`${RESEND_GATEWAY}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'OnTime Build <noreply@ontime.build>',
        to: [recipient_email],
        subject: `${roleLabel} Approval Required: ${co_title} (${total})`,
        html,
      }),
    })

    const emailResult = await emailResponse.json()

    return new Response(JSON.stringify({ success: true, email: emailResult }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
