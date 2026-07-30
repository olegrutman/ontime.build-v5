-- Per-user project visibility. Purely about scope, not permissions.
create table public.project_members (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status          text not null default 'active'
                  check (status in ('active','removed')),
  added_by        uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_user_idx    on public.project_members(user_id) where status = 'active';
create index project_members_project_idx on public.project_members(project_id);

grant select, insert, update, delete on public.project_members to authenticated;
grant all on public.project_members to service_role;

-- Scope flag. 'org' = current behavior. Default preserves it exactly.
alter table public.user_org_roles
  add column project_scope text not null default 'org'
  check (project_scope in ('org','assigned'));

-- Per-org default so new members are stamped correctly at invite time.
alter table public.organizations
  add column default_project_scope text not null default 'org'
  check (default_project_scope in ('org','assigned'));

-- Audit
create table public.access_audit_log (
  id          bigserial primary key,
  actor_id    uuid references auth.users(id),
  action      text not null,
  target_type text not null,
  target_id   uuid,
  project_id  uuid,
  organization_id uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index access_audit_org_idx     on public.access_audit_log(organization_id, created_at desc);
create index access_audit_project_idx on public.access_audit_log(project_id, created_at desc);

grant select, insert on public.access_audit_log to authenticated;
grant all on public.access_audit_log to service_role;
grant usage, select on sequence public.access_audit_log_id_seq to authenticated;
grant all on sequence public.access_audit_log_id_seq to service_role;

-- Every project a user can currently reach, by the EXISTING org-level rules.
create or replace function public.projects_visible_via_org(p_user uuid)
returns setof uuid language sql security definer stable
set search_path = public as $$
  select p.id from projects p
  join user_org_roles r on r.user_id = p_user
  where r.organization_id = p.organization_id
  union
  select pp.project_id from project_participants pp
  join user_org_roles r on r.user_id = p_user
    and r.organization_id = pp.organization_id;
$$;

-- The Phase 2 predicate. Defined now, NOT yet used by any policy on existing tables.
create or replace function public.can_see_project(p_project_id uuid)
returns boolean language plpgsql security definer stable
set search_path = public as $$
declare v_ok boolean;
begin
  if auth.uid() is null or p_project_id is null then return false; end if;

  select exists (
    select 1 from projects p
    join user_org_roles r on r.user_id = auth.uid()
    where p.id = p_project_id
      and (r.organization_id = p.organization_id
           or exists (select 1 from project_participants pp
                      where pp.project_id = p.id
                        and pp.organization_id = r.organization_id))
      and (r.is_admin or r.project_scope = 'org')
  ) into v_ok;

  if v_ok then return true; end if;

  select exists (
    select 1 from project_members m
    where m.project_id = p_project_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ) into v_ok;

  return coalesce(v_ok, false);
end;
$$;

grant execute on function public.can_see_project(uuid)          to authenticated;
grant execute on function public.projects_visible_via_org(uuid) to authenticated;

alter table public.project_members  enable row level security;
alter table public.access_audit_log enable row level security;

create policy pm_select on public.project_members for select to authenticated
  using (user_id = auth.uid() or public.can_see_project(project_id));

create policy pm_write on public.project_members for all to authenticated
  using (public.can_see_project(project_id)) with check (public.can_see_project(project_id));

create policy audit_select on public.access_audit_log for select to authenticated
  using (public.user_in_org(auth.uid(), organization_id));

create policy audit_insert on public.access_audit_log for insert to authenticated
  with check (actor_id = auth.uid());