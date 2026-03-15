
-- Create field_captures table
CREATE TABLE public.field_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  photo_url TEXT,
  video_url TEXT,
  voice_note_url TEXT,
  description TEXT,
  reason_category TEXT CHECK (reason_category IN ('owner_request','blueprint_change','field_conflict','damage_by_others','scope_gap','safety_issue','other')),
  location JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured','converted','archived')),
  converted_work_order_id UUID REFERENCES public.change_order_projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.field_captures ENABLE ROW LEVEL SECURITY;

-- RLS: project participants can SELECT
CREATE POLICY "Project participants can view captures"
ON public.field_captures FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    WHERE pt.project_id = field_captures.project_id
    AND pt.org_id IN (
      SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
    )
  )
);

-- RLS: authenticated users can INSERT own captures
CREATE POLICY "Users can create own captures"
ON public.field_captures FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS: creator can UPDATE own captures
CREATE POLICY "Users can update own captures"
ON public.field_captures FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Storage bucket for field capture media
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-captures', 'field-captures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload field captures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'field-captures');

-- Storage policy: public read
CREATE POLICY "Public can read field captures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'field-captures');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_captures;
