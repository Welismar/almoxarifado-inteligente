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

  select requested_quantity into v_quantity
  from public.material_request_items
  where request_id = p_request_id
  limit 1;

  v_quantity := coalesce(p_approved_quantity, v_quantity);
  if v_quantity <= 0 or v_quantity > (select requested_quantity from public.material_request_items where request_id = p_request_id limit 1) then
    raise exception 'Quantidade aprovada inválida';
  end if;

  update public.material_request_items
  set approved_quantity = v_quantity
  where request_id = p_request_id;

  update public.material_requests
  set status = 'approved', updated_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'material_request', p_request_id, 'approved', jsonb_build_object('approved_quantity', v_quantity));

  return v_request;
end;
$$;

grant execute on function public.approve_material_request(uuid, numeric) to authenticated;
