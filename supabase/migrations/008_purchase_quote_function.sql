create table public.purchase_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  purchase_request_id uuid not null references public.purchase_requests(id),
  supplier_id uuid not null references public.suppliers(id),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'selected', 'rejected')),
  freight numeric(14, 2) not null default 0 check (freight >= 0),
  delivery_days integer check (delivery_days is null or delivery_days >= 0),
  payment_terms text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.purchase_quotes(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0)
);

create index purchase_quotes_request_idx on public.purchase_quotes(purchase_request_id, created_at desc);
create index purchase_quotes_supplier_idx on public.purchase_quotes(supplier_id, created_at desc);
create trigger purchase_quotes_updated_at before update on public.purchase_quotes for each row execute function public.set_updated_at();

alter table public.purchase_quotes enable row level security;
alter table public.purchase_quote_items enable row level security;
create policy "company members can read purchase quotes" on public.purchase_quotes for select using (company_id = public.current_company_id());
create policy "company members can read quote items" on public.purchase_quote_items for select using (exists (select 1 from public.purchase_quotes where purchase_quotes.id = purchase_quote_items.quote_id and purchase_quotes.company_id = public.current_company_id()));

create or replace function public.create_purchase_quote(
  p_purchase_request_id uuid,
  p_supplier_id uuid,
  p_unit_price numeric,
  p_freight numeric default 0,
  p_delivery_days integer default null,
  p_payment_terms text default null,
  p_notes text default null
)
returns public.purchase_quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_request public.purchase_requests;
  v_quote public.purchase_quotes;
  v_item record;
begin
  v_company_id := public.current_company_id();
  if v_company_id is null then raise exception 'Usuário não possui empresa vinculada'; end if;
  if p_unit_price is null or p_unit_price < 0 then raise exception 'Preço inválido'; end if;
  select * into v_request from public.purchase_requests where id = p_purchase_request_id and company_id = v_company_id and status in ('pending', 'quoted') for update;
  if v_request.id is null then raise exception 'Solicitação não encontrada ou indisponível'; end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and company_id = v_company_id) then raise exception 'Fornecedor inválido'; end if;

  insert into public.purchase_quotes (company_id, purchase_request_id, supplier_id, freight, delivery_days, payment_terms, notes)
  values (v_company_id, p_purchase_request_id, p_supplier_id, greatest(0, coalesce(p_freight, 0)), p_delivery_days, p_payment_terms, p_notes)
  returning * into v_quote;

  for v_item in select material_id, requested_quantity from public.purchase_request_items where request_id = p_purchase_request_id loop
    insert into public.purchase_quote_items (quote_id, material_id, quantity, unit_price)
    values (v_quote.id, v_item.material_id, v_item.requested_quantity, p_unit_price);
  end loop;

  update public.purchase_requests set status = 'quoted', updated_at = now() where id = p_purchase_request_id;
  insert into public.audit_log (company_id, actor_id, entity_type, entity_id, action, new_values)
  values (v_company_id, auth.uid(), 'purchase_quote', v_quote.id, 'created', jsonb_build_object('purchase_request_id', p_purchase_request_id, 'supplier_id', p_supplier_id));
  return v_quote;
end;
$$;

grant execute on function public.create_purchase_quote(uuid, uuid, numeric, numeric, integer, text, text) to authenticated;
