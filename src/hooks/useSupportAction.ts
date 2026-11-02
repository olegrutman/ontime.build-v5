import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SupportActionParams {
  action_type: string;
  reason: string;
  [key: string]: any;
}

/** Emails the affected person after a successful staff action. Never blocks the action itself. */
async function notifyAffectedUser(params: SupportActionParams) {
  let body: Record<string, unknown> | null = null;
  switch (params.action_type) {
    case 'RESET_PASSWORD_LINK': body = { kind: 'reset_password', user_id: params.user_id }; break;
    case 'CREATE_USER_AND_ADD': body = { kind: 'welcome', email: params.email }; break;
    case 'CHANGE_USER_EMAIL':
      if (params.old_email) body = { kind: 'email_changed', user_id: params.user_id, old_email: params.old_email };
      break;
    case 'CHANGE_USER_ROLE':
    case 'EDIT_MEMBER_PERMISSIONS':
      body = { kind: 'access_changed', user_org_role_id: params.user_org_role_id };
      break;
  }
  if (!body) return;
  try {
    const { data, error } = await supabase.functions.invoke('platform-account-notify', { body });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    let description = data?.sent === false ? 'The person has unsubscribed or bounced, so no email was delivered.' : 'The person was notified by email.';
    if (data?.action_link) {
      try { await navigator.clipboard.writeText(data.action_link); description = `Reset email sent to ${data.email}. A copy of the link is on your clipboard.`; }
      catch { description = `Reset email sent to ${data.email}.`; }
    }
    toast({ title: 'Email sent', description });
  } catch (e: any) {
    toast({ title: 'Email not sent', description: e?.message || 'The action worked, but the notification email failed.', variant: 'destructive' });
  }
}

export function useSupportAction() {
  const [loading, setLoading] = useState(false);

  const execute = async (params: SupportActionParams): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('platform-support-action', {
        body: params,
      });

      if (error) {
        // Read the server's real reason (e.g. weak password) instead of the generic status text.
        let description = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) description = String(body.error);
          }
        } catch { /* keep generic message */ }
        toast({ title: 'Action failed', description, variant: 'destructive' });
        return false;
      }

      if (data?.error) {
        toast({ title: 'Action failed', description: data.error, variant: 'destructive' });
        return false;
      }

      toast({ title: 'Success', description: data?.message || 'Action completed' });
      await notifyAffectedUser(params);
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading };
}
