import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useRFIs } from '@/hooks/useRFIs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeamOrg { org_id: string; org_name: string }

export default function CreateRFIPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const { createRFI } = useRFIs(projectId);
  const currentOrgId = userOrgRoles?.[0]?.organization?.id;

  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [toOrgId, setToOrgId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [teamOrgs, setTeamOrgs] = useState<TeamOrg[]>([]);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('project_participants')
      .select('organization_id, organization:organizations!project_participants_organization_id_fkey(name)')
      .eq('project_id', projectId)
      .eq('invite_status', 'ACCEPTED')
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((d: any) => ({ org_id: d.organization_id, org_name: d.organization?.name ?? 'Unknown' }));
          const unique = Array.from(new Map(mapped.map((d: TeamOrg) => [d.org_id, d])).values())
            .filter(o => o.org_id !== currentOrgId);
          setTeamOrgs(unique);
        }
      });
  }, [projectId, currentOrgId]);

  const handleSubmit = async () => {
    if (!title.trim() || !question.trim() || !toOrgId || !user || !currentOrgId || !projectId) return;
    setSubmitting(true);
    try {
      await createRFI.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        question: question.trim(),
        urgency,
        submitted_by_user_id: user.id,
        submitted_by_org_id: currentOrgId,
        submitted_to_org_id: toOrgId,
        due_date: dueDate || null,
      });
      toast.success('RFI created');
      navigate(`/project/${projectId}/rfis`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/project/${projectId}/rfis`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-heading text-lg font-bold">New RFI</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief subject of the question" />
        </div>

        <div className="space-y-2">
          <Label>Question</Label>
          <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Describe what information you need…" rows={5} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Submit To</Label>
            <Select value={toOrgId} onValueChange={setToOrgId}>
              <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
              <SelectContent>
                {teamOrgs.map(o => (
                  <SelectItem key={o.org_id} value={o.org_id}>{o.org_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Due Date (optional)</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !question.trim() || !toOrgId}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Send className="h-3.5 w-3.5 mr-1.5" /> Submit RFI
          </Button>
        </div>
      </div>
    </div>
  );
}
