import { Card } from '@/components/ui/card';
import { Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChoiceStepProps {
  onChoice: (path: 'new' | 'join') => void;
}

export function ChoiceStep({ onChoice }: ChoiceStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Welcome to Ontime.Build</h2>
        <p className="text-muted-foreground mt-2">How would you like to get started?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => onChoice('new')}
          className={cn(
            "text-left p-6 rounded-lg border-2 border-border hover:border-primary/50 transition-all",
            "hover:shadow-md bg-card cursor-pointer group"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">I'm new to Ontime.Build</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new account and register your company
          </p>
        </button>

        <button
          onClick={() => onChoice('join')}
          className={cn(
            "text-left p-6 rounded-lg border-2 border-border hover:border-primary/50 transition-all",
            "hover:shadow-md bg-card cursor-pointer group"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Joining an existing company</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Search for your company and request to join their team
          </p>
        </button>
      </div>
    </div>
  );
}
