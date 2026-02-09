import { cn } from '@/lib/utils';
import { SashaQuickActions } from './SashaQuickActions';
import sashaAvatar from '@/assets/sasha-avatar.png';

export interface SashaChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

interface SashaMessageProps {
  message: SashaChatMessage;
  isLast: boolean;
  onActionSelect: (label: string) => void;
  isLoading: boolean;
}

export function SashaMessage({ message, isLast, onActionSelect, isLoading }: SashaMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <img src={sashaAvatar} alt="Sasha" className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5" />
      )}
      <div className={cn('max-w-[80%] space-y-1')}>
        <div
          className={cn(
            'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          )}
        >
          {message.content}
        </div>

        {!isUser && isLast && message.actions && message.actions.length > 0 && (
          <SashaQuickActions
            actions={message.actions}
            onSelect={onActionSelect}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
}
