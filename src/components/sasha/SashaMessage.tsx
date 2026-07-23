import { cn } from '@/lib/utils';
import { SashaQuickActions } from './SashaQuickActions';
import sashaAvatar from '@/assets/sasha-avatar.png';

// Strip lightweight markdown so replies render as clean, skimmable text.
function cleanMarkdown(input: string): string {
  if (!input) return input;
  let s = input;
  // Fenced/inline code — keep content, drop the backticks
  s = s.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  // Bold / italic (**x**, __x__, *x*, _x_)
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2');
  s = s.replace(/(^|[\s(])_([^_\n]+)_/g, '$1$2');
  // Headings (#, ##, ###) at line start
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  // Bullet markers -> •
  s = s.replace(/^\s*[-*+]\s+/gm, '• ');
  // Numbered lists stay as-is but drop trailing periods on markers
  // Markdown links [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // Collapse 3+ blank lines
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}


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
        <img
          src={sashaAvatar}
          alt="Sasha"
          className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-primary/20"
        />
      )}
      <div className={cn('max-w-[85%] space-y-1')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-primary/5 border border-primary/15 text-foreground rounded-bl-sm'
          )}
        >
          {isUser ? message.content : cleanMarkdown(message.content)}

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

export function SashaThinking() {
  return (
    <div className="flex gap-2 justify-start">
      <img
        src={sashaAvatar}
        alt="Sasha"
        className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-primary/20"
      />
      <div className="bg-primary/5 border border-primary/15 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
      </div>
    </div>
  );
}
