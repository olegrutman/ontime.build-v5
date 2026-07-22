
CREATE TABLE public.invoice_external_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  email text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by_user_id uuid REFERENCES auth.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  decision text CHECK (decision IN ('approved','rejected')),
  decision_note text,
  approver_name text,
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.invoice_external_invites TO authenticated;
GRANT SELECT, UPDATE ON public.invoice_external_invites TO anon;
GRANT ALL ON public.invoice_external_invites TO service_role;

ALTER TABLE public.invoice_external_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view invoice_external_invites"
  ON public.invoice_external_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_id
      AND public.is_project_participant(inv.project_id, auth.uid())
    )
  );

CREATE POLICY "Project participants can create invoice_external_invites"
  ON public.invoice_external_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_id
      AND public.is_project_participant(inv.project_id, auth.uid())
    )
  );

CREATE POLICY "Anyone can read invoice invite by token"
  ON public.invoice_external_invites FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can respond to invoice invite by token"
  ON public.invoice_external_invites FOR UPDATE
  TO anon
  USING (true);

CREATE INDEX idx_invoice_external_invites_token ON public.invoice_external_invites(token);
CREATE INDEX idx_invoice_external_invites_invoice_id ON public.invoice_external_invites(invoice_id);
