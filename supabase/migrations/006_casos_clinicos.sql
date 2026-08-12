create table if not exists public.casos_clinicos (
    id uuid primary key default gen_random_uuid(),
    materia text not null,
    enunciado text not null,
    pergunta text not null,
    alternativas jsonb not null,
    alternativa_correta integer not null,
    explicacao text not null,
    criado_por uuid not null references auth.users (id) on delete cascade,
    criado_em timestamptz not null default now()
);

alter table public.casos_clinicos enable row level security;

create policy "usuarias autenticadas veem todos os casos"
    on public.casos_clinicos for select
    to authenticated
    using (true);

create policy "usuarias criam casos como si mesmas"
    on public.casos_clinicos for insert
    to authenticated
    with check (auth.uid() = criado_por);
