alter table public.purchase_orders alter column status set default 'pending';

create or replace function public.approve_purchase_order(p_order_id uuid)
returns public.purchase_orders
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_role public.user_role;
  v_order public.purchase_orders;
begin
  select role into v_role from public.profiles where id = auth.uid() and company_id = v_company_id;
  if v_role not in ('admin', 'financeiro', 'gerente', 'diretoria') then raise exception 'Perfil sem permissão para aprovar pedido'; end if;
  update public.purchase_orders set status = 'approved', updated_at = now() where id = p_order_id and company_id = v_company_id and status = 'pending' returning * into v_order;
  if v_order.id is null then raise exception 'Pedido não encontrado ou já processado'; end if;
  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action) values (v_company_id, auth.uid(), 'purchase_order', p_order_id, 'approved');
  return v_order;
end;
$$;

grant execute on function public.approve_purchase_order(uuid) to authenticated;

create or replace function public.send_purchase_order(p_order_id uuid)
returns public.purchase_orders
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_role public.user_role;
  v_order public.purchase_orders;
begin
  select role into v_role from public.profiles where id = auth.uid() and company_id = v_company_id;
  if v_role not in ('admin', 'compras', 'gerente') then raise exception 'Perfil sem permissão para enviar pedido'; end if;
  update public.purchase_orders set status = 'sent', updated_at = now() where id = p_order_id and company_id = v_company_id and status = 'approved' returning * into v_order;
  if v_order.id is null then raise exception 'Pedido não aprovado ou inexistente'; end if;
  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action) values (v_company_id, auth.uid(), 'purchase_order', p_order_id, 'sent');
  return v_order;
end;
$$;

grant execute on function public.send_purchase_order(uuid) to authenticated;

create or replace function public.receive_purchase_order(p_order_id uuid, p_warehouse_id uuid, p_location_id uuid)
returns public.purchase_orders
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_order public.purchase_orders;
  v_request public.purchase_requests;
  v_item record;
begin
  select * into v_order from public.purchase_orders where id = p_order_id and company_id = v_company_id and status in ('approved', 'sent', 'partial') for update;
  if v_order.id is null then raise exception 'Pedido não disponível para recebimento'; end if;
  select * into v_request from public.purchase_requests where id = v_order.purchase_request_id;
  for v_item in select material_id, quantity, unit_price from public.purchase_order_items where order_id = p_order_id loop
    perform public.record_stock_movement(v_request.project_id, p_warehouse_id, v_item.material_id, p_location_id, 'receipt', v_item.quantity, v_item.unit_price, null, null, 'purchase_order', p_order_id, null);
  end loop;
  update public.purchase_orders set status = 'received', updated_at = now() where id = p_order_id returning * into v_order;
  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action) values (v_company_id, auth.uid(), 'purchase_order', p_order_id, 'received');
  return v_order;
end;
$$;

grant execute on function public.receive_purchase_order(uuid, uuid, uuid) to authenticated;
