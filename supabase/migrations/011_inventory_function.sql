create table public.inventories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  project_id uuid not null references public.projects(id),
  warehouse_id uuid not null references public.warehouses(id),
  type text not null default 'partial' check (type in ('general', 'partial', 'cyclic', 'abc')),
  status text not null default 'counting' check (status in ('draft', 'counting', 'review', 'approved', 'closed')),
  responsible_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventories(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  location_id uuid not null references public.locations(id),
  system_quantity numeric(14, 3) not null default 0,
  physical_quantity numeric(14, 3) not null check (physical_quantity >= 0),
  difference numeric(14, 3) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index inventories_warehouse_created_idx on public.inventories(warehouse_id, created_at desc);
create index inventory_items_inventory_idx on public.inventory_items(inventory_id);
create trigger inventories_updated_at before update on public.inventories for each row execute function public.set_updated_at();
alter table public.inventories enable row level security;
alter table public.inventory_items enable row level security;
create policy "company members can read inventories" on public.inventories for select using (company_id = public.current_company_id());
create policy "company members can read inventory items" on public.inventory_items for select using (exists (select 1 from public.inventories where inventories.id = inventory_items.inventory_id and inventories.company_id = public.current_company_id()));

create or replace function public.record_inventory_count(
  p_project_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid,
  p_material_id uuid,
  p_physical_quantity numeric,
  p_type text default 'partial',
  p_notes text default null
)
returns public.inventory_items
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_system_quantity numeric := 0;
  v_inventory public.inventories;
  v_item public.inventory_items;
begin
  if v_company_id is null then raise exception 'Usuário não possui empresa vinculada'; end if;
  if p_physical_quantity is null or p_physical_quantity < 0 then raise exception 'Quantidade física inválida'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and company_id = v_company_id) then raise exception 'Obra inválida'; end if;
  if not exists (select 1 from public.warehouses w join public.projects p on p.id = w.project_id where w.id = p_warehouse_id and p.company_id = v_company_id) then raise exception 'Almoxarifado inválido'; end if;
  if not exists (select 1 from public.locations where id = p_location_id and warehouse_id = p_warehouse_id) then raise exception 'Local inválido'; end if;
  if not exists (select 1 from public.materials where id = p_material_id and company_id = v_company_id) then raise exception 'Material inválido'; end if;
  select coalesce(quantity, 0) into v_system_quantity from public.stock_balances where material_id = p_material_id and warehouse_id = p_warehouse_id and location_id = p_location_id;

  insert into public.inventories (company_id, project_id, warehouse_id, type, responsible_id)
  values (v_company_id, p_project_id, p_warehouse_id, p_type, auth.uid()) returning * into v_inventory;
  insert into public.inventory_items (inventory_id, material_id, location_id, system_quantity, physical_quantity, difference, notes)
  values (v_inventory.id, p_material_id, p_location_id, v_system_quantity, p_physical_quantity, p_physical_quantity - v_system_quantity, p_notes) returning * into v_item;
  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'inventory_item', v_item.id, 'counted', jsonb_build_object('system_quantity', v_system_quantity, 'physical_quantity', p_physical_quantity));
  return v_item;
end;
$$;

grant execute on function public.record_inventory_count(uuid, uuid, uuid, uuid, numeric, text, text) to authenticated;
