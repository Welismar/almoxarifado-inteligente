create or replace function public.issue_material_request(
  p_request_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid
)
returns public.material_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_request public.material_requests;
  v_item record;
  v_movement public.stock_movements;
  v_remaining numeric;
begin
  v_company_id := public.current_company_id();

  if v_company_id is null then
    raise exception 'Usuário não possui empresa vinculada';
  end if;

  if not exists (
    select 1 from public.warehouses w
    join public.projects p on p.id = w.project_id
    where w.id = p_warehouse_id and p.company_id = v_company_id
  ) then
    raise exception 'Almoxarifado não pertence à empresa do usuário';
  end if;

  if not exists (
    select 1 from public.locations
    where id = p_location_id and warehouse_id = p_warehouse_id
  ) then
    raise exception 'Local não pertence ao almoxarifado';
  end if;

  select * into v_request from public.material_requests
  where id = p_request_id and company_id = v_company_id and status = 'approved'
  for update;

  if v_request.id is null then
    raise exception 'Requisição não encontrada ou não está aprovada';
  end if;

  for v_item in
    select * from public.material_request_items
    where request_id = p_request_id and approved_quantity > issued_quantity
    for update
  loop
    v_remaining := v_item.approved_quantity - v_item.issued_quantity;

    select * into v_movement from public.record_stock_movement(
      v_request.project_id, p_warehouse_id, v_item.material_id, p_location_id,
      'issue', v_remaining, 0, null, null, 'material_request', p_request_id, null
    );

    update public.material_request_items
    set issued_quantity = approved_quantity
    where id = v_item.id;
  end loop;

  if not exists (select 1 from public.material_request_items where request_id = p_request_id and issued_quantity < approved_quantity) then
    update public.material_requests set status = 'completed', updated_at = now()
    where id = p_request_id returning * into v_request;
  end if;

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'material_request', p_request_id, 'issued', jsonb_build_object('warehouse_id', p_warehouse_id, 'location_id', p_location_id));

  return v_request;
end;
$$;

grant execute on function public.issue_material_request(uuid, uuid, uuid) to authenticated;
