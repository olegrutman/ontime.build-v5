import { useState } from 'react';
import { ChevronDown, Download, Loader2, User, Shield, Users, Settings, LogOut, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationSheet } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface MobileProjectHeaderProps {
  projectName: string;
  projectId: string;
  projectStatus: string;
  onStatusChange?: (status: string) => void;
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

export function MobileProjectHeader({
  projectName,
  projectId,
  projectStatus,
  onStatusChange,
}: MobileProjectHeaderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, currentRole, signOut } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

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
    <header className="sticky top-0 z-40 border-b bg-card backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 px-3 h-12">
        {/* Project name */}
        <h1 className="flex-1 text-sm font-semibold truncate min-w-0">
          {projectName}
        </h1>

        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5 shrink-0">
              <Badge className={`${STATUS_COLORS[projectStatus]} text-[10px] px-1.5 py-0 pointer-events-none`}>
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
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleDownloadSummary} disabled={downloading}>
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </Button>

        {/* Notifications */}
        <NotificationSheet />

        {/* Profile avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 p-0 rounded-full shrink-0">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {currentRole === 'GC_PM' && (
              <DropdownMenuItem onClick={() => navigate('/approvals/estimates')}>
                <Shield className="mr-2 h-4 w-4" />
                Estimate Approvals
              </DropdownMenuItem>
            )}
            {(currentRole === 'GC_PM' || currentRole === 'TC_PM') && (
              <DropdownMenuItem onClick={() => navigate('/admin/suppliers')}>
                <Package className="mr-2 h-4 w-4" />
                Manage Suppliers
              </DropdownMenuItem>
            )}
            {(currentRole === 'GC_PM' || currentRole === 'TC_PM' || currentRole === 'FC_PM') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/org/team')}>
                  <Users className="mr-2 h-4 w-4" />
                  My Team
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
