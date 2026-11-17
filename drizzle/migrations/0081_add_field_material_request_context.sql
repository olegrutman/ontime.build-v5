ALTER TABLE public.field_report_items
  ADD COLUMN material_context jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.field_report_items
  ADD CONSTRAINT field_report_items_material_context_object
  CHECK (jsonb_typeof(material_context) = 'object');

COMMENT ON COLUMN public.field_report_items.material_context IS 'Optional explicit material hints from crew AI/manual notes: application exterior|interior, positive integer window_count, normalized dimension. Never prices or inferred specifications.';