-- Drop the overly permissive policy
DROP POLICY IF EXISTS "PMs can create organizations" ON public.organizations;

-- Create a proper policy for organization creation
-- First user creating an org gets added as the first member
-- This will be handled via an edge function that validates and creates properly
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
    -- Allow creation, but the edge function will handle adding the creator as a member
    -- This is acceptable because creating an org without adding yourself doesn't grant access
    auth.uid() IS NOT NULL
);