import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, MousePointer2, RotateCcw, MoreHorizontal, Mic, MicOff, GraduationCap, ArrowRight, HelpCircle, CheckCircle2, Circle } from 'lucide-react';
import { SashaAvatarStage } from './SashaAvatarStage';
import { useSashaVoice } from '@/hooks/useSashaVoice';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
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
import { useSashaGuide } from '@/hooks/useSashaGuide';
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

  let actions: string[] = ['Guide me', "What's on this page?"];

  if (pathname === '/dashboard') {
    actions = ['Guide me', 'Explain change orders'];
  } else if (tab === 'change-orders') {
    actions = ['Guide me', 'How do I create one?'];
  } else if (tab === 'purchase-orders') {
    actions = ['Guide me', 'How do I create one?'];
  } else if (tab === 'invoices') {
    actions = ['Guide me', 'How do I create one?'];
  } else if (tab === 'sov') {
    actions = ['Guide me', 'How do I bill from it?'];
  } else if (tab === 'financials') {
    actions = ['Guide me', 'Explain profit position'];
  } else if (pathname.startsWith('/project/')) {
    actions = ['Guide me', 'Explain this project'];
  }

  return { role: 'assistant', content: base, actions };
}

function sashaPageLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  const tab = pathname.match(/\/project\/[^/]+\/([^/?]+)/)?.[1];
  if (tab) return tab.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  if (pathname.startsWith('/project/')) return 'Project overview';
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'App';
  return seg.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export function SashaBubble() {
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDemoMode, demoProjectId } = useDemo();
  const context = useSashaContext();
  const { activeGuide, availableGuides, startGuide, isGuideCompleted } = useSashaGuide();

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

  const showGuideLibrary = useCallback(() => {
    const guideList = availableGuides
      .map((guide) => `${isGuideCompleted(guide.id) ? '✓ ' : ''}${guide.title} — ${guide.description}`)
      .join('\n');
    setMessages((previous) => [
      ...previous,
      {
        role: 'assistant',
        content: availableGuides.length
          ? `Choose a live walkthrough. I’ll highlight each real control and move on when you use it.\n${guideList}`
          : 'Your walkthroughs will appear here after your company setup is complete.',
        actions: availableGuides.map((guide) => `Guide: ${guide.title}`),
      },
    ]);
    setOpen(true);
  }, [availableGuides, isGuideCompleted]);

  const handleAction = useCallback(
    (action: string) => {
      const lower = action.toLowerCase();
      if (action === 'Guide me') {
        showGuideLibrary();
        return;
      }
      if (action.startsWith('Guide: ')) {
        const title = action.slice('Guide: '.length);
        const guide = availableGuides.find((candidate) => candidate.title === title);
        if (guide) {
          setOpen(false);
          setVoiceMode(false);
          startGuide(guide.id);
        }
        return;
      }
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
          if (re.test(lower)) {
            navigate(`${projectPath}/${tab}`);
            if (window.innerWidth < 640) handleClose();
            return;
          }
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
        if (re.test(lower)) {
          navigate(path);
          if (window.innerWidth < 640) handleClose();
          return;
        }
      }

      sendMessage(action);
    },
    [location.pathname, isDemoMode, demoProjectId, navigate, showGuideLibrary, availableGuides, startGuide]
  );

  const sendMessage = useCallback(
    async (text: string): Promise<string> => {
      if (!text.trim() || isLoading) return '';

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
          return '';
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

        let spoken = assistantText;
        try {
          const parsed = JSON.parse(assistantText);
          if (parsed.text) {
            upsert(parsed.text, parsed.actions || []);
            spoken = parsed.text;
          }
        } catch {
          // Not JSON — keep raw text
        }
        return spoken;
      } catch (e) {
        console.error('Sasha error:', e);
        toast.error('Could not reach Sasha. Please try again.');
        return '';
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, context]
  );

  // ---- Voice conversation mode -------------------------------------------
  const { speak, stop: stopSpeaking, isSpeaking, isPreparing } = useSashaVoice();
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: micSupported,
  } = useSpeechRecognition({ silenceTimeout: 2500 });
  const [voiceMode, setVoiceMode] = useState(false);
  const heardRef = useRef('');

  useEffect(() => {
    if (transcript) heardRef.current = transcript;
  }, [transcript]);

  // When the user stops talking, send what was heard and speak the answer.
  useEffect(() => {
    if (!voiceMode || isListening) return;
    const heard = heardRef.current.trim();
    heardRef.current = '';
    if (!heard) return;
    (async () => {
      const reply = await sendMessage(heard);
      if (reply) await speak(reply);
    })();
  }, [isListening, voiceMode, sendMessage, speak]);

  // Hand the mic back to the user once Sasha is done.
  useEffect(() => {
    if (!voiceMode || !open) return;
    if (isListening || isLoading || isSpeaking || isPreparing) return;
    const t = setTimeout(() => startListening(), 400);
    return () => clearTimeout(t);
  }, [voiceMode, open, isListening, isLoading, isSpeaking, isPreparing, startListening]);

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode((on) => {
      if (on) {
        stopListening();
        stopSpeaking();
        heardRef.current = '';
      }
      return !on;
    });
  }, [stopListening, stopSpeaking]);

  useEffect(() => {
    if (!activeGuide) return;
    setOpen(false);
    setVoiceMode(false);
    stopListening();
    stopSpeaking();
  }, [activeGuide, stopListening, stopSpeaking]);

  const handleClose = () => {
    setOpen(false);
    setHighlightMode(false);
    setVoiceMode(false);
    stopListening();
    stopSpeaking();
  };

  const handleResetChat = () => {
    setMessages([buildGreeting(location.pathname)]);
    setInput('');
  };

  const handleHighlightSelect = useCallback((prompt: string) => {
    setHighlightMode(false);
    sendMessage(prompt);
  }, [sendMessage]);

  const showWelcome = !voiceMode && messages.length === 1 && messages[0]?.role === 'assistant';
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const firstName = (profile?.first_name || profile?.full_name || meta.first_name || meta.full_name || '').split(' ')[0];
  const pageLabel = sashaPageLabel(location.pathname);
  // Setup checklist: the first four tours for this role, shown until all are finished.
  const setupGuides = availableGuides.slice(0, 4);
  const setupDone = setupGuides.filter((g) => isGuideCompleted(g.id)).length;
  const showSetup = setupGuides.length > 0 && setupDone < setupGuides.length;

  const welcomeActions = (initialGreeting.actions ?? []).map((label) => ({
    action: label,
    label: label === 'Guide me' ? 'Guide me through this page' : label,
    hint: label === 'Guide me' ? 'Step-by-step tour · nothing gets saved' : 'Plain-English answer',
    icon: label === 'Guide me' ? GraduationCap : HelpCircle,
  }));
  const hiddenPaths = ['/', '/auth'];
  if (activeGuide) return null;
  if (!isDemoMode && (authLoading || !user || hiddenPaths.includes(location.pathname))) return null;

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
          className="fixed inset-0 bottom-0 z-[60] h-[100dvh] bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 sm:inset-auto sm:left-auto sm:right-4 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] sm:w-[400px] sm:max-h-[min(560px,75vh)] sm:rounded-2xl sm:border sm:shadow-2xl"
        >
          {/* Header — avatar + name + kebab + close */}
          <div className="bg-sidebar text-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={sashaAvatar} alt="Sasha" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-primary/50" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Sasha</p>
                <p className="text-[0.7rem] text-white/60 truncate">Knows this page · {pageLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 gap-1.5 px-2.5 sm:h-8 whitespace-nowrap text-white hover:bg-white/10 hover:text-white ${showWelcome ? 'hidden' : ''}`}
                onClick={showGuideLibrary}
                aria-label="Open interactive walkthroughs"
                title="Interactive walkthroughs"
              >
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs">Guide me</span>
              </Button>
              {micSupported && (
                <Button
                  variant={voiceMode ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-9 gap-1.5 px-2.5 sm:h-8 sm:w-8 sm:px-0 ${voiceMode ? '' : 'text-white hover:bg-white/10 hover:text-white'}`}
                  onClick={toggleVoiceMode}
                  aria-label={voiceMode ? 'Turn off voice conversation' : 'Talk to Sasha'}
                  title={voiceMode ? 'Turn off voice conversation' : 'Talk to Sasha'}
                >
                  {voiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span className="text-xs sm:sr-only">{voiceMode ? 'End' : 'Talk'}</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/10 hover:text-white"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={showGuideLibrary} className="gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Interactive walkthroughs
                  </DropdownMenuItem>
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
                className="h-8 w-8 text-white hover:bg-white/10 hover:text-white"
                onClick={handleClose}
                aria-label="Close Sasha"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {showWelcome && (
            <p className="mt-3 pb-3 font-heading text-xl font-bold leading-tight">
              Hi{firstName ? ` ${firstName}` : ''} — what do you need?
            </p>
          )}
          </div>
          {showWelcome && (
            <div className="relative z-10 -mt-4 mx-3 rounded-xl border bg-card p-1.5 shadow-md">
              {welcomeActions.map(({ action, label, hint, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleAction(action)}
                  disabled={isLoading}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
              {showSetup && (
                <div className="mt-1 border-t px-3 pb-1.5 pt-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Get set up</span>
                    <span className="font-mono">{setupDone} of {setupGuides.length}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(setupDone / setupGuides.length) * 100}%` }} />
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {setupGuides.map((g) => {
                      const done = isGuideCompleted(g.id);
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => startGuide(g.id)}
                            className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <span className={`min-w-0 flex-1 break-words ${done ? 'text-muted-foreground line-through' : 'font-medium'}`}>{g.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Voice stage */}
          {voiceMode && (
            <div className="border-b bg-muted/30">
              <SashaAvatarStage
                speaking={isSpeaking}
                listening={isListening}
                thinking={isLoading || isPreparing}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-background" ref={scrollRef}>
            <div className="space-y-4 px-4 py-5 sm:space-y-3 sm:p-4">
              {!showWelcome && messages.map((msg, i) => (
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
            className="flex items-center gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t bg-background sm:px-3 sm:py-2"
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
      {!open && (
        <div
          className="fixed right-4 z-50 flex items-center gap-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
        >
          {showIntro && (
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
              setOpen(true);
            }}
            className="relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform overflow-hidden ring-1 ring-primary/20"
            aria-label="Open Sasha guide"
          >
            <img src={sashaAvatar} alt="Sasha" className="h-full w-full object-cover" />
          </button>
        </div>
      )}
    </>
  );
}
