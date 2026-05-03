
-- Create co_photos table
CREATE TABLE public.co_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  co_id UUID NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  co_line_item_id UUID REFERENCES public.co_line_items(id) ON DELETE SET NULL,
  uploaded_by_user_id UUID NOT NULL,
  uploaded_by_role TEXT NOT NULL DEFAULT 'TC',
  storage_path TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT NOT NULL DEFAULT 'other' CHECK (photo_type IN ('before', 'after', 'during', 'damage', 'other')),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_co_photos_co_id ON public.co_photos(co_id);

ALTER TABLE public.co_photos ENABLE ROW LEVEL SECURITY;

-- Participants can view photos
CREATE POLICY "Participants can view CO photos"
ON public.co_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = co_photos.co_id
    AND public.is_project_participant(co.project_id, auth.uid())
  )
);

-- Participants can insert photos
CREATE POLICY "Participants can insert CO photos"
ON public.co_photos FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = co_photos.co_id
    AND public.is_project_participant(co.project_id, auth.uid())
  )
);

-- Users can delete their own photos
CREATE POLICY "Users can delete own CO photos"
ON public.co_photos FOR DELETE
TO authenticated
USING (uploaded_by_user_id = auth.uid());
