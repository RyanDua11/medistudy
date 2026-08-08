# Domain Docs

Como as engineering skills devem consumir a documentação de domínio deste repositório ao explorar o código.

## Antes de explorar, leia isto

- **`CONTEXT.md`** na raiz do repositório
- **`docs/adr/`** — leia os ADRs que tocam a área em que você vai trabalhar

Se algum desses arquivos não existir, **prossiga em silêncio**. Não sinalize a ausência; não sugira criá-los antecipadamente. A skill `/domain-modeling` os cria sob demanda quando termos ou decisões são de fato resolvidos.

## Estrutura de arquivos (contexto único)

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-....md
│   └── 0002-....md
└── (código do projeto)
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (em um título de issue, uma proposta de refactor, uma hipótese, um nome de teste), use o termo como definido em `CONTEXT.md`. Não derive para sinônimos que o glossário explicitamente evita.

Se o conceito que você precisa ainda não estiver no glossário, isso é um sinal — ou você está inventando linguagem que o projeto não usa (reconsidere), ou há uma lacuna real (anote para `/domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradiz um ADR existente, sinalize isso explicitamente em vez de sobrescrever silenciosamente:

> _Contradiz o ADR-0007 — mas vale a pena reabrir porque…_
