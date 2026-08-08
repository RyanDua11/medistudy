create table if not exists public.flashcards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    pergunta text not null,
    resposta text not null,
    acertos integer not null default 0,
    erros integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.flashcards enable row level security;

create policy "usuarios veem apenas seus flashcards"
    on public.flashcards for select
    using (auth.uid() = user_id);

create policy "usuarios criam seus proprios flashcards"
    on public.flashcards for insert
    with check (auth.uid() = user_id);

create policy "usuarios atualizam seus proprios flashcards"
    on public.flashcards for update
    using (auth.uid() = user_id);

create policy "usuarios removem seus proprios flashcards"
    on public.flashcards for delete
    using (auth.uid() = user_id);
