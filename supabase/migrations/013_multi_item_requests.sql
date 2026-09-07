alter table public.material_request_items
  add column if not exists unit text not null default 'UN';

update public.material_request_items items
set unit = materials.unit
from public.materials
where materials.id = items.material_id;

create or replace function public.create_material_request_multi(
  p_project_id uuid,
  p_items jsonb,
  p_priority text default 'normal',
  p_needed_at timestamptz default null,
  p_front text default null,
  p_service text default null,
  p_cost_center text default null,
  p_notes text default null
)
returns public.material_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_request public.material_requests;
  v_item jsonb;
  v_material_id uuid;
  v_quantity numeric;
  v_unit text;
  v_material_unit text;
  v_count integer;
begin
  v_company_id := public.current_company_id();

  if v_company_id is null then
    raise exception 'Usuário não possui empresa vinculada';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Itens inválidos';
  end if;

  select count(*) into v_count from jsonb_array_elements(p_items);
  if v_count < 1 or v_count > 20 then
    raise exception 'A requisição deve ter entre 1 e 20 itens';
  end if;
  if p_priority not in ('urgent', 'normal', 'scheduled') then
    raise exception 'Prioridade inválida';
  end if;
  if not exists (select 1 from public.projects where id = p_project_id and company_id = v_company_id) then
    raise exception 'Obra não pertence à empresa do usuário';
  end if;

  insert into public.material_requests (
    company_id, project_id, requester_id, status, priority, needed_at,
    front, service, cost_center, notes
  ) values (
    v_company_id, p_project_id, auth.uid(), 'pending', p_priority, p_needed_at,
    p_front, p_service, p_cost_center, p_notes
  ) returning * into v_request;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_material_id := (v_item->>'materialId')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit := upper(coalesce(nullif(trim(v_item->>'unit'), ''), 'UN'));

    select unit into v_material_unit
    from public.materials
    where id = v_material_id and company_id = v_company_id and status = 'active';

    if v_material_unit is null then
      raise exception 'Material inexistente ou bloqueado';
    end if;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Todas as quantidades devem ser maiores que zero';
    end if;

    insert into public.material_request_items (request_id, material_id, requested_quantity, unit)
    values (v_request.id, v_material_id, v_quantity, v_unit);
  end loop;

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (
    v_company_id, auth.uid(), 'material_request', v_request.id, 'created',
    jsonb_build_object('project_id', p_project_id, 'items', p_items)
  );

  return v_request;
end;
$$;

grant execute on function public.create_material_request_multi(uuid, jsonb, text, timestamptz, text, text, text, text) to authenticated;

create or replace function public.approve_material_request(
  p_request_id uuid,
  p_approved_quantity numeric default null
)
returns public.material_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role public.user_role;
  v_request public.material_requests;
  v_item_count integer;
  v_quantity numeric;
begin
  v_company_id := public.current_company_id();
  select role into v_role from public.profiles where id = auth.uid() and company_id = v_company_id;
  if v_role not in ('admin', 'mestre', 'engenheiro', 'gerente', 'diretoria') then
    raise exception 'Perfil sem permissão para aprovar requisições';
  end if;

  select * into v_request from public.material_requests
  where id = p_request_id and company_id = v_company_id and status = 'pending'
  for update;
  if v_request.id is null then
    raise exception 'Requisição não encontrada ou já processada';
  end if;

  select count(*) into v_item_count from public.material_request_items where request_id = p_request_id;
  if v_item_count = 1 and p_approved_quantity is not null then
    select requested_quantity into v_quantity from public.material_request_items where request_id = p_request_id;
    if p_approved_quantity <= 0 or p_approved_quantity > v_quantity then
      raise exception 'Quantidade aprovada inválida';
    end if;
    update public.material_request_items set approved_quantity = p_approved_quantity where request_id = p_request_id;
  else
    update public.material_request_items set approved_quantity = requested_quantity where request_id = p_request_id;
  end if;

  update public.material_requests set status = 'approved', updated_at = now()
  where id = p_request_id returning * into v_request;

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'material_request', p_request_id, 'approved', jsonb_build_object('items', v_item_count));

  return v_request;
end;
$$;

grant execute on function public.approve_material_request(uuid, numeric) to authenticated;
