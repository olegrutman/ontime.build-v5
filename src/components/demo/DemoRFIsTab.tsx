import { useState } from 'react';
import { useDemoProjectData } from '@/hooks/useDemoData';
import { useDemo } from '@/contexts/DemoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { type DemoRFI } from '@/data/demoData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  answered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-muted text-muted-foreground',
};

const PRIORITY_ICON = {
  high: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  medium: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  low: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function DemoRFIsTab() {
  const data = useDemoProjectData();
  const { demoRole, demoProjectId, addRFI, updateRFIStatus } = useDemo();
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');

  if (!data) return null;

  const { rfis } = data;
  const canCreate = demoRole === 'GC' || demoRole === 'TC';
  const canAnswer = demoRole === 'GC';

  const handleCreate = () => {
    if (!subject.trim() || !question.trim() || !demoProjectId) return;
    const num = rfis.length + 1;
    const newRFI: DemoRFI = {
      id: `demo-rfi-new-${Date.now()}`,
      project_id: demoProjectId,
      rfi_number: `RFI-${String(num).padStart(3, '0')}`,
      subject: subject.trim(),
      question: question.trim(),
      status: 'open',
      priority: 'medium',
      created_by: demoRole === 'GC' ? 'You (GC)' : 'You (TC)',
      assigned_to: demoRole === 'GC' ? 'Trade Contractor' : 'General Contractor',
      created_at: new Date().toISOString(),
      answered_at: null,
    };
    addRFI(newRFI);
    toast.success(`RFI submitted! 📋 ${newRFI.rfi_number}: "${subject}"`);
    setSubject('');
    setQuestion('');
    setCreateOpen(false);
  };

  const handleAnswer = (rfi: DemoRFI) => {
    updateRFIStatus(rfi.id, 'answered');
    toast.success(`RFI ${rfi.rfi_number} answered! ✅ The submitter will be notified.`);
  };

  const handleClose = (rfi: DemoRFI) => {
    updateRFIStatus(rfi.id, 'closed');
    toast.info(`RFI ${rfi.rfi_number} closed.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">RFIs</h2>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create RFI
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {['open', 'answered', 'closed'].map(status => {
          const count = rfis.filter(r => r.status === status).length;
          if (count === 0) return null;
          return (
            <Badge key={status} variant="outline" className="text-xs">
              {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
            </Badge>
          );
        })}
      </div>

      <div className="grid gap-3">
        {rfis.map(rfi => (
          <Card key={rfi.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {PRIORITY_ICON[rfi.priority]}
                  <CardTitle className="text-sm font-medium">
                    {rfi.rfi_number}: {rfi.subject}
                  </CardTitle>
                </div>
                <Badge className={STATUS_STYLES[rfi.status]}>
                  {rfi.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>{rfi.question}</p>
              <div className="flex items-center gap-4 pt-1">
                <span>From: {rfi.created_by}</span>
                <span>To: {rfi.assigned_to}</span>
                {rfi.answered_at && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Answered
                  </span>
                )}
              </div>
              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                {rfi.status === 'open' && canAnswer && (
                  <Button size="sm" variant="outline" onClick={() => handleAnswer(rfi)}>
                    Mark Answered
                  </Button>
                )}
                {rfi.status === 'answered' && canCreate && (
                  <Button size="sm" variant="outline" onClick={() => handleClose(rfi)}>
                    Close RFI
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create RFI Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New RFI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <Textarea
              placeholder="Question or request for information..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!subject.trim() || !question.trim()}>
              Submit RFI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
