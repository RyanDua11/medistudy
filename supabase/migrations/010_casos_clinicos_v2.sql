-- Reestruturação dos Casos Clínicos: 3 modos de estudo (Rápido, Interativo,
-- Simulador de Anamnese), Caso do Dia compartilhado e histórico/comparação.

alter table public.casos_clinicos
    add column if not exists modo text default 'rapido',
    add column if not exists dificuldade text default 'medio',
    add column if not exists dados_interativo jsonb,
    add column if not exists historico_anamnese jsonb,
    add column if not exists usuarios_resolveram_hoje text[] default '{}',
    add column if not exists data_caso date default current_date,
    add column if not exists tipo text default 'normal';

-- O modo Rápido passou a ter 4 perguntas por caso em vez de 1; as colunas
-- singulares (pergunta/alternativas/alternativa_correta/explicacao) do
-- schema original guardam só a primeira pergunta, por compatibilidade com
-- casos já existentes. `perguntas` guarda o array completo das 4.
alter table public.casos_clinicos
    add column if not exists perguntas jsonb;

-- Casos dos modos Interativo e Anamnese não têm uma única "pergunta" —
-- os dados ficam em dados_interativo/historico_anamnese. Os campos legados
-- eram NOT NULL desde o schema original; relaxados aqui para esses modos.
alter table public.casos_clinicos
    alter column pergunta drop not null,
    alter column alternativas drop not null,
    alter column alternativa_correta drop not null,
    alter column explicacao drop not null;

alter table public.casos_clinicos
    drop constraint if exists casos_clinicos_modo_check;

alter table public.casos_clinicos
    add constraint casos_clinicos_modo_check
    check (modo in ('rapido', 'interativo', 'anamnese'));

alter table public.casos_clinicos
    drop constraint if exists casos_clinicos_dificuldade_check;

alter table public.casos_clinicos
    add constraint casos_clinicos_dificuldade_check
    check (dificuldade in ('facil', 'medio', 'dificil'));

-- Necessária para: (a) o Caso do Dia ser compartilhado e qualquer usuária
-- autenticada poder se adicionar a usuarios_resolveram_hoje, e (b) a autora
-- de um caso Anamnese poder atualizar historico_anamnese ao longo da
-- conversa. Não existia nenhuma policy de update antes desta migração —
-- toda tentativa de UPDATE falhava silenciosamente sob RLS.
drop policy if exists "usuarias autenticadas atualizam casos" on public.casos_clinicos;

create policy "usuarias autenticadas atualizam casos"
    on public.casos_clinicos for update
    to authenticated
    using (true)
    with check (true);
