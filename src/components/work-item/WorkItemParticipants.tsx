import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Plus, X, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  organization_id: string;
  invited_at: string;
  accepted_at: string | null;
  organization?: {
    id: string;
    name: string;
    org_code: string;
    type: string;
  };
}

interface WorkItemParticipantsProps {
  workItemId: string;
  isEditable: boolean;
}

export function WorkItemParticipants({ workItemId, isEditable }: WorkItemParticipantsProps) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgCode, setOrgCode] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchParticipants();
  }, [workItemId]);

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_item_participants')
      .select(`
        *,
        organization:organizations(id, name, org_code, type)
      `)
      .eq('work_item_id', workItemId);

    if (error) {
      console.error('Error fetching participants:', error);
    } else {
      setParticipants(data || []);
    }
    setLoading(false);
  };

  const inviteByOrgCode = async () => {
    if (!orgCode.trim() || !user) return;
    
    setInviting(true);
    
    // Find org by code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('org_code', orgCode.toUpperCase())
      .maybeSingle();

    if (orgError || !org) {
      toast.error('Organization not found');
      setInviting(false);
      return;
    }

    // Check if already invited
    const existing = participants.find(p => p.organization_id === org.id);
    if (existing) {
      toast.error('Organization already invited');
      setInviting(false);
      return;
    }

    const { error } = await supabase
      .from('work_item_participants')
      .insert({
        work_item_id: workItemId,
        organization_id: org.id,
        invited_by: user.id,
      });

    if (error) {
      toast.error('Failed to invite organization');
    } else {
      toast.success('Organization invited');
      setOrgCode('');
      fetchParticipants();
    }
    
    setInviting(false);
  };

  const removeParticipant = async (id: string) => {
    const { error } = await supabase
      .from('work_item_participants')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to remove participant');
    } else {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Building className="w-4 h-4" />
        Participants
      </h3>

      {/* Invite by org code */}
      {isEditable && (
        <div className="flex gap-2">
          <Input
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
            placeholder="Enter org code"
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={inviteByOrgCode}
            disabled={inviting || !orgCode.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Participants list */}
      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No participants yet
        </p>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <div 
              key={p.id} 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                  <Building className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{p.organization?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.organization?.org_code} • {p.organization?.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.accepted_at ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Accepted
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                )}
                {isEditable && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeParticipant(p.id)}
                    className="h-6 w-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
