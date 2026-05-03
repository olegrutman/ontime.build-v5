
-- Create co_evidence table
CREATE TABLE public.co_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  co_id UUID NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  co_line_item_id UUID REFERENCES public.co_line_items(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  uploaded_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.co_evidence ENABLE ROW LEVEL SECURITY;

-- Participants can view evidence for their project's COs
CREATE POLICY "Participants can view CO evidence"
ON public.co_evidence FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = co_evidence.co_id
    AND public.is_project_participant(co.project_id, auth.uid())
  )
);

-- Authenticated users can insert evidence for COs they participate in
CREATE POLICY "Participants can insert CO evidence"
ON public.co_evidence FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = co_evidence.co_id
    AND public.is_project_participant(co.project_id, auth.uid())
  )
);

-- Users can delete their own evidence
CREATE POLICY "Users can delete own CO evidence"
ON public.co_evidence FOR DELETE
TO authenticated
USING (uploaded_by_user_id = auth.uid());

-- Create co-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('co-photos', 'co-photos', true);

-- Storage policies
CREATE POLICY "CO photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'co-photos');

CREATE POLICY "Authenticated users can upload CO photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'co-photos');

CREATE POLICY "Users can delete their own CO photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'co-photos');
