# Diretrizes de Execução e Performance (Fast Track)

## 1. Classificação de Complexidade

Antes de planejar ou executar qualquer tarefa, avalie a complexidade:

### ⚡ Tarefas Simples / Pontuais (Modo Direto - Fast Track)
- **Definição**: Alterações focadas em 1 a 3 arquivos, pequenos bugfixes, ajustes visuais/CSS, adição de novos parâmetros, contadores ou formatações simples.
- **REGRA OBRIGATÓRIA**:
  - **NÃO** acione subagentes (`subagent-driven-development`).
  - **NÃO** crie pipelines pesados com múltiplos papéis de revisão (spec-reviewer, code-reviewer).
  - **NÃO** crie branches/worktrees secundários para a execução.
- **FLUXO DIRETO**:
  1. Edite os arquivos diretamente na branch atual.
  2. Rode os testes afetados/gerais (`npx vitest run`).
  3. Confirme o resultado ao usuário com evidências do teste de forma ágil e concisa.

### 🏗️ Tarefas Complexas / Multissistemas
- **Definição**: Novas integrações completas de API, refatorações arquiteturais abrangentes, criação de novos módulos inteiros com dependências encadeadas.
- **FLUXO ESTRUTURADO**:
  1. Elabore spec e plano de implementação se necessário.
  2. Utilize subagentes ou múltiplos passos de validação apenas quando o risco ou isolamento justificar a complexidade.

## 2. Comunicação e Eficiência
- Priorize agilidade e edições diretas em tarefas do dia a dia.
- Evite loops excessivos de perguntas/confirmações quando a instrução do usuário já for clara.
