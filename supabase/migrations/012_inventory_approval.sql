create or replace function public.approve_inventory_difference(
  p_inventory_item_id uuid,
  p_note text default null
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_status text;
  v_project_id uuid;
  v_warehouse_id uuid;
  v_item public.inventory_items;
  v_adjustment_type public.movement_type;
  v_adjustment_quantity numeric;
begin
  v_company_id := public.current_company_id();

  if v_company_id is null then
    raise exception 'Usuário não possui empresa vinculada';
  end if;

  select ii.*
  into v_item
  from public.inventory_items ii
  join public.inventories inv on inv.id = ii.inventory_id
  where ii.id = p_inventory_item_id and inv.company_id = v_company_id;

  if v_item.id is null then
    raise exception 'Item de inventário não encontrado';
  end if;

  select inv.project_id, inv.warehouse_id, inv.status
  into v_project_id, v_warehouse_id, v_status
  from public.inventories inv
  where inv.id = v_item.inventory_id and inv.company_id = v_company_id;

  if v_status = 'approved' then
    raise exception 'Esta divergência já foi aprovada';
  end if;

  if v_item.difference = 0 then
    raise exception 'Não há divergência para aprovar';
  end if;

  if v_item.difference > 0 then
    v_adjustment_type := 'receipt';
    v_adjustment_quantity := v_item.difference;
  else
    v_adjustment_type := 'loss';
    v_adjustment_quantity := abs(v_item.difference);
  end if;

  perform public.record_stock_movement(
    v_project_id,
    v_warehouse_id,
    v_item.material_id,
    v_item.location_id,
    v_adjustment_type,
    v_adjustment_quantity,
    0,
    null,
    null,
    'inventory',
    v_item.inventory_id,
    coalesce(p_note, 'Ajuste por divergência de inventário')
  );

  update public.inventories
  set status = 'approved', updated_at = now()
  where id = v_item.inventory_id;

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values, reason)
  values (
    v_company_id,
    auth.uid(),
    'inventory_item',
    v_item.id,
    'approved',
    jsonb_build_object(
      'system_quantity', v_item.system_quantity,
      'physical_quantity', v_item.physical_quantity,
      'difference', v_item.difference,
      'adjustment_type', v_adjustment_type,
      'adjustment_quantity', v_adjustment_quantity
    ),
    coalesce(p_note, 'Ajuste por divergência de inventário')
  );

  return v_item;
end;
$$;

grant execute on function public.approve_inventory_difference(uuid, text) to authenticated;
