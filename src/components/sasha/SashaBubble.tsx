import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import sashaAvatar from '@/assets/sasha-avatar.png';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { useSashaContext } from '@/hooks/useSashaContext';
import { SashaMessage, type SashaChatMessage } from './SashaMessage';
import { toast } from 'sonner';

const SASHA_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sasha-guide`;

const INITIAL_GREETING: SashaChatMessage = {
  role: 'assistant',
  content:
    "Hi, I'm Sasha.\nI'll guide you through Ontime.Build step by step.\nYou can explore safely — nothing you do here can break anything.",
  actions: [
    'Explore a demo project',
    'Explain work orders',
    'Explain purchase orders',
    'Explain invoices',
  ],
};

export function SashaBubble() {
  const { user } = useAuth();
  const location = useLocation();
  const context = useSashaContext();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SashaChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stop pulse after first open
  useEffect(() => {
    if (open) setPulse(false);
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: SashaChatMessage = { role: 'user', content: text.trim() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput('');
      setIsLoading(true);

      const apiMessages = updatedMessages.map(({ role, content }) => ({ role, content }));

      let assistantText = '';

      try {
        const resp = await fetch(SASHA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: apiMessages, context }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          if (resp.status === 429) toast.error('Sasha is busy — please try again in a moment.');
          else if (resp.status === 402) toast.error('AI credits exhausted. Please add funds.');
          else toast.error(err.error || 'Something went wrong.');
          setIsLoading(false);
          return;
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const upsert = (text: string, actions?: string[]) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && prev.length === updatedMessages.length + 1) {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: text, actions } : m
              );
            }
            return [...prev, { role: 'assistant', content: text, actions }];
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantText += delta;
                upsert(assistantText);
              }
            } catch {
              // partial chunk
            }
          }
        }

        // Try to parse structured JSON response
        try {
          const parsed = JSON.parse(assistantText);
          if (parsed.text) {
            upsert(parsed.text, parsed.actions || []);
          }
        } catch {
          // Not JSON — keep raw text
        }
      } catch (e) {
        console.error('Sasha error:', e);
        toast.error('Could not reach Sasha. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, context]
  );

  const handleClose = () => {
    setOpen(false);
    setMessages([INITIAL_GREETING]);
    setInput('');
  };

  // Hide on non-auth pages
  const hiddenPaths = ['/', '/auth'];
  if (!user || hiddenPaths.includes(location.pathname)) return null;

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed z-50 shadow-xl rounded-2xl border bg-background flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200 bottom-20 right-2 left-2 sm:left-auto sm:right-4 sm:w-[min(400px,calc(100vw-2rem))] max-h-[60vh] sm:max-h-[min(500px,70vh)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <img src={sashaAvatar} alt="Sasha" className="h-8 w-8 rounded-full object-cover" />
              <div>
                <p className="text-sm font-semibold">Sasha</p>
                <p className="text-[11px] text-muted-foreground">Your Ontime.Build guide</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <SashaMessage
                  key={i}
                  message={msg}
                  isLast={i === messages.length - 1}
                  onActionSelect={sendMessage}
                  isLoading={isLoading}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground">
                    Sasha is thinking…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form
            className="flex items-center gap-2 px-3 py-2.5 border-t"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sasha anything…"
              className="flex-1 h-9 text-sm"
              type="text"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform overflow-hidden ${
          pulse ? 'animate-pulse' : ''
        }`}
        aria-label="Open Sasha guide"
      >
        {open ? (
          <div className="h-full w-full bg-primary flex items-center justify-center">
            <X className="h-6 w-6 text-primary-foreground" />
          </div>
        ) : (
          <img src={sashaAvatar} alt="Sasha" className="h-full w-full object-cover" />
        )}
      </button>
    </>
  );
}
