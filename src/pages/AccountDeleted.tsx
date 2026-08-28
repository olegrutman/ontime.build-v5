import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccountDeleted() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
        <h1 className="font-heading text-3xl uppercase tracking-tight">Your account has been deleted</h1>
        <p className="text-sm text-muted-foreground">
          Your sign-in, profile and personal data have been permanently removed from OnTime. Shared job records were
          kept for the other companies involved, with your name and account link stripped out.
        </p>
        <p className="text-xs text-muted-foreground">
          Questions? Email{' '}
          <a className="underline" href="mailto:support@ontime.build">
            support@ontime.build
          </a>
          .
        </p>
        <Button asChild>
          <Link to="/">Back to ontime.build</Link>
        </Button>
      </div>
    </main>
  );
}
