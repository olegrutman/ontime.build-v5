// Invoice external approval — token-gated, no auth required.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { action, token } = body ?? {};
  if (!action || !token) return json({ error: 'Missing action or token' }, 400);

  const { data: invite, error: inviteErr } = await supabase
    .from('invoice_external_invites')
    .select('id, invoice_id, email, responded_at, decision, decision_note, approver_name, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (inviteErr || !invite) return json({ error: 'This link is invalid or has expired.' }, 404);
  if (new Date(invite.expires_at) < new Date()) return json({ error: 'This link has expired.' }, 410);

  if (action === 'load_approval') {
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, subtotal, retainage_amount, total_amount, notes, billing_period_start, billing_period_end, project_id')
      .eq('id', invite.invoice_id)
      .maybeSingle();
    if (invErr || !inv) return json({ error: 'Invoice not found' }, 404);

    const { data: lines } = await supabase
      .from('invoice_line_items')
      .select('id, description, amount_this_period')
      .eq('invoice_id', invite.invoice_id);

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', inv.project_id)
      .maybeSingle();

    return json({
      invite: {
        responded_at: invite.responded_at,
        decision: invite.decision,
        approver_name: invite.approver_name,
        email: invite.email,
      },
      invoice: inv,
      line_items: lines ?? [],
      project_name: project?.name ?? null,
    });
  }

  if (action === 'submit_approval') {
    if (invite.responded_at) return json({ error: 'This invite has already been responded to.' }, 409);
    const { decision, approver_name, rejection_note } = body;
    if (!['approved', 'rejected'].includes(decision)) return json({ error: 'Invalid decision' }, 400);
    if (!approver_name || String(approver_name).trim().length < 2) return json({ error: 'Name required' }, 400);
    if (decision === 'rejected' && (!rejection_note || String(rejection_note).trim().length < 3)) {
      return json({ error: 'Rejection reason required' }, 400);
    }

    const { error: updErr } = await supabase
      .from('invoice_external_invites')
      .update({
        decision,
        decision_note: decision === 'rejected' ? String(rejection_note).trim() : null,
        approver_name: String(approver_name).trim(),
        responded_at: new Date().toISOString(),
      })
      .eq('id', invite.id);
    if (updErr) return json({ error: updErr.message }, 500);

    // Mirror decision on the invoice itself.
    if (decision === 'approved') {
      await supabase.from('invoices').update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
      }).eq('id', invite.invoice_id);
    } else {
      await supabase.from('invoices').update({
        status: 'REJECTED',
        rejected_at: new Date().toISOString(),
        rejection_reason: String(rejection_note).trim(),
      }).eq('id', invite.invoice_id);
    }

    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
