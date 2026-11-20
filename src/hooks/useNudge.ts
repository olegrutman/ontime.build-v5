import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EntityType = 'invoice' | 'change_order' | 'purchase_order' | 'return';

export function useNudge() {
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const sendNudge = async (entityType: EntityType, entityId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('send_nudge', {
        _entity_type: entityType,
        _entity_id: entityId,
      });

      if (error) {
        if (error.message.includes('cooldown:')) {
          toast.info(error.message.replace('cooldown:', '').trim());
          return false;
        }
        throw error;
      }

      toast.success('Reminder sent');
      setSentIds((prev) => new Set(prev).add(`${entityType}:${entityId}`));
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reminder');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const wasSent = (entityType: EntityType, entityId: string) =>
    sentIds.has(`${entityType}:${entityId}`);

  return { sendNudge, loading, wasSent };
}
