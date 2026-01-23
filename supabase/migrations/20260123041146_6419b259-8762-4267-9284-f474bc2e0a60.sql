-- Drop the problematic policy
DROP POLICY IF EXISTS "Members or participants can view work items" ON public.work_items;

-- Create a security definer function to check participant membership
-- This bypasses RLS on work_item_participants to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_work_item_participant(
  _user_id uuid,
  _work_item_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_item_participants p
    WHERE p.work_item_id = _work_item_id
      AND user_in_org(_user_id, p.organization_id)
  )
$$;

-- Recreate SELECT policy using the security definer function
CREATE POLICY "Members or participants can view work items"
ON public.work_items
FOR SELECT
USING (
  user_in_org(auth.uid(), organization_id)
  OR user_is_work_item_participant(auth.uid(), id)
);