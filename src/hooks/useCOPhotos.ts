import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface COPhoto {
  id: string;
  co_id: string;
  co_line_item_id: string | null;
  uploaded_by_user_id: string;
  uploaded_by_role: string;
  storage_path: string;
  caption: string | null;
  photo_type: 'before' | 'after' | 'during' | 'damage' | 'other';
  taken_at: string;
  created_at: string;
}

export function useCOPhotos(coId: string) {
  const qc = useQueryClient();
  const key = ['co-photos', coId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_photos')
        .select('*')
        .eq('co_id', coId)
        .order('taken_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as COPhoto[];
    },
    enabled: !!coId,
  });

  const uploadPhoto = useMutation({
    mutationFn: async (input: {
      coId: string;
      file: File;
      userId: string;
      role: string;
      photoType: COPhoto['photo_type'];
      caption?: string;
      lineItemId?: string;
    }) => {
      const photoId = crypto.randomUUID();
      const ext = input.file.name?.split('.').pop() || 'jpg';
      const path = `${input.coId}/${photoId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('co-photos')
        .upload(path, input.file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;

      const { data, error } = await supabase
        .from('co_photos')
        .insert({
          co_id: input.coId,
          co_line_item_id: input.lineItemId || null,
          uploaded_by_user_id: input.userId,
          uploaded_by_role: input.role,
          storage_path: path,
          caption: input.caption || null,
          photo_type: input.photoType,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as COPhoto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photo: COPhoto) => {
      await supabase.storage.from('co-photos').remove([photo.storage_path]);
      const { error } = await supabase.from('co_photos').delete().eq('id', photo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    photos: query.data ?? [],
    isLoading: query.isLoading,
    uploadPhoto,
    deletePhoto,
  };
}

export function getPhotoUrl(storagePath: string) {
  const { data } = supabase.storage.from('co-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}
