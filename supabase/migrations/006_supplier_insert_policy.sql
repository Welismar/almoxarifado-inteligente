create policy "company members can insert suppliers" on public.suppliers
  for insert with check (company_id = public.current_company_id());
