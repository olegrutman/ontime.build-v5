-- Run against an isolated PostgreSQL instance; never against the app database.
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000099'::uuid $$;
CREATE TABLE public.change_orders (id uuid PRIMARY KEY, status text, approved_amount numeric, rejection_note text);
CREATE TABLE public.co_line_items (id uuid PRIMARY KEY, co_id uuid, approval_status text DEFAULT 'pending', approval_rejection_reason text, approval_decided_by uuid, approval_decided_at timestamptz);
CREATE FUNCTION public.co_proposed_total(uuid) RETURNS numeric LANGUAGE sql AS $$ SELECT 750.00::numeric $$;
\ir ../../drizzle/migrations/0072_fix_single_item_approval_uuid_aggregate.sql
CREATE TRIGGER sync_single_item_co_approval BEFORE UPDATE OF status ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.sync_single_item_co_approval();
INSERT INTO public.change_orders VALUES ('00000000-0000-0000-0000-000000000001','submitted',NULL,NULL), ('00000000-0000-0000-0000-000000000002','submitted',NULL,'Wrong scope');
INSERT INTO public.co_line_items (id,co_id) VALUES ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002');
UPDATE public.change_orders SET status='approved' WHERE id='00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.change_orders c JOIN public.co_line_items i ON i.co_id=c.id WHERE c.status='approved' AND c.approved_amount=750.00 AND i.approval_status='approved' AND i.approval_decided_by=auth.uid() AND i.approval_decided_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Approval did not synchronize the single item and approved amount';
  END IF;
END $$;
UPDATE public.change_orders SET status='rejected' WHERE id='00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.change_orders c JOIN public.co_line_items i ON i.co_id=c.id WHERE c.status='rejected' AND c.approved_amount=0 AND i.approval_status='rejected' AND i.approval_rejection_reason='Wrong scope') THEN
    RAISE EXCEPTION 'Rejection did not synchronize the single item and reason';
  END IF;
END $$;