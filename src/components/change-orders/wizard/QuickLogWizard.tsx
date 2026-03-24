import { useState, useRef, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Camera, ArrowLeft, Check, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { VisualLocationPicker } from '../VisualLocationPicker';
import type { COReasonCode } from '@/types/changeOrder';

interface QuickLogWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  preSelectedReason?: COReasonCode;
}

type Screen = 'what' | 'where' | 'work';

const REASON_CARDS: { reason: COReasonCode; label: string; description: string; icon: string }[] = [
  { reason: 'addition', label: 'Extra scope', description: 'Work not in original plan', icon: '➕' },
  { reason: 'design_change', label: 'Plan changed', description: 'Drawings revised after work started', icon: '📐' },
  { reason: 'damaged_by_others', label: 'Found damage', description: 'Another trade or party caused it', icon: '⚠️' },
  { reason: 'rework', label: 'Redo work', description: 'Something built wrong', icon: '🔄' },
];

export function QuickLogWizard({ open, onOpenChange, projectId, preSelectedReason }: QuickLogWizardProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>('what');
  const [description, setDescription] = useState('');
  const [selectedReason, setSelectedReason] = useState<COReasonCode | null>(preSelectedReason ?? null);
  const [locationTag, setLocationTag] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const orgId = userOrgRoles?.[0]?.organization_id ?? '';
  const userId = user?.id ?? '';

  // Saved location from localStorage
  const savedLocation = (() => {
    try {
      return localStorage.getItem(`${userId}_${projectId}_last_location`);
    } catch { return null; }
  })();

  // Fetch scope items for this project
  const { data: scopeItems = [] } = useQuery({
    queryKey: ['quick-log-scope', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_scope_selections')
        .select('scope_item_id, scope_items!inner(id, label, section_id, scope_sections!inner(slug, label))')
        .eq('project_id', projectId)
        .eq('is_on', true);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        id: d.scope_items.id,
        label: d.scope_items.label,
        section: d.scope_items.scope_sections?.label ?? '',
      }));
    },
  });

  const filteredItems = searchQuery.trim()
    ? scopeItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : scopeItems.slice(0, 8);

  // Voice recording via Web Speech API
  function toggleRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input not supported on this browser');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function handleLocationConfirm(tag: string) {
    setLocationTag(tag);
    // Save to localStorage
    try {
      localStorage.setItem(`${userId}_${projectId}_last_location`, tag);
    } catch {}
    setScreen('work');
  }

  function toggleItem(id: string) {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!user || !orgId) return;
    setSubmitting(true);

    try {
      // Resolve the GC org for this project to set assigned_to_org_id
      const { data: projectTeam } = await supabase
        .from('project_team')
        .select('user_id, user_org_roles!inner(organization_id, organization:organizations!inner(type))')
        .eq('project_id', projectId)
        .eq('status', 'Accepted');

      const gcMember = (projectTeam ?? []).find(
        (m: any) => m.user_org_roles?.organization?.type === 'GC'
      );
      const tcMember = (projectTeam ?? []).find(
        (m: any) => m.user_org_roles?.organization?.type === 'TC'
      );
      const assignedToOrgId = tcMember?.user_org_roles?.organization_id
        ?? gcMember?.user_org_roles?.organization_id
        ?? null;

      // Create CO
      const { data: co, error: coError } = await supabase
        .from('change_orders')
        .insert({
          project_id: projectId,
          org_id: orgId,
          created_by_user_id: user.id,
          created_by_role: 'FC',
          status: 'draft',
          pricing_type: 'fixed',
          reason: selectedReason,
          reason_note: description.trim() || null,
          location_tag: locationTag || null,
          assigned_to_org_id: assignedToOrgId,
          fc_input_needed: false,
          materials_needed: false,
          materials_on_site: false,
          equipment_needed: false,
          draft_shared_with_next: false,
          use_fc_pricing_base: false,
        })
        .select()
        .single();

      if (coError) throw coError;

      // Insert line items for selected scope items
      const selectedItems = scopeItems.filter(i => selectedItemIds.has(i.id));
      if (selectedItems.length > 0) {
        const lineItems = selectedItems.map((item, idx) => ({
          co_id: co.id,
          org_id: orgId,
          created_by_role: 'FC',
          item_name: item.label,
          unit: 'EA',
          sort_order: idx + 1,
          location_tag: locationTag || null,
          reason: selectedReason,
        }));

        const { error: liError } = await supabase
          .from('co_line_items')
          .insert(lineItems);
        if (liError) throw liError;
      }

      // Log activity
      await supabase.from('co_activity').insert({
        co_id: co.id,
        project_id: projectId,
        actor_user_id: user.id,
        actor_role: 'FC',
        action: 'created',
        detail: description.trim() || null,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });

      toast.success('CO created — submit to TC when ready');
      onOpenChange(false);

      // Navigate to the job ticket
      navigate(`/project/${projectId}/change-orders/${co.id}`);
    } catch (err: any) {
      console.error('Quick log create failed:', err);
      toast.error(err?.message ?? 'Failed to create CO');
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setScreen('what');
    setDescription('');
    setSelectedReason(preSelectedReason ?? null);
    setLocationTag('');
    setSelectedItemIds(new Set());
    setSearchQuery('');
    onOpenChange(false);
  }

  const canProceedFromWhat = !!selectedReason;
  const canCreate = selectedItemIds.size > 0;

  const content = (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            if (screen === 'where') setScreen('what');
            else if (screen === 'work') setScreen('where');
            else resetAndClose();
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {screen === 'what' ? 'Step 1 of 3' : screen === 'where' ? 'Step 2 of 3' : 'Step 3 of 3'}
          </p>
          <h2 className="text-base font-semibold text-foreground">
            {screen === 'what' ? 'What happened?' : screen === 'where' ? 'Where is it?' : 'What work?'}
          </h2>
        </div>
      </div>

      {/* Screen content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {screen === 'what' && (
          <div className="space-y-4 animate-fade-in">
            {/* Voice note */}
            {(typeof (window as any).SpeechRecognition !== 'undefined' ||
              typeof (window as any).webkitSpeechRecognition !== 'undefined') && (
              <button
                type="button"
                onClick={toggleRecording}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all min-h-[56px]',
                  isRecording
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                )}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <span className="text-sm font-medium">
                  {isRecording ? 'Stop recording' : 'Hold to describe (voice)'}
                </span>
              </button>
            )}

            {/* Description */}
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe in a few words"
              rows={3}
              className="resize-none text-sm"
            />

            {/* Reason cards — 2x2 grid */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What kind?</p>
              <div className="grid grid-cols-2 gap-3">
                {REASON_CARDS.map(card => (
                  <button
                    key={card.reason}
                    type="button"
                    onClick={() => setSelectedReason(card.reason)}
                    className={cn(
                      'flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left min-h-[80px]',
                      selectedReason === card.reason
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/40',
                    )}
                  >
                    <span className="text-lg">{card.icon}</span>
                    <span className="text-sm font-semibold text-foreground">{card.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{card.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {screen === 'where' && (
          <div className="animate-fade-in">
            <VisualLocationPicker
              projectId={projectId}
              onConfirm={handleLocationConfirm}
              savedLocation={savedLocation}
            />
          </div>
        )}

        {screen === 'work' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search scope items…"
                className="pl-9 h-11"
              />
            </div>

            {/* Items grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map(item => {
                const selected = selectedItemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      'flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left min-h-[64px]',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/40',
                    )}
                  >
                    <span className="text-sm font-medium text-foreground line-clamp-2">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">{item.section}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-primary mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? 'No items match your search' : 'No scope items configured for this project'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3 space-y-2 bg-background safe-area-bottom">
        {/* Selected items summary */}
        {screen === 'work' && selectedItemIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-sm">
            <span className="font-semibold text-primary">{selectedItemIds.size} items</span>
            <span className="text-muted-foreground truncate">
              {scopeItems.filter(i => selectedItemIds.has(i.id)).map(i => i.label).join(' · ')}
            </span>
          </div>
        )}

        {screen === 'what' && (
          <Button
            className="w-full h-12 text-sm font-semibold rounded-xl"
            disabled={!canProceedFromWhat}
            onClick={() => setScreen('where')}
          >
            Next — where is it?
          </Button>
        )}

        {screen === 'work' && (
          <Button
            className="w-full h-12 text-sm font-semibold rounded-xl gap-2"
            disabled={!canCreate || submitting}
            onClick={handleCreate}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create CO
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95dvh] p-0 rounded-t-2xl">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 h-[85vh] flex flex-col">
        <DialogTitle className="sr-only">Quick Log — New Change Order</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
}
