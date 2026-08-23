CREATE TABLE IF NOT EXISTS conversas_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT 'Nova conversa',
  materia TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensagens_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID REFERENCES conversas_chat(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversas_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios veem suas conversas" ON conversas_chat
  FOR ALL USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios veem suas mensagens" ON mensagens_chat
  FOR ALL USING (
    conversa_id IN (SELECT id FROM conversas_chat WHERE usuario_id = auth.uid())
  );
