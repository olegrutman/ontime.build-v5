-- Enable realtime for key project tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;