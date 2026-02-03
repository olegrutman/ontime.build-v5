-- Add material_responsibility column to project_contracts
-- This tracks who is responsible for materials on this contract (GC or TC)
ALTER TABLE public.project_contracts 
ADD COLUMN IF NOT EXISTS material_responsibility text;