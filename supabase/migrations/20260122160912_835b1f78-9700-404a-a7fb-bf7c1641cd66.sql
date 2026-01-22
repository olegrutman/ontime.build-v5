-- Enable realtime for tm_periods and work_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.tm_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_items;