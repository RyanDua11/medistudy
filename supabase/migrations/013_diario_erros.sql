-- erros_estudo: registro silencioso de toda vez que a usuária erra uma
-- pergunta (flashcard ou caso clínico), pro Diário de Erros Inteligente
-- conseguir mostrar padrões por matéria/tópico e evolução ao longo do tempo.
create table public.erros_estudo (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  ferramenta text not null check (ferramenta in ('flashcards', 'casos_clinicos')),
  materia text,
  topico text,
  pergunta_resumo text,
  resposta_usuario text,
  resposta_correta text,
  criado_em timestamptz default now()
);

create index erros_estudo_usuario_id_idx on public.erros_estudo (usuario_id, criado_em desc);

alter table public.erros_estudo enable row level security;

create policy "Usuária lê os próprios erros" on public.erros_estudo
  for select using (auth.uid() = usuario_id);

create policy "Usuária insere os próprios erros" on public.erros_estudo
  for insert with check (auth.uid() = usuario_id);
