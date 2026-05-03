import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, ImagePlus, MapPin, Plus, X, Check, Loader2 } from 'lucide-react';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateCONumber } from '@/lib/generateCONumber';
import { toast } from 'sonner';
import { LocationSheet } from './LocationSheet';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';

interface QuickCaptureFlowProps {
  projectId: string;
}

type Screen = 'capture' | 'success';

export function QuickCaptureFlow({ projectId }: QuickCaptureFlowProps) {
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [description, setDescription] = useState('');
  const [detail, setDetail] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [locationTag, setLocationTag] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [screen, setScreen] = useState<Screen>('capture');
  const [createdCoId, setCreatedCoId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState('');

  // Try to get role label context, but handle case where provider is missing
  let rl: any = null;
  try {
    rl = useRoleLabelsContext();
  } catch {
    // Not inside a RoleLabelsProvider (e.g. navigated directly)
  }

  // Resolve participant info
  const orgId = userOrgRoles?.[0]?.organization_id;
  const { data: myParticipant } = useQuery({
    queryKey: ['my-project-participant', projectId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from('project_participants')
        .select('role, organization_id')
        .eq('project_id', projectId)
        .eq('organization_id', orgId)
        .eq('invite_status', 'ACCEPTED')
        .maybeSingle();
      return data;
    },
    enabled: !!projectId && !!orgId,
  });

  const detectedRole = myParticipant?.role === 'GC' ? 'GC' as const
    : myParticipant?.role === 'FC' ? 'FC' as const : 'TC' as const;

  // Resolve upstream org for routing
  const { data: upstreamOrg } = useQuery({
    queryKey: ['upstream-org-for-quick', projectId, orgId, detectedRole],
    queryFn: async () => {
      if (detectedRole === 'FC') {
        const { data } = await supabase
          .from('project_contracts')
          .select('from_org_id, from_org:organizations!project_contracts_from_org_id_fkey(name)')
          .eq('project_id', projectId)
          .eq('to_org_id', orgId!)
          .maybeSingle();
        if (data?.from_org_id) return { id: data.from_org_id, name: (data.from_org as any)?.name || 'TC' };
        // Fallback to TC participant
        const { data: tc } = await supabase
          .from('project_participants')
          .select('organization_id, organization:organizations(name)')
          .eq('project_id', projectId)
          .eq('role', 'TC')
          .eq('invite_status', 'ACCEPTED')
          .maybeSingle();
        return tc ? { id: tc.organization_id, name: (tc.organization as any)?.name || 'TC' } : null;
      }
      if (detectedRole === 'TC') {
        const { data } = await supabase
          .from('project_participants')
          .select('organization_id, organization:organizations(name)')
          .eq('project_id', projectId)
          .eq('role', 'GC')
          .eq('invite_status', 'ACCEPTED')
          .maybeSingle();
        return data ? { id: data.organization_id, name: (data.organization as any)?.name || 'GC' } : null;
      }
      return null;
    },
    enabled: !!projectId && !!orgId && detectedRole !== 'GC',
  });

  // Project info for CO number generation
  const { data: projectInfo } = useQuery({
    queryKey: ['project-basic-info', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('name, contract_mode').eq('id', projectId).single();
      return data;
    },
    enabled: !!projectId,
    staleTime: Infinity,
  });

  const isTM = projectInfo?.contract_mode === 'tm';

  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
    e.target.value = '';
  }, [photos.length]);

  const removePhoto = useCallback((idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const canSubmit = (photos.length > 0 || description.trim().length > 0) && !!locationTag;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user || !orgId || submitting) return;
    setSubmitting(true);

    try {
      const assignedToOrgId = upstreamOrg?.id ?? null;
      const docType = isTM ? 'WO' : 'CO';
      const coNumber = await generateCONumber({
        projectId,
        creatorOrgId: orgId,
        assignedToOrgId,
        isTM: docType === 'WO',
      });

      const title = description.trim().substring(0, 120) || 'Quick capture';

      // Create the CO
      const { data: co, error: coError } = await supabase
        .from('change_orders')
        .insert({
          org_id: orgId,
          project_id: projectId,
          created_by_user_id: user.id,
          created_by_role: detectedRole,
          co_number: coNumber,
          title,
          status: 'draft',
          pricing_type: 'fixed',
          document_type: docType,
          reason: 'other',
          reason_note: 'Quick capture from field',
          location_tag: locationTag,
          assigned_to_org_id: assignedToOrgId,
          fc_input_needed: false,
          materials_needed: false,
          equipment_needed: false,
        })
        .select()
        .single();

      if (coError) throw coError;

      // Create a line item
      const fullDescription = [description.trim(), detail.trim()].filter(Boolean).join('\n\n');
      const { data: lineItem, error: liError } = await supabase
        .from('co_line_items')
        .insert({
          co_id: co.id,
          org_id: orgId,
          created_by_role: detectedRole,
          item_name: title,
          description: fullDescription || null,
          unit: 'EA',
          sort_order: 1,
          location_tag: locationTag,
          reason: 'other',
        })
        .select('id')
        .single();

      if (liError) console.error('Line item error:', liError);

      // Upload photos and insert evidence
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoId = crypto.randomUUID();
        const ext = photo.file.name?.split('.').pop() || 'jpg';
        const path = `${co.id}/${photoId}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('co-photos')
          .upload(path, photo.file, { cacheControl: '3600', upsert: false });

        if (uploadErr) {
          console.error('Photo upload error:', uploadErr);
          continue;
        }

        const { data: urlData } = supabase.storage.from('co-photos').getPublicUrl(path);

        await supabase.from('co_evidence').insert({
          co_id: co.id,
          co_line_item_id: lineItem?.id ?? null,
          file_url: urlData.publicUrl,
          file_type: 'image',
          caption: i === 0 ? title : null,
          uploaded_by_user_id: user.id,
        });
      }

      // Activity log
      await supabase.from('co_activity').insert({
        co_id: co.id,
        project_id: projectId,
        actor_user_id: user.id,
        actor_role: detectedRole,
        action: 'created',
        detail: `Quick capture: ${title}`,
      });

      setCreatedCoId(co.id);
      setSubmitTarget(upstreamOrg?.name || (detectedRole === 'FC' ? (rl?.TC || 'Trade Contractor') : (rl?.GC || 'General Contractor')));
      setScreen('success');
      toast.success('Capture submitted');
    } catch (err: any) {
      console.error('Quick capture error:', err);
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, user, orgId, submitting, upstreamOrg, isTM, projectId, detectedRole, description, detail, locationTag, photos, rl]);

  const resetForm = useCallback(() => {
    photos.forEach(p => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setDescription('');
    setDetail('');
    setShowDetail(false);
    setLocationTag(null);
    setCreatedCoId(null);
    setScreen('capture');
  }, [photos]);

  // ─── Success Screen ───
  if (screen === 'success') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-background">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-xl font-bold font-heading text-foreground">Sent to {submitTarget}</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Your capture has been submitted as a draft. The next party will review and categorize it.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {createdCoId && (
            <button
              onClick={() => navigate(`/project/${projectId}/change-orders/${createdCoId}`)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              View {isTM ? 'Work Order' : 'Change Order'}
            </button>
          )}
          <button
            onClick={resetForm}
            className="w-full py-3 rounded-xl border border-border bg-card text-foreground font-semibold text-sm"
          >
            Capture Another
          </button>
        </div>
      </div>
    );
  }

  // ─── Capture Screen ───
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="text-sm font-bold font-heading text-foreground">Quick Capture</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* ═══ PHOTO BLOCK ═══ */}
        <div className="p-4">
          {photos.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Camera className="h-10 w-10 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">Take photo</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-border">
                <img
                  src={photos[0].preview}
                  alt="Captured"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
              {/* Thumbnail strip */}
              <div className="flex gap-2 items-center">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handlePhotoCapture}
          />
        </div>

        {/* ═══ DESCRIPTION BLOCK ═══ */}
        <div className="px-4 pb-4">
          <div className="relative">
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What happened? e.g. plumber cut 3 joists in master bath"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-muted">
              <Mic className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {!showDetail ? (
            <button
              onClick={() => setShowDetail(true)}
              className="mt-2 text-xs text-primary font-medium"
            >
              + Add detail
            </button>
          ) : (
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="More detail…"
              rows={3}
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          )}
        </div>

        {/* ═══ LOCATION BLOCK ═══ */}
        <div className="px-4 pb-4">
          {locationTag ? (
            <div className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-3">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">📍 {locationTag}</span>
              <button
                onClick={() => setLocationOpen(true)}
                className="text-xs text-primary font-medium"
              >
                change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLocationOpen(true)}
              className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 active:scale-[0.98] transition-transform"
            >
              <MapPin className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground">Where? [tap to pick]</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ STICKY SUBMIT ═══ */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border safe-area-bottom z-20">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-sm transition-all',
            canSubmit && !submitting
              ? 'bg-primary text-primary-foreground active:scale-[0.98] shadow-lg'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </span>
          ) : (
            `Submit to ${upstreamOrg?.name || (detectedRole === 'FC' ? (rl?.TC || 'Trade Contractor') : detectedRole === 'TC' ? (rl?.GC || 'General Contractor') : 'Team')}`
          )}
        </button>
      </div>

      {/* Location Sheet */}
      <LocationSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        projectId={projectId}
        onSelect={(tag) => {
          setLocationTag(tag);
          setLocationOpen(false);
        }}
      />
    </div>
  );
}
