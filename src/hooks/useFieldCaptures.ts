import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export type ReasonCategory =
  | 'owner_request'
  | 'blueprint_change'
  | 'field_conflict'
  | 'damage_by_others'
  | 'scope_gap'
  | 'safety_issue'
  | 'other';

export interface FieldCapture {
  id: string;
  project_id: string;
  user_id: string;
  organization_id: string;
  timestamp: string;
  gps_lat: number | null;
  gps_lng: number | null;
  photo_url: string | null;
  video_url: string | null;
  voice_note_url: string | null;
  description: string | null;
  reason_category: ReasonCategory | null;
  location: Record<string, string>;
  device_info: Record<string, string>;
  status: 'captured' | 'converted' | 'archived';
  converted_work_order_id: string | null;
  created_at: string;
}

export interface CreateCaptureInput {
  project_id: string;
  organization_id: string;
  description?: string;
  reason_category?: ReasonCategory;
  location?: Record<string, string>;
  gps_lat?: number;
  gps_lng?: number;
  device_info?: Record<string, string>;
  photoFile?: File;
  voiceFile?: Blob;
}

async function uploadMedia(bucket: string, path: string, file: File | Blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function useFieldCaptures(projectId: string, date?: string) {
  const qc = useQueryClient();
  const { user, userOrgRoles } = useAuth();
  const orgId = userOrgRoles[0]?.organization_id;
  const key = ['field-captures', projectId, date || 'all'];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from('field_captures')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false });

      if (date) {
        q = q.gte('timestamp', `${date}T00:00:00`)
             .lt('timestamp', `${date}T23:59:59.999`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as FieldCapture[];
    },
    enabled: !!projectId,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`field-captures-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'field_captures',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['field-captures', projectId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);

  const createCapture = useMutation({
    mutationFn: async (input: CreateCaptureInput) => {
      if (!user) throw new Error('Not authenticated');
      const captureId = crypto.randomUUID();
      let photo_url: string | null = null;
      let voice_note_url: string | null = null;

      // Upload photo
      if (input.photoFile) {
        const ext = input.photoFile.name?.split('.').pop() || 'jpg';
        const path = `${input.project_id}/${captureId}/photo.${ext}`;
        photo_url = await uploadMedia('field-captures', path, input.photoFile);
      }

      // Upload voice note
      if (input.voiceFile) {
        const path = `${input.project_id}/${captureId}/voice.webm`;
        voice_note_url = await uploadMedia('field-captures', path, input.voiceFile);
      }

      const { data, error } = await supabase
        .from('field_captures')
        .insert({
          id: captureId,
          project_id: input.project_id,
          user_id: user.id,
          organization_id: input.organization_id || orgId,
          description: input.description || null,
          reason_category: input.reason_category || null,
          location: input.location || {},
          gps_lat: input.gps_lat || null,
          gps_lng: input.gps_lng || null,
          device_info: input.device_info || {},
          photo_url,
          voice_note_url,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FieldCapture;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-captures', projectId] });
    },
  });

  const updateCapture = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<FieldCapture>) => {
      const { error } = await supabase
        .from('field_captures')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-captures', projectId] });
    },
  });

  return {
    captures: query.data || [],
    loading: query.isLoading,
    createCapture,
    updateCapture,
  };
}
