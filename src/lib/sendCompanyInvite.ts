import { supabase } from '@/integrations/supabase/client';

export interface CompanyInviteEmailArgs {
  /** Recipient email address. */
  to: string;
  /** Name of the company doing the inviting (shown in the subject and heading). */
  companyName: string;
  /** Optional recipient first/full name. */
  invitedName?: string | null;
  /** Optional project this invitation relates to. */
  projectName?: string | null;
  /** Optional role label, e.g. "Subcontractor". */
  roleLabel?: string | null;
}

/**
 * Sends the branded "[Company] has invited you to Ontime.Build" invitation email.
 * Never throws — invitation records must still be created if the email fails.
 */
export async function sendCompanyInviteEmail(
  args: CompanyInviteEmailArgs,
): Promise<boolean> {
  if (!args.to || !args.companyName) return false;
  try {
    const { error } = await supabase.functions.invoke('send-company-invite', {
      body: {
        to: args.to,
        companyName: args.companyName,
        invitedName: args.invitedName ?? null,
        projectName: args.projectName ?? null,
        roleLabel: args.roleLabel ?? null,
      },
    });
    if (error) {
      console.error('Failed to send invitation email', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to send invitation email', e);
    return false;
  }
}

/** Looks up the display name of an organization, for use as the inviter name. */
export async function fetchOrgName(orgId?: string | null): Promise<string | null> {
  if (!orgId) return null;
  const { data } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle();
  return data?.name ?? null;
}

/** Looks up a project's display name, for invitation email context. */
export async function fetchProjectName(projectId?: string | null): Promise<string | null> {
  if (!projectId) return null;
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .maybeSingle();
  return data?.name ?? null;
}
