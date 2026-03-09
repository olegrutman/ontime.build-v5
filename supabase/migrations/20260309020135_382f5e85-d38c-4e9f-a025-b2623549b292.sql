
-- Daily Logs main table
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather_data JSONB DEFAULT '{}',
  manpower_total INT DEFAULT 0,
  delay_hours NUMERIC(5,1) DEFAULT 0,
  safety_incidents JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, log_date)
);

CREATE TABLE public.daily_log_manpower (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id),
  trade TEXT NOT NULL DEFAULT '',
  headcount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_log_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  cause TEXT NOT NULL,
  hours_lost NUMERIC(4,1) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_log_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  tag TEXT DEFAULT 'progress',
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_log_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  po_id UUID REFERENCES public.purchase_orders(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'not_received', 'partial')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_delays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_deliveries ENABLE ROW LEVEL SECURITY;

-- daily_logs policies
CREATE POLICY "Users can view daily logs for their projects"
  ON public.daily_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_team pt
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE pt.project_id = daily_logs.project_id AND uor.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert daily logs for their projects"
  ON public.daily_logs FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.project_team pt
      JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
      WHERE pt.project_id = daily_logs.project_id AND uor.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own daily logs"
  ON public.daily_logs FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Child table policies
CREATE POLICY "Access manpower via log" ON public.daily_log_manpower FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.created_by = auth.uid()));

CREATE POLICY "Access delays via log" ON public.daily_log_delays FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.created_by = auth.uid()));

CREATE POLICY "Access photos via log" ON public.daily_log_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.created_by = auth.uid()));

CREATE POLICY "Access deliveries via log" ON public.daily_log_deliveries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.daily_logs dl WHERE dl.id = log_id AND dl.created_by = auth.uid()));

-- Read policies for child tables
CREATE POLICY "Project members can view manpower" ON public.daily_log_manpower FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_logs dl
    JOIN public.project_team pt ON pt.project_id = dl.project_id
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE dl.id = log_id AND uor.user_id = auth.uid()
  ));

CREATE POLICY "Project members can view delays" ON public.daily_log_delays FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_logs dl
    JOIN public.project_team pt ON pt.project_id = dl.project_id
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE dl.id = log_id AND uor.user_id = auth.uid()
  ));

CREATE POLICY "Project members can view photos" ON public.daily_log_photos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_logs dl
    JOIN public.project_team pt ON pt.project_id = dl.project_id
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE dl.id = log_id AND uor.user_id = auth.uid()
  ));

CREATE POLICY "Project members can view deliveries" ON public.daily_log_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_logs dl
    JOIN public.project_team pt ON pt.project_id = dl.project_id
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE dl.id = log_id AND uor.user_id = auth.uid()
  ));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('daily-log-photos', 'daily-log-photos', true);

CREATE POLICY "Authenticated users can upload daily log photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'daily-log-photos');

CREATE POLICY "Anyone can view daily log photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'daily-log-photos');

CREATE POLICY "Users can delete own daily log photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'daily-log-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
