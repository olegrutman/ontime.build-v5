import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SupportActionParams {
  action_type: string;
  reason: string;
  [key: string]: any;
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
