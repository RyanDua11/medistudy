-- log_uso_ia: registra cada chamada feita pelas Edge Functions aos
-- provedores de IA (fallback em cascata do chat-medistudy e do
-- gerar-caso-clinico), sucesso ou falha, pro painel de admin conseguir
-- acompanhar uso/custo/estabilidade sem precisar vasculhar logs do Supabase.
create table public.log_uso_ia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  provedor text not null,
  modelo text not null,
  funcionalidade text not null,
  tokens_input integer,
  tokens_output integer,
  sucesso boolean not null,
  erro_mensagem text,
  tempo_resposta_ms integer,
  criado_em timestamptz default now()
);

alter table public.log_uso_ia enable row level security;

-- só a conta de admin (usuario_id hardcoded no painel) lê o log
create policy "Só admin lê" on public.log_uso_ia
  for select using (auth.uid() = 'efe4e863-0ea1-4a0f-9656-f58e6f81d60d'::uuid);

-- Edge Functions inserem usando a service role (bypassa RLS por padrão,
-- mas a policy fica explícita mesmo assim pro caso de alguém chamar via
-- anon key no futuro)
create policy "Edge Functions inserem" on public.log_uso_ia
  for insert with check (true);
