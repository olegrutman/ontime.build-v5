import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Building2, Loader2, UserPlus } from 'lucide-react';

interface Props {
  orgName: string;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function InviteDetectedStep({ orgName, loading, onAccept, onDecline }: Props) {
  return (
    <Card className="p-6 md:p-8 text-center">
      <div className="flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mx-auto mb-4">
        <UserPlus className="w-7 h-7 text-primary" />
      </div>

      <h2 className="text-xl font-semibold mb-2">You've been invited!</h2>
      <p className="text-sm text-muted-foreground mb-6">
        You have a pending invitation to join{' '}
        <span className="font-medium text-foreground">{orgName}</span>.
        Would you like to join their organization?
      </p>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onDecline} disabled={loading}>
          Create my own org
        </Button>
        <Button className="flex-1" onClick={onAccept} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Join {orgName}
        </Button>
      </div>
    </Card>
  );
}
