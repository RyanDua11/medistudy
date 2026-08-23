create table if not exists public.log_resolucoes_casos (
    id uuid primary key default gen_random_uuid(),
    caso_clinico_id uuid not null references public.casos_clinicos (id) on delete cascade,
    usuario_id uuid not null references auth.users (id) on delete cascade,
    alternativa_escolhida integer not null,
    acertou boolean not null,
    resolvido_em timestamptz not null default now()
);

alter table public.log_resolucoes_casos enable row level security;

create policy "usuarias veem apenas seus logs de resolucao"
    on public.log_resolucoes_casos for select
    using (auth.uid() = usuario_id);

create policy "usuarias criam seus proprios logs de resolucao"
    on public.log_resolucoes_casos for insert
    with check (auth.uid() = usuario_id);
