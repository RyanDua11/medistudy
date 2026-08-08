create table if not exists public.notas (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    materia text not null,
    avaliacao text not null,
    peso numeric not null,
    nota numeric not null,
    created_at timestamptz not null default now()
);

alter table public.notas enable row level security;

create policy "usuarios veem apenas suas notas"
    on public.notas for select
    using (auth.uid() = user_id);

create policy "usuarios criam suas proprias notas"
    on public.notas for insert
    with check (auth.uid() = user_id);

create policy "usuarios atualizam suas proprias notas"
    on public.notas for update
    using (auth.uid() = user_id);

create policy "usuarios removem suas proprias notas"
    on public.notas for delete
    using (auth.uid() = user_id);
