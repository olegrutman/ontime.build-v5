
-- Fix search_path warnings on cleanup trigger functions
ALTER FUNCTION cleanup_invite_notification() SET search_path = public;
ALTER FUNCTION cleanup_invoice_notification() SET search_path = public;
ALTER FUNCTION cleanup_change_order_notification() SET search_path = public;
ALTER FUNCTION cleanup_po_notification() SET search_path = public;
