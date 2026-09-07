alter table public.stock_movements
  add column if not exists service_front text,
  add column if not exists equipment_type text,
  add column if not exists collaborator_name text;

create or replace function public.record_stock_movement(
  p_project_id uuid,
  p_warehouse_id uuid,
  p_material_id uuid,
  p_location_id uuid,
  p_type public.movement_type,
  p_quantity numeric,
  p_unit_cost numeric default 0,
  p_lot text default null,
  p_expiry_date date default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_service_front text default null,
  p_equipment_type text default null,
  p_collaborator_name text default null,
  p_notes text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_current_quantity numeric := 0;
  v_delta numeric;
  v_movement public.stock_movements;
begin
  v_company_id := public.current_company_id();

  if v_company_id is null then
    raise exception 'Usuário não possui empresa vinculada';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero';
  end if;

  if p_type in ('issue', 'loss') then
    v_delta := p_quantity * -1;
  else
    v_delta := p_quantity;
  end if;

  if not exists (select 1 from public.projects where id = p_project_id and company_id = v_company_id) then
    raise exception 'Obra não pertence à empresa do usuário';
  end if;
  if not exists (
    select 1 from public.warehouses w
    join public.projects p on p.id = w.project_id
    where w.id = p_warehouse_id and p.company_id = v_company_id
  ) then
    raise exception 'Almoxarifado não pertence à empresa do usuário';
  end if;
  if not exists (select 1 from public.materials where id = p_material_id and company_id = v_company_id and status = 'active') then
    raise exception 'Material inexistente ou bloqueado';
  end if;

  select quantity into v_current_quantity
  from public.stock_balances
  where material_id = p_material_id and warehouse_id = p_warehouse_id and location_id = p_location_id
  for update;

  v_current_quantity := coalesce(v_current_quantity, 0);
  if v_current_quantity + v_delta < 0 then
    raise exception 'Estoque insuficiente para esta movimentação';
  end if;

  insert into public.stock_balances (material_id, warehouse_id, location_id, quantity, updated_at)
  values (p_material_id, p_warehouse_id, p_location_id, v_current_quantity + v_delta, now())
  on conflict (material_id, warehouse_id, location_id)
  do update set quantity = excluded.quantity, updated_at = now();

  insert into public.stock_movements (
    company_id, project_id, warehouse_id, material_id, location_id, type,
    quantity, unit_cost, lot, expiry_date, reference_type, reference_id,
    responsible_id, service_front, equipment_type, collaborator_name, notes
  ) values (
    v_company_id, p_project_id, p_warehouse_id, p_material_id, p_location_id, p_type,
    p_quantity, coalesce(p_unit_cost, 0), p_lot, p_expiry_date, p_reference_type, p_reference_id,
    auth.uid(), p_service_front, p_equipment_type, p_collaborator_name, p_notes
  ) returning * into v_movement;

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (
    v_company_id, auth.uid(), 'stock_movement', v_movement.id, 'created',
    jsonb_build_object(
      'type', p_type,
      'quantity', p_quantity,
      'material_id', p_material_id,
      'service_front', p_service_front,
      'equipment_type', p_equipment_type,
      'collaborator_name', p_collaborator_name
    )
  );

  return v_movement;
end;
$$;

grant execute on function public.record_stock_movement(uuid, uuid, uuid, uuid, public.movement_type, numeric, numeric, text, date, text, uuid, text, text, text, text) to authenticated;
