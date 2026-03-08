import { useState } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupportLogs } from '@/hooks/useSupportLogs';
import { ACTION_TYPE_LABELS, type SupportActionLog, type SupportActionType } from '@/types/platform';
import { format } from 'date-fns';

const ACTION_TYPES = Object.keys(ACTION_TYPE_LABELS) as SupportActionType[];

export default function PlatformLogs() {
  const [actionType, setActionType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<SupportActionLog | null>(null);

  const { logs, loading } = useSupportLogs({
    actionType: actionType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <PlatformLayout
      title="Support Logs"
      breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'Support Logs' }]}
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={actionType} onValueChange={(v) => setActionType(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All action types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All action types</SelectItem>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{ACTION_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-[140px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
        <Input type="date" className="w-[140px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelected(log)}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), 'MMM d, HH:mm')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{ACTION_TYPE_LABELS[log.action_type] || log.action_type}</Badge></TableCell>
                    <TableCell className="text-sm">{log.created_by_name || log.created_by_email || '—'}</TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">{log.target_org_name || log.target_user_email || log.target_project_name || '—'}</TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">{log.reason}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No logs found</p>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="cursor-pointer active:bg-accent/50" onClick={() => setSelected(log)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0">{ACTION_TYPE_LABELS[log.action_type] || log.action_type}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'MMM d, HH:mm')}</span>
                </div>
                <div className="mt-2 space-y-0.5 text-xs">
                  <p><span className="text-muted-foreground">By:</span> {log.created_by_name || log.created_by_email || '—'}</p>
                  <p className="truncate"><span className="text-muted-foreground">Target:</span> {log.target_org_name || log.target_user_email || log.target_project_name || '—'}</p>
                  <p className="truncate text-muted-foreground">{log.reason}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected && (ACTION_TYPE_LABELS[selected.action_type] || selected.action_type)}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p>{format(new Date(selected.created_at), 'MMM d, yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">By</p>
                  <p>{selected.created_by_name} ({selected.created_by_email})</p>
                </div>
                {selected.target_org_name && <div><p className="text-xs text-muted-foreground">Organization</p><p>{selected.target_org_name}</p></div>}
                {selected.target_project_name && <div><p className="text-xs text-muted-foreground">Project</p><p>{selected.target_project_name}</p></div>}
                {selected.target_user_email && <div><p className="text-xs text-muted-foreground">User</p><p>{selected.target_user_email}</p></div>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="bg-muted/30 rounded p-2 mt-1">{selected.reason}</p>
              </div>
              {selected.action_summary && <div><p className="text-xs text-muted-foreground">Summary</p><p>{selected.action_summary}</p></div>}
              {selected.before_snapshot && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Before Snapshot</p>
                  <pre className="bg-muted/30 rounded p-2 text-xs overflow-x-auto font-mono">{JSON.stringify(selected.before_snapshot, null, 2)}</pre>
                </div>
              )}
              {selected.after_snapshot && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">After Snapshot</p>
                  <pre className="bg-muted/30 rounded p-2 text-xs overflow-x-auto font-mono">{JSON.stringify(selected.after_snapshot, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}
