alter table public.flashcards
    add column if not exists intervalo_dias integer not null default 1,
    add column if not exists fator_facilidade double precision not null default 2.5,
    add column if not exists proxima_revisao timestamptz not null default now();
