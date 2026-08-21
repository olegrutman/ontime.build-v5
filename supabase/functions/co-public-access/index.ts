// Change Order / Work Order external access — token-gated, no auth required.
// Mirrors `invoice-public-access`: service-role reads, redacted payloads,
// single-use decisions. Never returns internal costs, rates or markup.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Redacted CO header — approval-level figures only. */
const CO_APPROVAL_COLS =
  'id, project_id, org_id, created_by_user_id, created_by_role, co_number, title, status, document_type, ' +
  'location_tag, reason_note, pricing_type, tc_submitted_price, total_tax, ' +
  'owner_approval_status, architect_approval_status';

/**
 * Who the external approver is, in the requester's own words.
 * A GC sends up to the Owner / Architect. A TC or FC whose upstream party is
 * NOT on the platform sends up to that off-platform general contractor.
 */
function roleLabelFor(createdByRole: string | null, approvalType: 'owner' | 'architect') {
  if (approvalType === 'architect') return 'Architect';
  return createdByRole && createdByRole !== 'GC' ? 'General Contractor' : 'Owner';
}

async function logActivity(
  coId: string,
  projectId: string,
  actorUserId: string,
  action: string,
  detail: string,
  amount: number | null = null,
) {
  await supabase.from('co_activity').insert({
    co_id: coId,
    project_id: projectId,
    actor_user_id: actorUserId,
    actor_role: 'EXTERNAL',
    action,
    detail,
    amount,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const action = typeof body?.action === 'string' ? body.action : null;
  const token = typeof body?.token === 'string' ? body.token.trim() : null;
  if (!action || !token || token.length > 100) return json({ error: 'Missing action or token' }, 400);

  /* ---------------------------------------------------------------- *
   * Owner / architect approval links (tokens live on change_orders)   *
   * ---------------------------------------------------------------- */
  if (action === 'load_approval' || action === 'submit_approval') {
    const { data: byOwner } = await supabase
      .from('change_orders')
      .select(CO_APPROVAL_COLS)
      .eq('owner_approval_token', token)
      .maybeSingle();

    let co: any = byOwner;
    let approvalType: 'owner' | 'architect' = 'owner';

    if (!co) {
      const { data: byArchitect } = await supabase
        .from('change_orders')
        .select(CO_APPROVAL_COLS)
        .eq('architect_approval_token', token)
        .maybeSingle();
      co = byArchitect;
      approvalType = 'architect';
    }

    if (!co) return json({ error: 'This approval link is invalid or has expired.' }, 404);

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', co.project_id)
      .maybeSingle();

    if (action === 'load_approval') {
      const { data: lines } = await supabase
        .from('co_line_items')
        .select('id, item_name, description, unit, qty, location_tag, sort_order')
        .eq('co_id', co.id)
        .order('sort_order');

      return json({
        approval_type: approvalType,
        role_label: roleLabelFor(co.created_by_role, approvalType),
        co,
        line_items: lines ?? [],
        project_name: project?.name ?? null,
      });
    }

    // submit_approval
    const currentStatus = approvalType === 'owner' ? co.owner_approval_status : co.architect_approval_status;
    if (currentStatus !== 'pending') {
      return json({ error: 'This change order has already been responded to.' }, 409);
    }

    const decision = body?.decision;
    const approverName = String(body?.approver_name ?? '').trim();
    const rejectionNote = String(body?.rejection_note ?? '').trim();

    if (!['approved', 'rejected'].includes(decision)) return json({ error: 'Invalid decision' }, 400);
    if (approverName.length < 2 || approverName.length > 120) return json({ error: 'Name required' }, 400);
    if (decision === 'rejected' && rejectionNote.length < 3) {
      return json({ error: 'Rejection reason required' }, 400);
    }

    const prefix = approvalType === 'owner' ? 'owner' : 'architect';
    const patch: Record<string, unknown> = {
      [`${prefix}_approval_status`]: decision,
      [`${prefix}_approver_name`]: approverName,
      [`${prefix}_rejection_note`]: decision === 'rejected' ? rejectionNote.slice(0, 2000) : null,
    };
    if (decision === 'approved') patch[`${prefix}_approved_at`] = new Date().toISOString();

    const { error: updErr } = await supabase
      .from('change_orders')
      .update(patch)
      .eq('id', co.id)
      .eq(`${prefix}_approval_status`, 'pending'); // single-use guard
    if (updErr) return json({ error: updErr.message }, 500);

    const label = roleLabelFor(co.created_by_role, approvalType);

    // When the upstream party is NOT on the platform (TC/FC-created CO sent out for
    // external sign-off), this decision IS the upstream decision — move the CO itself
    // so `apply_co_contract_delta` books the contract change. GC→owner approvals never
    // move the CO: the on-platform GC decision stays authoritative.
    const externalIsUpstream = approvalType === 'owner' && (co.created_by_role ?? 'GC') !== 'GC';
    const movableStatuses = ['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted'];
    if (externalIsUpstream && movableStatuses.includes(co.status)) {
      const statusPatch: Record<string, unknown> = { status: decision };
      if (decision === 'approved') statusPatch.approved_at = new Date().toISOString();
      const { error: statusErr } = await supabase
        .from('change_orders')
        .update(statusPatch)
        .eq('id', co.id)
        .eq('status', co.status);
      if (statusErr) return json({ error: statusErr.message }, 500);
    }

    await logActivity(
      co.id,
      co.project_id,
      co.created_by_user_id,
      decision === 'approved' ? 'external_approved' : 'external_rejected',
      decision === 'approved'
        ? `${label} approved — signed by ${approverName}`
        : `${label} rejected by ${approverName}: ${rejectionNote.slice(0, 300)}`,
      co.tc_submitted_price ?? null,
    );

    return json({ ok: true });
  }

  /* ---------------------------------------------------------------- *
   * External invites (pricing / scope ack / acknowledge)             *
   * ---------------------------------------------------------------- */
  if (action === 'load_invite' || action === 'submit_invite_response') {
    if (!UUID_RE.test(token)) return json({ error: 'This link is invalid or has expired.' }, 404);

    const { data: invite, error: inviteErr } = await supabase
      .from('co_external_invites')
      .select('id, co_id, email, invite_purpose, responded_at, response_data, respondent_name, expires_at, invited_by_user_id')
      .eq('token', token)
      .maybeSingle();

    if (inviteErr || !invite) return json({ error: 'This link is invalid or has expired.' }, 404);
    if (new Date(invite.expires_at) < new Date()) return json({ error: 'This link has expired.' }, 410);

    const { data: co } = await supabase
      .from('change_orders')
      .select('id, project_id, created_by_user_id, co_number, title, status, document_type, location_tag, reason_note, pricing_type')
      .eq('id', invite.co_id)
      .maybeSingle();

    if (!co) return json({ error: 'Change order not found' }, 404);

    if (action === 'load_invite') {
      const { data: lines } = await supabase
        .from('co_line_items')
        .select('id, item_name, description, unit, qty, location_tag, sort_order')
        .eq('co_id', invite.co_id)
        .order('sort_order');

      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', co.project_id)
        .maybeSingle();

      return json({
        invite: {
          id: invite.id,
          co_id: invite.co_id,
          email: invite.email,
          invite_purpose: invite.invite_purpose,
          responded_at: invite.responded_at,
          response_data: invite.response_data,
          respondent_name: invite.respondent_name,
          expires_at: invite.expires_at,
        },
        co,
        line_items: lines ?? [],
        project_name: project?.name ?? null,
      });
    }

    // submit_invite_response
    if (invite.responded_at) return json({ error: 'This invite has already been responded to.' }, 409);

    const respondentName = String(body?.respondent_name ?? '').trim();
    const respondentEmail = String(body?.respondent_email ?? '').trim();
    if (respondentName.length < 2 || respondentName.length > 120) return json({ error: 'Name required' }, 400);
    if (!respondentEmail || respondentEmail.length > 200) return json({ error: 'Email required' }, 400);

    const responseData: Record<string, unknown> = {
      respondent_email: respondentEmail,
      notes: String(body?.notes ?? '').trim().slice(0, 4000),
    };

    let totalPrice: number | null = null;

    if (invite.invite_purpose === 'pricing') {
      const raw = Array.isArray(body?.line_item_pricing) ? body.line_item_pricing : [];
      const pricing = raw.slice(0, 500).map((row: any) => ({
        line_item_id: typeof row?.line_item_id === 'string' ? row.line_item_id : null,
        price: Number.isFinite(Number(row?.price)) ? Number(row.price) : null,
        note: String(row?.note ?? '').trim().slice(0, 1000),
      }));
      totalPrice = pricing.reduce((sum, r) => sum + (r.price ?? 0), 0);
      responseData.line_item_pricing = pricing;
      responseData.total_price = totalPrice;
    }

    if (invite.invite_purpose === 'scope_ack') {
      responseData.scope_acknowledged = body?.scope_acknowledged === true;
    }

    const { error: updErr } = await supabase
      .from('co_external_invites')
      .update({
        responded_at: new Date().toISOString(),
        respondent_name: respondentName,
        response_data: responseData,
      })
      .eq('id', invite.id)
      .is('responded_at', null); // single-use guard
    if (updErr) return json({ error: updErr.message }, 500);

    const purposeLabel =
      invite.invite_purpose === 'pricing' ? 'submitted pricing'
      : invite.invite_purpose === 'scope_ack' ? 'confirmed scope'
      : 'acknowledged receipt';

    await logActivity(
      co.id,
      co.project_id,
      invite.invited_by_user_id ?? co.created_by_user_id,
      'external_response_received',
      `${respondentName} (${invite.email}) ${purposeLabel}`,
      totalPrice,
    );

    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
