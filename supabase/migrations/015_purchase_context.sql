alter table public.purchase_requests
  add column if not exists purchasing_responsible_id uuid references public.profiles(id),
  add column if not exists destination_warehouse_id uuid references public.warehouses(id),
  add column if not exists destination_location_id uuid references public.locations(id);

create index if not exists purchase_requests_responsible_idx
  on public.purchase_requests(purchasing_responsible_id);

drop function if exists public.create_purchase_request(uuid, uuid, numeric, text, timestamptz, numeric, text);

create or replace function public.create_purchase_request(
  p_project_id uuid,
  p_material_id uuid,
  p_requested_quantity numeric,
  p_priority text default 'normal',
  p_needed_at timestamptz default null,
  p_estimated_unit_cost numeric default 0,
  p_notes text default null,
  p_purchasing_responsible_id uuid default null,
  p_destination_warehouse_id uuid default null,
  p_destination_location_id uuid default null
)
returns public.purchase_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_request public.purchase_requests;
  v_destination_project_id uuid;
begin
  v_company_id := public.current_company_id();
  if v_company_id is null then raise exception 'Usuário não possui empresa vinculada'; end if;
  if p_requested_quantity is null or p_requested_quantity <= 0 then raise exception 'Quantidade inválida'; end if;
  if p_priority not in ('urgent', 'normal', 'scheduled') then raise exception 'Prioridade inválida'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and company_id = v_company_id) then raise exception 'Obra inválida'; end if;
  if not exists (select 1 from public.materials where id = p_material_id and company_id = v_company_id and status = 'active') then raise exception 'Material inválido ou bloqueado'; end if;
  if p_purchasing_responsible_id is not null and not exists (select 1 from public.profiles where id = p_purchasing_responsible_id and company_id = v_company_id) then raise exception 'Responsável de compras inválido'; end if;

  if p_destination_warehouse_id is not null then
    select project_id into v_destination_project_id from public.warehouses where id = p_destination_warehouse_id;
    if v_destination_project_id is null or not exists (select 1 from public.projects where id = v_destination_project_id and company_id = v_company_id) then raise exception 'Almoxarifado de destino inválido'; end if;
    if v_destination_project_id <> p_project_id then raise exception 'O destino deve pertencer à obra selecionada'; end if;
  end if;
  if p_destination_location_id is not null and not exists (select 1 from public.locations where id = p_destination_location_id and warehouse_id = p_destination_warehouse_id) then raise exception 'Local de destino inválido'; end if;

  insert into public.purchase_requests (
    company_id, project_id, requester_id, purchasing_responsible_id,
    destination_warehouse_id, destination_location_id, status, priority, needed_at, notes
  ) values (
    v_company_id, p_project_id, auth.uid(), p_purchasing_responsible_id,
    p_destination_warehouse_id, p_destination_location_id, 'pending', p_priority, p_needed_at, p_notes
  ) returning * into v_request;

  insert into public.purchase_request_items (request_id, material_id, requested_quantity, estimated_unit_cost)
  values (v_request.id, p_material_id, p_requested_quantity, greatest(0, coalesce(p_estimated_unit_cost, 0)));

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'purchase_request', v_request.id, 'created', jsonb_build_object(
    'material_id', p_material_id,
    'quantity', p_requested_quantity,
    'purchasing_responsible_id', p_purchasing_responsible_id,
    'destination_warehouse_id', p_destination_warehouse_id,
    'destination_location_id', p_destination_location_id
  ));
  return v_request;
end;
$$;

grant execute on function public.create_purchase_request(uuid, uuid, numeric, text, timestamptz, numeric, text, uuid, uuid, uuid) to authenticated;
