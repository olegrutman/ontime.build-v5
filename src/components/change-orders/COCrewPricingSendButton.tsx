import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function COCrewPricingSendButton({ recipientName, sending = false, onSend }: {
  recipientName: string;
  sending?: boolean;
  onSend: () => void;
}) {
  return (
    <Button type="button" className="h-auto min-h-10 w-full gap-2 whitespace-normal py-2 text-xs leading-snug" disabled={sending} onClick={onSend}>
      {sending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Send className="h-4 w-4 shrink-0" />}
      Send pricing to {recipientName}
    </Button>
  );
}