create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  project_id uuid not null references public.projects(id),
  requester_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('draft', 'pending', 'quoted', 'approved', 'ordered', 'received', 'cancelled')),
  priority text not null default 'normal' check (priority in ('urgent', 'normal', 'scheduled')),
  needed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  requested_quantity numeric(14, 3) not null check (requested_quantity > 0),
  estimated_unit_cost numeric(14, 2) not null default 0 check (estimated_unit_cost >= 0)
);

create index purchase_requests_project_status_idx on public.purchase_requests(project_id, status);
create index purchase_request_items_request_idx on public.purchase_request_items(request_id);

create trigger purchase_requests_updated_at before update on public.purchase_requests for each row execute function public.set_updated_at();

alter table public.purchase_requests enable row level security;
alter table public.purchase_request_items enable row level security;

create policy "company members can read purchase requests" on public.purchase_requests for select using (company_id = public.current_company_id());
create policy "company members can read purchase request items" on public.purchase_request_items for select using (exists (select 1 from public.purchase_requests where purchase_requests.id = purchase_request_items.request_id and purchase_requests.company_id = public.current_company_id()));

create or replace function public.create_purchase_request(
  p_project_id uuid,
  p_material_id uuid,
  p_requested_quantity numeric,
  p_priority text default 'normal',
  p_needed_at timestamptz default null,
  p_estimated_unit_cost numeric default 0,
  p_notes text default null
)
returns public.purchase_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_request public.purchase_requests;
begin
  v_company_id := public.current_company_id();
  if v_company_id is null then raise exception 'Usuário não possui empresa vinculada'; end if;
  if p_requested_quantity is null or p_requested_quantity <= 0 then raise exception 'Quantidade inválida'; end if;
  if p_priority not in ('urgent', 'normal', 'scheduled') then raise exception 'Prioridade inválida'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and company_id = v_company_id) then raise exception 'Obra inválida'; end if;
  if not exists (select 1 from public.materials where id = p_material_id and company_id = v_company_id and status = 'active') then raise exception 'Material inválido ou bloqueado'; end if;

  insert into public.purchase_requests (company_id, project_id, requester_id, status, priority, needed_at, notes)
  values (v_company_id, p_project_id, auth.uid(), 'pending', p_priority, p_needed_at, p_notes)
  returning * into v_request;

  insert into public.purchase_request_items (request_id, material_id, requested_quantity, estimated_unit_cost)
  values (v_request.id, p_material_id, p_requested_quantity, greatest(0, coalesce(p_estimated_unit_cost, 0)));

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'purchase_request', v_request.id, 'created', jsonb_build_object('material_id', p_material_id, 'quantity', p_requested_quantity));
  return v_request;
end;
$$;

grant execute on function public.create_purchase_request(uuid, uuid, numeric, text, timestamptz, numeric, text) to authenticated;
