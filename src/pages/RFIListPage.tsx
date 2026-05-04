import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, MessageSquareMore, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { useRFIs, type RFIRow } from '@/hooks/useRFIs';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const STATUS_PILL_MAP: Record<string, { variant: 'healthy' | 'watch' | 'at_risk' | 'info' | 'neutral'; label: string }> = {
  open: { variant: 'watch', label: 'Open' },
  answered: { variant: 'healthy', label: 'Answered' },
  closed: { variant: 'neutral', label: 'Closed' },
  void: { variant: 'at_risk', label: 'Void' },
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  normal: 'bg-blue-500',
  low: 'bg-slate-400',
};

function RFIListCard({ rfi, onClick }: { rfi: RFIRow; onClick: () => void }) {
  const pill = STATUS_PILL_MAP[rfi.status] ?? STATUS_PILL_MAP.open;
  return (
    <div
      className="relative bg-card border border-border rounded-xl cursor-pointer hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', URGENCY_COLORS[rfi.urgency] ?? URGENCY_COLORS.normal)} />
      <div className="pl-4 pr-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{rfi.rfi_number}</span>
              <StatusPill variant={pill.variant}>{pill.label}</StatusPill>
              {rfi.urgency !== 'normal' && (
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                  {rfi.urgency}
                </span>
              )}
            </div>
            <h3 className="font-heading font-semibold text-sm truncate">{rfi.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rfi.question}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>From: {rfi.submitted_by_org?.name ?? '—'}</span>
          <span>To: {rfi.submitted_to_org?.name ?? '—'}</span>
          {rfi.due_date && <span>Due: {format(new Date(rfi.due_date), 'MMM d')}</span>}
        </div>
      </div>
    </div>
  );
}

export default function RFIListPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rfis, isLoading } = useRFIs(projectId);
  const [filter, setFilter] = useState<'ALL' | 'open' | 'answered' | 'closed' | 'void'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = rfis
    .filter(r => filter === 'ALL' || r.status === filter)
    .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.rfi_number.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: rfis.length,
    open: rfis.filter(r => r.status === 'open').length,
    answered: rfis.filter(r => r.status === 'answered').length,
    closed: rfis.filter(r => r.status === 'closed').length,
  };

  if (isLoading) {
    return <div className="space-y-3 p-1">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={filter} onValueChange={v => setFilter(v as any)}>
          <TabsList className="bg-muted/50 p-1 rounded-full">
            <TabsTrigger value="ALL" className="rounded-full text-xs px-3">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="open" className="rounded-full text-xs px-3">Open ({counts.open})</TabsTrigger>
            <TabsTrigger value="answered" className="rounded-full text-xs px-3">Answered ({counts.answered})</TabsTrigger>
            <TabsTrigger value="closed" className="rounded-full text-xs px-3">Closed ({counts.closed})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search RFIs…"
              className="h-8 pl-8 w-44 text-xs"
            />
          </div>
          <Button size="sm" onClick={() => navigate(`/project/${projectId}/rfis/new`)}>
            <Plus className="h-4 w-4 mr-1" /> New RFI
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
          <MessageSquareMore className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-foreground">
            {rfis.length === 0 ? 'No RFIs yet' : 'No RFIs match the filter'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {rfis.length === 0 ? 'Submit an RFI to get answers from your project team' : 'Try changing the filter or search term'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rfi, i) => (
            <div key={rfi.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <RFIListCard rfi={rfi} onClick={() => navigate(`/project/${projectId}/rfis/${rfi.id}`)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
