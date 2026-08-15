# Copilot Instructions - Animatch

## Diretrizes de Execução e Performance (Fast Track)

### 1. Classificação de Complexidade

#### ⚡ Tarefas Simples / Pontuais (Modo Direto - Fast Track)
- **Definição**: Alterações em 1 a 3 arquivos, pequenos bugfixes, ajustes de UI, adição de props/contadores simples.
- **REGRA**:
  - **NÃO** acione fluxos pesados de subagentes ou múltiplas etapas burocráticas de revisão.
  - Edite o código diretamente na branch ativa, execute a validação necessária e conclua de forma rápida.

#### 🏗️ Tarefas Complexas / Multissistemas
- **Definição**: Refatorações amplas, novas integrações de API complexas, novos módulos do sistema.
- **REGRA**: Utilize planejamento detalhado e decomposição em etapas.

### 2. Gestão de Tarefas e Backlog (GitHub Issues & gh CLI)
- **Fonte de Verdade**: As tarefas, backlog e bugs são gerenciados via **GitHub Issues** no repositório `wagnergsantos/animatch`.
- **Ferramenta**: Utilize a **GitHub CLI (`gh`)** para interagir com o repositório:
  - Listar tarefas: `gh issue list`
  - Criar tarefas/bugs: `gh issue create`
  - Ver detalhes: `gh issue view <id>`
  - Fechar issue: `gh issue close <id>`
- **Commits & PRs**: Sempre referenciar a issue correspondente nas mensagens de commit e PRs (ex: `Fixes #X` ou `Ref #X`).

