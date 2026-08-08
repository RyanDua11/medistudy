# Issue tracker: Local Markdown

Issues e specs (também conhecidas como PRD) deste repositório vivem como arquivos markdown em `.scratch/`.

## Conventions

- Uma feature por diretório: `.scratch/<feature-slug>/`
- A spec é `.scratch/<feature-slug>/spec.md`
- Issues de implementação são um arquivo por ticket em `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numeradas a partir de `01` — nunca um único arquivo combinado de tickets
- O estado de triagem é registrado como uma linha `Status:` perto do topo de cada arquivo de issue
- Comentários e histórico de conversa são anexados ao final do arquivo sob um cabeçalho `## Comments`

## Quando uma skill diz "publish to the issue tracker"

Crie um novo arquivo em `.scratch/<feature-slug>/` (criando o diretório se necessário).

## Quando uma skill diz "fetch the relevant ticket"

Leia o arquivo no caminho referenciado. O usuário normalmente passará o caminho ou o número da issue diretamente.

## Wayfinding operations

Usado por `/wayfinder`. O **map** é um arquivo com um arquivo **child** por ticket.

- **Map**: `.scratch/<effort>/map.md` — o corpo Notes / Decisions-so-far / Fog.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numerado a partir de `01`, com a pergunta no corpo. Uma linha `Type:` registra o tipo do ticket (`research`/`prototype`/`grilling`/`task`); uma linha `Status:` registra `claimed`/`resolved`.
- **Blocking**: uma linha `Blocked by: NN, NN` perto do topo. Um ticket fica desbloqueado quando todos os arquivos que lista estão `resolved`.
- **Frontier**: varra `.scratch/<effort>/issues/` por arquivos abertos, desbloqueados e não reivindicados; o de menor número vence.
- **Claim**: defina `Status: claimed` e salve antes de qualquer trabalho.
- **Resolve**: anexe a resposta sob um cabeçalho `## Answer`, defina `Status: resolved`, depois anexe um ponteiro de contexto (resumo + link) às Decisions-so-far do `map.md`.
