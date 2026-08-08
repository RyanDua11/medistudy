create table if not exists public.provas (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    materia text not null,
    data timestamptz not null,
    nota_necessaria numeric,
    created_at timestamptz not null default now()
);

alter table public.provas enable row level security;

create policy "usuarios veem apenas suas provas"
    on public.provas for select
    using (auth.uid() = user_id);

create policy "usuarios criam suas proprias provas"
    on public.provas for insert
    with check (auth.uid() = user_id);

create policy "usuarios atualizam suas proprias provas"
    on public.provas for update
    using (auth.uid() = user_id);

create policy "usuarios removem suas proprias provas"
    on public.provas for delete
    using (auth.uid() = user_id);
