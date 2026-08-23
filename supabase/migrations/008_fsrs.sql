-- Migra o agendamento de repetição espaçada dos flashcards de SM-2 para FSRS-5.
-- As colunas antigas (intervalo_dias, fator_facilidade) são mantidas por
-- compatibilidade histórica, mas deixam de ser usadas pelo agendador.

alter table public.flashcards
    add column if not exists dificuldade double precision,
    add column if not exists estabilidade double precision,
    add column if not exists estado text not null default 'novo',
    add column if not exists ultima_revisao timestamptz;

alter table public.flashcards
    drop constraint if exists flashcards_estado_check;

alter table public.flashcards
    add constraint flashcards_estado_check
    check (estado in ('novo', 'aprendizado', 'revisao', 'reaprendizado'));

alter table public.log_revisoes
    add column if not exists rating smallint;

alter table public.log_revisoes
    drop constraint if exists log_revisoes_rating_check;

alter table public.log_revisoes
    add constraint log_revisoes_rating_check
    check (rating is null or rating between 1 and 4);
