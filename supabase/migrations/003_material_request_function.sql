create policy "company members can insert requests" on public.material_requests
  for insert with check (company_id = public.current_company_id() and requester_id = auth.uid());

create policy "company members can update requests" on public.material_requests
  for update using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "company members can insert request items" on public.material_request_items
  for insert with check (exists (
    select 1 from public.material_requests
    where material_requests.id = material_request_items.request_id
      and material_requests.company_id = public.current_company_id()
      and material_requests.requester_id = auth.uid()
  ));

create or replace function public.create_material_request(
  p_project_id uuid,
  p_material_id uuid,
  p_requested_quantity numeric,
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
begin
  v_company_id := public.current_company_id();

  if v_company_id is null then
    raise exception 'Usuário não possui empresa vinculada';
  end if;

  if p_requested_quantity is null or p_requested_quantity <= 0 then
    raise exception 'A quantidade solicitada deve ser maior que zero';
  end if;

  if p_priority not in ('urgent', 'normal', 'scheduled') then
    raise exception 'Prioridade inválida';
  end if;

  if not exists (select 1 from public.projects where id = p_project_id and company_id = v_company_id) then
    raise exception 'Obra não pertence à empresa do usuário';
  end if;

  if not exists (select 1 from public.materials where id = p_material_id and company_id = v_company_id and status = 'active') then
    raise exception 'Material inexistente ou bloqueado';
  end if;

  insert into public.material_requests (
    company_id, project_id, requester_id, status, priority, needed_at,
    front, service, cost_center, notes
  ) values (
    v_company_id, p_project_id, auth.uid(), 'pending', p_priority, p_needed_at,
    p_front, p_service, p_cost_center, p_notes
  ) returning * into v_request;

  insert into public.material_request_items (request_id, material_id, requested_quantity)
  values (v_request.id, p_material_id, p_requested_quantity);

  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (
    v_company_id, auth.uid(), 'material_request', v_request.id, 'created',
    jsonb_build_object('project_id', p_project_id, 'material_id', p_material_id, 'quantity', p_requested_quantity)
  );

  return v_request;
end;
$$;

grant execute on function public.create_material_request(uuid, uuid, numeric, text, timestamptz, text, text, text, text) to authenticated;
