import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, MousePointer2, RotateCcw, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import sashaAvatar from '@/assets/sasha-avatar.png';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { useSashaContext } from '@/hooks/useSashaContext';
import { SashaMessage, SashaThinking, type SashaChatMessage } from './SashaMessage';
import { SashaHighlightOverlay } from './SashaHighlightOverlay';
import { collectPageSnapshot } from '@/lib/sashaPageSnapshot';
import { toast } from 'sonner';

const SASHA_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sasha-guide`;

// Build a short, contextual greeting with exactly 2 route-aware suggestions.
function buildGreeting(pathname: string): SashaChatMessage {
  const base = "Hi, I'm Sasha — ask me anything about this page.";
  const tabMatch = pathname.match(/\/project\/[^/]+\/([^/?]+)/);
  const tab = tabMatch?.[1];

  let actions: string[] = ["What's on this page?", 'Explore a demo project'];

  if (pathname === '/dashboard') {
    actions = ["What's on this page?", 'Explain change orders'];
  } else if (tab === 'change-orders') {
    actions = ['Explain change orders', 'How do I create one?'];
  } else if (tab === 'purchase-orders') {
    actions = ['Explain purchase orders', 'How do I create one?'];
  } else if (tab === 'invoices') {
    actions = ['Explain invoices', 'How do I create one?'];
  } else if (tab === 'sov') {
    actions = ['What is an SOV?', 'How do I bill from it?'];
  } else if (tab === 'financials') {
    actions = ["What's on this page?", 'Explain profit position'];
  } else if (pathname.startsWith('/project/')) {
    actions = ["What's on this page?", 'Explain this project'];
  }

  return { role: 'assistant', content: base, actions };
}

export function SashaBubble() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDemoMode, demoProjectId } = useDemo();
  const context = useSashaContext();

  const [open, setOpen] = useState(false);
  const initialGreeting = useMemo(() => buildGreeting(location.pathname), [location.pathname]);
  const [messages, setMessages] = useState<SashaChatMessage[]>([initialGreeting]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('sasha_intro_seen');
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If the user hasn't sent anything, keep greeting fresh as they navigate.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [buildGreeting(location.pathname)];
      }
      return prev;
    });
  }, [location.pathname]);

  // Dismiss one-time intro on open, and auto-dismiss after 6s.
  useEffect(() => {
    if (open && showIntro) {
      setShowIntro(false);
      localStorage.setItem('sasha_intro_seen', 'true');
    }
  }, [open, showIntro]);

  useEffect(() => {
    if (!showIntro) return;
    const t = setTimeout(() => {
      setShowIntro(false);
      localStorage.setItem('sasha_intro_seen', 'true');
    }, 6000);
    return () => clearTimeout(t);
  }, [showIntro]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleAction = useCallback(
    (action: string) => {
      const lower = action.toLowerCase();
      const pathMatch = location.pathname.match(/^\/project\/([^/?]+)/);
      const currentProjectId = pathMatch?.[1] || (isDemoMode ? demoProjectId : null);

      if (currentProjectId) {
        const projectPath = `/project/${currentProjectId}`;
        const tabs: Array<[RegExp, string]> = [
          [/change order|^go to co/, 'change-orders'],
          [/purchase order|go to po/, 'purchase-orders'],
          [/invoice/, 'invoices'],
          [/sov|schedule of values/, 'sov'],
          [/rfi/, 'rfis'],
          [/daily log/, 'daily-log'],
          [/schedule|gantt|timeline/, 'schedule'],
          [/backcharge/, 'backcharges'],
          [/return/, 'returns'],
          [/team|members/, 'team'],
          [/financial|budget|profit/, 'financials'],
          [/scope/, 'scope'],
          [/setup/, 'setup'],
          [/overview|project home/, 'overview'],
        ];
        for (const [re, tab] of tabs) {
          if (re.test(lower)) { navigate(`${projectPath}/${tab}`); return; }
        }
      }

      const global: Array<[RegExp, string]> = [
        [/dashboard|go home/, '/dashboard'],
        [/partner/, '/partners'],
        [/reminder/, '/reminders'],
        [/estimate/, '/estimates'],
        [/material order|^orders/, '/orders'],
        [/all rfis/, '/rfis'],
        [/all change orders/, '/change-orders'],
        [/financial/, '/financials'],
        [/catalog/, '/catalog'],
        [/new project|create project/, '/create-project'],
      ];
      for (const [re, path] of global) {
        if (re.test(lower)) { navigate(path); return; }
      }

      sendMessage(action);
    },
    [location.pathname, isDemoMode, demoProjectId, navigate]
  );

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
          body: JSON.stringify({ messages: apiMessages, context, pageSnapshot: collectPageSnapshot() }),
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
    setHighlightMode(false);
  };

  const handleResetChat = () => {
    setMessages([buildGreeting(location.pathname)]);
    setInput('');
  };

  const handleHighlightSelect = useCallback((prompt: string) => {
    setHighlightMode(false);
    sendMessage(prompt);
  }, [sendMessage]);

  const hiddenPaths = ['/', '/auth'];
  if (!isDemoMode && (!user || hiddenPaths.includes(location.pathname))) return null;

  return (
    <>
      {open && highlightMode && (
        <SashaHighlightOverlay
          onSelect={handleHighlightSelect}
          onCancel={() => setHighlightMode(false)}
        />
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed z-50 shadow-2xl rounded-2xl border bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 right-2 left-2 sm:left-auto sm:right-4 sm:w-[400px] max-h-[70vh] sm:max-h-[min(560px,75vh)]"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)',
          }}
        >
          {/* Header — avatar + name + kebab + close */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background">
            <div className="flex items-center gap-2.5">
              <img src={sashaAvatar} alt="Sasha" className="h-8 w-8 rounded-full object-cover" />
              <p className="text-sm font-semibold">Sasha</p>
            </div>
            <div className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => setHighlightMode((h) => !h)}
                    className="gap-2"
                  >
                    <MousePointer2 className="h-4 w-4" />
                    {highlightMode ? 'Cancel pointing' : 'Point at something'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleResetChat} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                aria-label="Close Sasha"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-background" ref={scrollRef}>
            <div className="space-y-3 p-4">
              {messages.map((msg, i) => (
                <SashaMessage
                  key={i}
                  message={msg}
                  isLast={i === messages.length - 1}
                  onActionSelect={handleAction}
                  isLoading={isLoading}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <SashaThinking />
              )}
            </div>
          </div>

          {/* Input */}
          <form
            className="flex items-center gap-2 px-3 py-2 border-t bg-background"
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
              className="flex-1 h-10 text-sm rounded-full px-4"
              type="text"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating Bubble — calm resting state */}
      <div
        className="fixed right-4 z-50 flex items-center gap-2"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
      >
        {!open && showIntro && (
          <div className="animate-in fade-in zoom-in-95 duration-300 flex items-center">
            <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap">
              Hi, I'm Sasha
            </div>
            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] border-l-primary shrink-0" />
          </div>
        )}
        <button
          onClick={() => {
            if (showIntro) {
              setShowIntro(false);
              localStorage.setItem('sasha_intro_seen', 'true');
            }
            setOpen((o) => !o);
          }}
          className="relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform overflow-hidden ring-1 ring-primary/20"
          aria-label={open ? 'Close Sasha' : 'Open Sasha guide'}
        >
          {open ? (
            <div className="h-full w-full bg-primary flex items-center justify-center">
              <X className="h-5 w-5 text-primary-foreground" />
            </div>
          ) : (
            <img src={sashaAvatar} alt="Sasha" className="h-full w-full object-cover" />
          )}
        </button>
      </div>
    </>
  );
}
