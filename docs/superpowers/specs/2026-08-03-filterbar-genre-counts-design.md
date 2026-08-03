# Design Spec: FilterBar Genre Source & Item Counters

**Data:** 2026-08-03
**Status:** Aprovado pelo usuário

## 1. Visão Geral
A `FilterBar` passará a refletir explicitamente os gêneros e contagens de animes oriundos exclusivamente da lista de **Planejados** (`PLANNING`), adicionando a contagem de itens ao lado do rótulo de cada gênero na interface do usuário.

## 2. Mudanças Arquiteturais e de Dados

### 2.1 `Dashboard.jsx`
- **Cálculo da Contagem de Gêneros (`availableGenresWithCounts`)**:
  - Filtra `allEntries` para obter apenas itens com status `PLANNING`.
  - Percorre cada item e agrega a frequência de aparecimento de cada gênero em um `Map<string, number>`.
  - Mapeia o resultado para um array de objetos `{ name: string, count: number }`, ordenados por `name.localeCompare(b.name)`.
  - Calcula o total absoluto de itens planejados para o rótulo de "Todos os Gêneros" (`ALL`).

### 2.2 `FilterBar.jsx`
- Atualização na prop `availableGenres` para aceitar a estrutura `{ name: string, count: number }[]` (mantendo compatibilidade com `string[]`).
- Renderização dos rótulos dos botões com o formato: `<Nome do Gênero> (<Contagem>)`.
  - Exemplo: `Todos os Gêneros (42)`
  - Exemplo: `Ação (15)`
  - Exemplo: `Comédia (8)`

## 3. Experiência do Usuário (UX)
- A contagem exibe o total bruto da lista de planejados para cada gênero, permitindo ao usuário saber exatamente quantos animes de cada categoria ele possui salvos para assistir.
- As contagens nos botões permanecem estáveis enquanto o usuário utiliza os outros filtros (busca por texto, filtro de ano ou formato).

## 4. Testes e Validação
- Atualização do `FilterBar.test.jsx` para verificar a renderização dos botões com suas respectivas contagens.
- Atualização/Validação do `Dashboard.test.jsx` para garantir integração perfeita entre a lista de planejados e a `FilterBar`.
