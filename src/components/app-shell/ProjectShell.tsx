import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, Plus, Download, Loader2, ChevronDown } from 'lucide-react';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationSheet } from '@/components/notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CommandPalette } from '@/components/app-shell/CommandPalette';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  setup: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  on_hold: 'bg-amber-100 text-amber-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  setup: 'Setup',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

interface ProjectShellProps {
  children: ReactNode;
  projectName: string;
  projectId: string;
  projectStatus: string;
  onStatusChange?: (status: string) => void;
}

export function ProjectShell({
  children,
  projectName,
  projectId,
  projectStatus,
  onStatusChange,
}: ProjectShellProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, currentRole, signOut } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Global ⌘K toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleDownloadSummary = async () => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-summary-download?project_id=${projectId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to generate summary');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${projectName.replace(/\s+/g, '-')}-Summary.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Context Bar */}
      <header className="fixed top-0 inset-x-0 z-50 h-[52px] flex items-center justify-between px-3 sm:px-4 bg-card/80 backdrop-blur-xl border-b border-border">
        {/* Left — Logo + Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <OntimeLogo className="w-7 h-7" />
          <span className="hidden sm:inline font-heading text-[1.1rem] font-extrabold tracking-[-0.3px] text-foreground leading-none shrink-0">
            Ontime<span className="text-primary">.build</span>
          </span>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm ml-2 min-w-0">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <button
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Home
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <span className="text-foreground font-medium truncate">{projectName}</span>
          </nav>
        </div>

        {/* Right — Status, Download, Search, Notifications, Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Status badge dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-1.5">
                <Badge className={`${STATUS_COLORS[projectStatus] || STATUS_COLORS.draft} pointer-events-none text-[10px] px-1.5`}>
                  {STATUS_LABELS[projectStatus] || projectStatus}
                </Badge>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onStatusChange?.(option.value)}
                  className={projectStatus === option.value ? 'bg-muted' : ''}
                >
                  <Badge className={`${STATUS_COLORS[option.value]} mr-2`}>
                    {option.label}
                  </Badge>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Download */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden sm:flex" onClick={handleDownloadSummary} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>

          {/* Search */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground text-xs transition-colors"
          >
            <Search className="w-3 h-3" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden md:inline ml-1 px-1 py-0.5 rounded bg-muted/40 text-[10px] font-mono">⌘K</kbd>
          </button>

          <NotificationSheet />

          {/* Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content below bar */}
      <div className="flex flex-1 pt-[52px]">
        {children}
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
