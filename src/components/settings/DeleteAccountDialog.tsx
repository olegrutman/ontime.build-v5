import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const REMOVED = [
  'Your sign-in and profile (name, email, phone)',
  'Your settings, notification preferences and notification history',
  'Your project and company memberships and permissions',
  'Your field captures, photos and uploaded files',
  'Reminders and invitations you sent or received',
];

const ERROR_COPY: Record<string, string> = {
  sole_admin:
    'You are the only admin of a company that still has other members or projects. Transfer admin ownership on the Team page first, then delete your account.',
  platform_account: 'Internal platform accounts cannot be deleted from the app. Contact support@ontime.build.',
  not_authenticated: 'Your session expired. Sign in again and retry.',
};

export function DeleteAccountDialog() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setConfirmText('');
    setError(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('delete-account', { body: {} });

      const code = (data as { code?: string } | null)?.code;
      if (fnError || !(data as { ok?: boolean } | null)?.ok) {
        setError(
          (code && ERROR_COPY[code]) ||
            'We could not delete your account right now. Please try again or contact support@ontime.build.'
        );
        setDeleting(false);
        return;
      }

      // Data is gone — clear the local session and confirm.
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (_e) {
        // ignore
      }
      setOpen(false);
      navigate('/account-deleted', { replace: true });
    } catch (e: unknown) {
      setError('We could not delete your account right now. Please try again or contact support@ontime.build.');
      setDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (deleting) return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Delete your account permanently?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                This happens immediately and cannot be undone. There is no grace period and no way to restore your
                account afterwards.
              </p>
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium mb-1.5">
                  What gets deleted
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {REMOVED.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Shared business records — invoices, purchase orders, change orders and contracts — must stay intact for
                the other companies on those jobs. Your name and account link are stripped from them so they can no
                longer be traced back to you.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            disabled={deleting}
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText !== 'DELETE' || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete my account'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteAccountDialog;
