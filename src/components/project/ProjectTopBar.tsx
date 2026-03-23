import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Download, Loader2 } from 'lucide-react';
import { NotificationSheet } from '@/components/notifications/NotificationSheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


interface ProjectTopBarProps {
  projectName: string;
  projectId: string;
  projectStatus: string;
  onStatusChange?: (status: string) => void;
  isSupplier?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'on_hold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'archived': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  'draft': 'Draft',
  'active': 'Active',
  'on_hold': 'On Hold',
  'completed': 'Completed',
  'archived': 'Archived',
};

export function ProjectTopBar({
  projectName,
  projectId,
  projectStatus,
  onStatusChange,
  isSupplier = false,
}: ProjectTopBarProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);


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
    <header className="sticky top-0 z-40 border-b bg-card backdrop-blur">
      {/* Top row: sidebar trigger, project name, status, notifications */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 h-14">
        <SidebarTrigger className="-ml-1 hidden lg:flex" />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Project name - centered on mobile, left-aligned on desktop */}
        <div className="flex-1 flex items-center justify-center sm:justify-start min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">
            {projectName}
          </h1>
        </div>

        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
              <Badge className={`${STATUS_COLORS[projectStatus]} pointer-events-none`}>
                {STATUS_LABELS[projectStatus] || projectStatus}
              </Badge>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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

        {/* Download Summary */}
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleDownloadSummary} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
      </div>
    </header>
  );
}
