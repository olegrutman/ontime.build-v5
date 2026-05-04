
-- Create co_external_invites table
CREATE TABLE public.co_external_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invite_purpose text NOT NULL DEFAULT 'pricing' CHECK (invite_purpose IN ('pricing', 'scope_ack', 'acknowledge')),
  invited_by_user_id uuid REFERENCES auth.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  response_data jsonb,
  respondent_name text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.co_external_invites ENABLE ROW LEVEL SECURITY;

-- Project participants can view invites for COs on their projects
CREATE POLICY "Project participants can view co_external_invites"
  ON public.co_external_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.change_orders co
      WHERE co.id = co_id
      AND public.is_project_participant(co.project_id, auth.uid())
    )
  );

-- Project participants can create invites
CREATE POLICY "Project participants can create co_external_invites"
  ON public.co_external_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_orders co
      WHERE co.id = co_id
      AND public.is_project_participant(co.project_id, auth.uid())
    )
  );

-- Public token-based read access for external responders (no auth required)
CREATE POLICY "Anyone can read invite by token"
  ON public.co_external_invites FOR SELECT
  USING (true);

-- Public token-based update for external responses
CREATE POLICY "Anyone can respond to invite by token"
  ON public.co_external_invites FOR UPDATE
  USING (true);

-- Index on token for fast lookups
CREATE INDEX idx_co_external_invites_token ON public.co_external_invites(token);
CREATE INDEX idx_co_external_invites_co_id ON public.co_external_invites(co_id);
