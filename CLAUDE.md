## Stack

Frontend: Vercel. Backend/dados: Supabase (Postgres + Edge Functions).

Não usar Render, Express standalone ou Docker — decisão descartada porque o Postgres gratuito do Render expira em 30 dias, inviável para uso continuado.

## Uso do /impeccable

Não rodar `/impeccable audit`/`polish` automaticamente a cada mudança pequena ou componente isolado durante o desenvolvimento normal (TDD, escrita de código). Disparar apenas:

1. Depois que uma feature inteira estiver completa e testada.
2. Antes de o usuário revisar/aprovar algo como "pronto".
3. Quando o usuário pedir explicitamente.

## Workflow: GitHub Issues + PRs

Toda tarefa de desenvolvimento não trivial segue este fluxo:

1. Criar uma Issue no GitHub descrevendo objetivo e escopo da tarefa antes de começar a codar.
2. Trabalhar numa branch dedicada (não direto na `master`), com nome descritivo referenciando a issue (ex: `feature/agenda-provas`).
3. Abrir um PR ao final, com a descrição referenciando a issue (ex: `Closes #N` ou `Refs #N`), para que o merge feche a issue automaticamente e o histórico fique rastreável.

Isso vale para qualquer agente/modelo trabalhando neste repositório daqui em diante. Não confundir com o "Issue tracker" local em `.scratch/` (seção abaixo) — aquele é um mecanismo interno de skills específicas (ex: `/wayfinder`), não substitui as Issues reais do GitHub usadas para rastrear o trabalho do projeto.

## Agent skills

### Issue tracker

Issues rastreadas como markdown local em `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Contexto único — `CONTEXT.md` + `docs/adr/` na raiz do repositório. See `docs/agents/domain.md`.
