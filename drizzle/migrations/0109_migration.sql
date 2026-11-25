create or replace function public.block_billed_labor_entry_delete()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_num text;
begin
  select coalesce(i.invoice_number, 'an invoice') into v_num
  from invoice_line_items l join invoices i on i.id = l.invoice_id
  where OLD.id = any(l.source_entry_ids) and coalesce(i.status,'') <> 'REJECTED'
  limit 1;
  if found then
    raise exception 'This entry is billed on invoice % — remove it from that invoice first.', v_num;
  end if;
  return OLD;
end $$;
drop trigger if exists block_billed_labor_entry_delete on public.co_labor_entries;
create trigger block_billed_labor_entry_delete before delete on public.co_labor_entries
for each row execute function public.block_billed_labor_entry_delete();