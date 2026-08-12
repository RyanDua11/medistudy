create table if not exists public.log_revisoes (
    id uuid primary key default gen_random_uuid(),
    flashcard_id uuid not null references public.flashcards (id) on delete cascade,
    usuario_id uuid not null references auth.users (id) on delete cascade,
    acertou boolean not null,
    revisado_em timestamptz not null default now()
);

alter table public.log_revisoes enable row level security;

create policy "usuarias veem apenas seus logs"
    on public.log_revisoes for select
    using (auth.uid() = usuario_id);

create policy "usuarias criam seus proprios logs"
    on public.log_revisoes for insert
    with check (auth.uid() = usuario_id);
