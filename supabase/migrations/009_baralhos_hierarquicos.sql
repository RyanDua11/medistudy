-- Fase 2 dos flashcards: tipos de card (Básico/Cloze), card reverso
-- automático e navegação hierárquica de baralhos (Matéria > Subtópico > Detalhe).

alter table public.flashcards
    add column if not exists tipo text not null default 'basico',
    add column if not exists dica text,
    add column if not exists contexto text,
    add column if not exists eh_reverso boolean not null default false,
    add column if not exists subtopico text,
    add column if not exists detalhe text;

alter table public.flashcards
    drop constraint if exists flashcards_tipo_check;

alter table public.flashcards
    add constraint flashcards_tipo_check
    check (tipo in ('basico', 'cloze'));
