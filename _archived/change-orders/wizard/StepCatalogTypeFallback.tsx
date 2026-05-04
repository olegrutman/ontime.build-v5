import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { useScopeSuggestions, type SuggestPick, type SuggestResponse } from '@/hooks/useScopeSuggestions';
import { resolveBuildingType } from '@/lib/framingQuestionTrees';
import { useProjectScope } from '@/hooks/useProjectScope';
import { resolveZoneFromLocationTag } from '@/lib/resolveZone';

interface StepCatalogTypeFallbackProps {
  projectId: string;
  locationTag: string;
  reason: string;
  workType: string | null;
  initialDraft?: string;
  onResults: (description: string, response: SuggestResponse) => void;
  onCancel: () => void;
}

export function StepCatalogTypeFallback({
  projectId,
  locationTag,
  reason,
  workType,
  initialDraft = '',
  onResults,
  onCancel,
}: StepCatalogTypeFallbackProps) {
  const { data: scope } = useProjectScope(projectId);
  const [text, setText] = useState(initialDraft);
  const suggest = useScopeSuggestions();

  const buildingType = resolveBuildingType(scope?.home_type ?? null, workType);
  const zone = resolveZoneFromLocationTag(locationTag);

  async function handleMatch() {
    if (text.trim().length < 6) return;
    const res = await suggest.mutateAsync({
      project_id: projectId,
      description: text.trim(),
      location_tag: locationTag,
      zone,
      reason,
      work_type: workType,
      building_type: buildingType,
      framing_method: scope?.framing_method ?? null,
    });
    onResults(text.trim(), res);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm shrink-0">
            ✦
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Describe what's needed
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plain English. Sasha will pick catalog items for you.
            </p>
          </div>
        </div>
        <Textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. The plumber cut through 3 floor joists in the master bath. Need to sister and add new blocking."
          className="min-h-[110px] resize-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleMatch}
            disabled={text.trim().length < 6 || suggest.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {suggest.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            Match catalog items
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </div>
    </div>
  );
}
