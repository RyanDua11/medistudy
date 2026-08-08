## Stack

Frontend: Vercel. Backend/dados: Supabase (Postgres + Edge Functions).

Não usar Render, Express standalone ou Docker — decisão descartada porque o Postgres gratuito do Render expira em 30 dias, inviável para uso continuado.

## Uso do /impeccable

Não rodar `/impeccable audit`/`polish` automaticamente a cada mudança pequena ou componente isolado durante o desenvolvimento normal (TDD, escrita de código). Disparar apenas:

1. Depois que uma feature inteira estiver completa e testada.
2. Antes de o usuário revisar/aprovar algo como "pronto".
3. Quando o usuário pedir explicitamente.

## Agent skills

### Issue tracker

Issues rastreadas como markdown local em `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Contexto único — `CONTEXT.md` + `docs/adr/` na raiz do repositório. See `docs/agents/domain.md`.
