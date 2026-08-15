# Directrizes para Agentes — Animatch

## Gestão de Tarefas e Backlog

- **GitHub Issues**: Fonte principal para backlog, tarefas pendentes e bugs.
- **GitHub CLI (`gh`)**: Agentes devem utilizar o `gh` para consultar e gerenciar o backlog:
  - Listar tarefas ativas: `gh issue list`
  - Consultar especificações de uma tarefa: `gh issue view <id>`
  - Criar novos bugs ou features identificadas: `gh issue create`
  - Concluir tarefas: `gh issue close <id>`
- **Commits**: Referenciar o ID do issue nas mensagens de commit (`Fixes #X` ou `Ref #X`).

## Testes e Validação

- Executar `npm run test` e `npm run lint` antes de concluir qualquer alteração.
- GitHub Actions CI/CD é acionado automaticamente a cada push na `main`/`master`.
