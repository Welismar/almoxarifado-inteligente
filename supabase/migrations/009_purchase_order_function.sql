create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  purchase_request_id uuid not null references public.purchase_requests(id),
  selected_quote_id uuid not null references public.purchase_quotes(id),
  supplier_id uuid not null references public.suppliers(id),
  order_number text not null,
  status text not null default 'approved' check (status in ('pending', 'approved', 'sent', 'partial', 'received', 'cancelled')),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, order_number)
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0)
);

create index purchase_orders_status_idx on public.purchase_orders(company_id, status, created_at desc);
create trigger purchase_orders_updated_at before update on public.purchase_orders for each row execute function public.set_updated_at();
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
create policy "company members can read purchase orders" on public.purchase_orders for select using (company_id = public.current_company_id());
create policy "company members can read order items" on public.purchase_order_items for select using (exists (select 1 from public.purchase_orders where purchase_orders.id = purchase_order_items.order_id and purchase_orders.company_id = public.current_company_id()));

create or replace function public.select_purchase_quote(p_quote_id uuid)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role public.user_role;
  v_quote public.purchase_quotes;
  v_order public.purchase_orders;
  v_item record;
  v_total numeric := 0;
  v_order_number text;
begin
  v_company_id := public.current_company_id();
  select role into v_role from public.profiles where id = auth.uid() and company_id = v_company_id;
  if v_role not in ('admin', 'compras', 'gerente', 'diretoria') then raise exception 'Perfil sem permissão para selecionar cotação'; end if;

  select * into v_quote from public.purchase_quotes where id = p_quote_id and company_id = v_company_id and status = 'submitted' for update;
  if v_quote.id is null then raise exception 'Cotação não encontrada ou já selecionada'; end if;

  for v_item in select material_id, quantity, unit_price from public.purchase_quote_items where quote_id = p_quote_id loop
    v_total := v_total + (v_item.quantity * v_item.unit_price);
  end loop;
  v_total := v_total + v_quote.freight;
  v_order_number := 'PED-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.purchase_orders (company_id, purchase_request_id, selected_quote_id, supplier_id, order_number, total_amount)
  values (v_company_id, v_quote.purchase_request_id, p_quote_id, v_quote.supplier_id, v_order_number, v_total)
  returning * into v_order;

  insert into public.purchase_order_items (order_id, material_id, quantity, unit_price)
  select v_order.id, material_id, quantity, unit_price from public.purchase_quote_items where quote_id = p_quote_id;
  update public.purchase_quotes set status = 'rejected', updated_at = now() where purchase_request_id = v_quote.purchase_request_id and company_id = v_company_id and status = 'submitted' and id <> p_quote_id;
  update public.purchase_quotes set status = 'selected', updated_at = now() where id = p_quote_id;
  update public.purchase_requests set status = 'ordered', updated_at = now() where id = v_quote.purchase_request_id;
  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'purchase_order', v_order.id, 'created_from_quote', jsonb_build_object('quote_id', p_quote_id, 'total', v_total));
  return v_order;
end;
$$;

grant execute on function public.select_purchase_quote(uuid) to authenticated;
