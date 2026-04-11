import React from 'react';
import { Clock, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PendingApprovalStepProps {
  orgName: string;
  onSignOut: () => void;
  onCancel: () => void;
  cancelLoading?: boolean;
}

export function PendingApprovalStep({ orgName, onSignOut, onCancel, cancelLoading }: PendingApprovalStepProps) {
  return (
    <Card className="p-8 text-center max-w-md mx-auto">
      <div className="flex justify-center mb-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-7 w-7 text-primary" />
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Request Pending</h2>
      <p className="text-muted-foreground mb-6">
        Your request to join <span className="font-medium text-foreground">{orgName}</span> has been submitted.
        You'll be notified when an admin approves your request.
      </p>

      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={onSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onCancel}
          disabled={cancelLoading}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel Request & Start Over
        </Button>
      </div>
    </Card>
  );
}
