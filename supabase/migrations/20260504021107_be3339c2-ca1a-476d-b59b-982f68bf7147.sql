
-- Payment applications table (G702-style)
CREATE TABLE public.payment_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  application_number INT NOT NULL DEFAULT 1,
  period_from DATE,
  period_to DATE,
  generated_by_user_id UUID REFERENCES auth.users(id),
  co_ids UUID[] NOT NULL DEFAULT '{}',
  original_contract_sum NUMERIC NOT NULL DEFAULT 0,
  net_change_orders NUMERIC NOT NULL DEFAULT 0,
  current_contract_sum NUMERIC NOT NULL DEFAULT 0,
  total_completed NUMERIC NOT NULL DEFAULT 0,
  retainage_held NUMERIC NOT NULL DEFAULT 0,
  total_earned_less_retainage NUMERIC NOT NULL DEFAULT 0,
  less_previous_applications NUMERIC NOT NULL DEFAULT 0,
  current_payment_due NUMERIC NOT NULL DEFAULT 0,
  balance_to_finish NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, application_number)
);

ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view payment apps"
  ON public.payment_applications FOR SELECT
  TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Participants can create payment apps"
  ON public.payment_applications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Participants can update payment apps"
  ON public.payment_applications FOR UPDATE
  TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

-- Auto-increment application_number per project
CREATE OR REPLACE FUNCTION public.set_payment_app_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(application_number), 0) + 1
  INTO NEW.application_number
  FROM public.payment_applications
  WHERE project_id = NEW.project_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_payment_app_number
  BEFORE INSERT ON public.payment_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_payment_app_number();
