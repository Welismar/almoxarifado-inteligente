create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'almoxarife', 'encarregado', 'mestre', 'engenheiro', 'compras', 'qualidade', 'financeiro', 'gerente', 'diretoria', 'manutencao');
create type public.item_status as enum ('active', 'blocked', 'quarantine', 'inactive');
create type public.movement_type as enum ('receipt', 'issue', 'return', 'transfer', 'adjustment', 'loss', 'inventory');
create type public.request_status as enum ('draft', 'pending', 'approved', 'separating', 'completed', 'rejected', 'cancelled');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  full_name text not null,
  role public.user_role not null default 'almoxarife',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  unique (project_id, code)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  name text not null,
  code text not null,
  capacity numeric(14, 3),
  created_at timestamptz not null default now(),
  unique (warehouse_id, code)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  document text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.categories(id),
  main_supplier_id uuid references public.suppliers(id),
  code text not null,
  barcode text,
  name text not null,
  technical_description text,
  unit text not null default 'UN',
  minimum_stock numeric(14, 3) not null default 0 check (minimum_stock >= 0),
  maximum_stock numeric(14, 3) check (maximum_stock is null or maximum_stock >= minimum_stock),
  reorder_point numeric(14, 3) not null default 0 check (reorder_point >= 0),
  average_cost numeric(14, 2) not null default 0 check (average_cost >= 0),
  status public.item_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.stock_balances (
  material_id uuid not null references public.materials(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  location_id uuid references public.locations(id),
  quantity numeric(14, 3) not null default 0 check (quantity >= 0),
  reserved_quantity numeric(14, 3) not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (material_id, warehouse_id, location_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  project_id uuid not null references public.projects(id),
  warehouse_id uuid not null references public.warehouses(id),
  material_id uuid not null references public.materials(id),
  location_id uuid references public.locations(id),
  type public.movement_type not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  lot text,
  expiry_date date,
  reference_type text,
  reference_id uuid,
  responsible_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.material_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  project_id uuid not null references public.projects(id),
  requester_id uuid not null references public.profiles(id),
  status public.request_status not null default 'draft',
  priority text not null default 'normal' check (priority in ('urgent', 'normal', 'scheduled')),
  needed_at timestamptz,
  front text,
  service text,
  cost_center text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.material_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.material_requests(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  requested_quantity numeric(14, 3) not null check (requested_quantity > 0),
  approved_quantity numeric(14, 3) not null default 0 check (approved_quantity >= 0),
  issued_quantity numeric(14, 3) not null default 0 check (issued_quantity >= 0)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index stock_movements_material_created_idx on public.stock_movements(material_id, created_at desc);
create index stock_movements_project_created_idx on public.stock_movements(project_id, created_at desc);
create index materials_company_status_idx on public.materials(company_id, status);
create index material_requests_project_status_idx on public.material_requests(project_id, status);
create index audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
create trigger materials_updated_at before update on public.materials for each row execute function public.set_updated_at();
create trigger material_requests_updated_at before update on public.material_requests for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.warehouses enable row level security;
alter table public.locations enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.materials enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.material_requests enable row level security;
alter table public.material_request_items enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create policy "company members can read company" on public.companies for select using (id = public.current_company_id());
create policy "company members can read profiles" on public.profiles for select using (company_id = public.current_company_id());
create policy "company members can read projects" on public.projects for select using (company_id = public.current_company_id());
create policy "company members can read warehouses" on public.warehouses for select using (exists (select 1 from public.projects where projects.id = warehouses.project_id and projects.company_id = public.current_company_id()));
create policy "company members can read locations" on public.locations for select using (exists (select 1 from public.warehouses join public.projects on projects.id = warehouses.project_id where warehouses.id = locations.warehouse_id and projects.company_id = public.current_company_id()));
create policy "company members can read categories" on public.categories for select using (company_id = public.current_company_id());
create policy "company members can read suppliers" on public.suppliers for select using (company_id = public.current_company_id());
create policy "company members can read materials" on public.materials for select using (company_id = public.current_company_id());
create policy "company members can read balances" on public.stock_balances for select using (exists (select 1 from public.warehouses join public.projects on projects.id = warehouses.project_id where warehouses.id = stock_balances.warehouse_id and projects.company_id = public.current_company_id()));
create policy "company members can read movements" on public.stock_movements for select using (company_id = public.current_company_id());
create policy "company members can read requests" on public.material_requests for select using (company_id = public.current_company_id());
create policy "company members can read request items" on public.material_request_items for select using (exists (select 1 from public.material_requests where material_requests.id = material_request_items.request_id and material_requests.company_id = public.current_company_id()));
create policy "company members can read audit" on public.audit_log for select using (company_id = public.current_company_id());
