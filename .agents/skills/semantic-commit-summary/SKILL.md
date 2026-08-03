---
name: semantic-commit-summary
description: >
  Gerar resumo final da sessao no formato de mensagem de commit semantico
  (Conventional Commits) e orientar/automatizar o commit em repositorios Git.
  Suporta modo `commit` (padrao, pede confirmacao, sem push) e modo `push`
  (comita e envia automaticamente).
---

## Objetivo
Gerar um **resumo final da sessao atual** no formato de **Conventional Commits**
(`tipo(escopo): descricao`), com rastreabilidade e sem inventar alteracoes.

Depois, verificar se o workspace e um repositorio Git (existencia de `.git`):
- se existir `.git`, usar **Git**
- se nao existir `.git`, parar o fluxo e informar o bloqueio

---

## Quando usar
- "resumo final", "fechar sessao", "mensagem de commit", "commit semantico"
- "conventional commits", "breaking change"
- "commit", "fazer commit", "subir alteracoes"
- "commit git", "git commit"

---

## Modos de execucao (parametro)
A skill aceita um "parametro" de modo informado junto ao pedido (ex.:
`semantic-commit-summary commit`, `semantic-commit-summary push`):

| Modo | Gatilhos | Comportamento |
|---|---|---|
| `commit` (padrao) | `commit`, ausencia de parametro | Gera o resumo, mostra `git status`/diff, **pede confirmacao explicita** antes de commitar e **nao** executa `git push`. |
| `push` | `push`, "commita e envia", "commit e push", "comitar e subir" | Igual ao modo `commit` (mesma confirmacao antes de commitar), mas **apos o commit ser confirmado e concluido**, executa `git push` automaticamente, sem pedir uma segunda confirmacao. |

- Se nenhum gatilho de modo for identificado na mensagem do usuario, assumir o
  modo `commit` (comportamento padrao/seguro).
- O modo escolhido deve ser declarado no inicio da resposta (ex.: "Modo: push").

---

## Padrao da mensagem
**Linha 1 (titulo):**
tipo(escopo): descricao curta

**Corpo (opcional, multiline):**
- lista objetiva dos arquivos (1 linha por item)

**Footers/Trailers (opcional):**
- BREAKING CHANGE: <descricao objetiva do rompimento>
- Refs: <id/ticket/OS>
- Closes: <id/ticket/OS>

> Trailers seguem a convencao `palavra-chave: valor` para compatibilidade com ferramentas.

---

## Tipos suportados
| Tipo | Descricao | Bump (SemVer) |
|---|---|---|
| feat | nova funcionalidade/capacidade | MINOR |
| fix | correcao de bug/defeito | PATCH |
| refactor | refatoracao sem mudanca de comportamento esperado | - |
| perf | melhoria de desempenho | PATCH |
| test | testes apenas | - |
| docs | documentacao apenas | - |
| chore | manutencao/config/scripts | - |
| ci | pipeline/automacao | - |
| build | build/package/dependencias | - |
| revert | reversao de mudancas | depende do tipo revertido |

---

## Regras de commit atomico
- Um commit deve representar **uma mudanca logica**.
- Se a mensagem precisar de "e", sugerir dividir o commit.
- Em Git, considerar staged e unstaged separadamente.
- Se o conjunto de arquivos parecer misturar assuntos, alertar o usuario antes de commitar.
- Nao incluir `git push` na resposta, exceto quando o modo `push` for solicitado.

---

# Fase 1 - Detectar Git e inspecionar mudancas

## Ordem de deteccao
1. Se `.git` existir, usar **Git**
2. Se nao existir, interromper e informar que nao foi possivel detectar um repositorio Git

## Comandos de inspecao
Verificar staged e unstaged:

```bash
git status --short
git diff --cached --stat
git diff --cached --name-only
git diff --stat
git diff --name-only
```

Se precisar validar detalhes:

```bash
git diff --cached
git diff
```

---

# Fase 2 - Gerar o resumo (obrigatorio)

## Regras obrigatorias
- Usar o padrao `tipo(escopo): descricao curta`
- Descricao curta objetiva, no imperativo, sem floreio
- Cada bullet em no maximo 1 linha: `caminho/do/arquivo.ext: o que mudou`
- Nao inventar arquivos, tickets, impactos ou alteracoes
- Identificar quais arquivos foram modificados ativamente na sessao atual do agente e quais ja estavam modificados antes (fora da sessao).
- O resumo deve focar principalmente nas alteracoes produzidas na sessao atual, adicionando notas caso haja outros arquivos modificados/untracked que nao fazem parte da sessao.

## Formato de saida esperado
tipo(escopo): descricao resumida em uma linha
- caminho/do/arquivo.ext: o que mudou em poucas palavras
- caminho/do/outro.ext: o que mudou em poucas palavras
BREAKING CHANGE: ... (se houver)
Refs: ... (se houver)
Closes: ... (se houver)
obs:
- nota relevante (se houver)

---

# Fase 3 - Fluxo de commit Git (obrigatorio)

Depois de exibir o resumo:

## 1) Mostrar alteracoes
- Mostrar `git status --short` e diff relevante

## 2) Confirmacao explicita
- Perguntar se deseja prosseguir com o commit e se quer ajustar a mensagem (vale para os modos `commit` e `push`).
- **Nunca** executar commit sem confirmacao explicita.
- No modo `push`, deixar claro na pergunta que, apos confirmado o commit, o push sera executado logo em seguida sem nova confirmacao.

## 3) Preparar o conjunto do commit (Automacao de Stage)
- Identificar quais arquivos foram criados ou modificados ativamente durante a sessao atual do agente e **stagea-los automaticamente** (sem necessidade de confirmacao previa de stage).
- Identificar arquivos modificados ou untracked que **nao** foram trabalhados na sessao atual do agente.
- Se houver arquivos modificados ou untracked fora da sessao atual:
  - Perguntar explicitamente ao usuario se deseja adiciona-los ao stage para o commit.
  - Se a resposta for positiva, stagear os arquivos indicados e prosseguir.
  - Se a resposta for negativa, prosseguir apenas com as alteracoes da sessao atual (e outros arquivos ja staged previamente).

## 4) Commit com mensagem multiline em UTF-8
- Criar `commit-msg.txt` na raiz do projeto com **UTF-8**
- Conteudo:
  - Linha 1: titulo semantico
  - Linha 2: linha em branco
  - Linhas seguintes: bullets + footers (BREAKING CHANGE/Refs/Closes), se existirem

```bash
git commit -F commit-msg.txt
```

## 5) Push (somente no modo `push`)
- Apos o commit bem-sucedido, executar `git push` na branch atual.
- Se o push falhar (ex.: divergencia, upstream nao configurado), exibir o erro e nao tentar comandos destrutivos (sem `--force`) sem confirmacao explicita do usuario.

## 6) Limpeza
- Se o commit for bem-sucedido, remover `commit-msg.txt`
- Se o commit falhar, exibir o erro e **nao** remover `commit-msg.txt`

---

## Regras finais
- Usar **Git** sempre que `.git` estiver disponivel
- Nao inventar mudancas, arquivos, ids ou efeitos
- Nao incluir `git push` **a menos que o modo `push` tenha sido explicitamente solicitado**

---

## Referencias
- `semantic_sample.SKILL.md` (referencia para fluxo Git, staged/unstaged e commit atomico)
- [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Versioning 2.0.0](https://semver.org/)
