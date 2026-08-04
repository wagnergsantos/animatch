# Copilot Instructions — Estatísticas (AniMatch)

Autoridade: Este arquivo é a fonte de verdade para agentes automatizados e desenvolvedores sobre como as estatísticas devem ser calculadas e exibidas.

Resumo das regras (autoridade):

1) Gêneros
- Regra principal: Gêneros usados em gráficos e estatísticas são sempre derivados de mídias com status COMPLETED.
- Exceção (FilterBar): O FilterBar exibe gêneros coletados a partir das entradas PLANNING (planejados). Essas tags representam opções de filtro, não preferência histórica.

2) Universo de análise
- Regra principal: Todas as métricas principais (médias, histogramas, total de vistos, média por gênero, bayesian) devem considerar somente mídias com status COMPLETED.
- Valores para outros status (DROPPED, PAUSED, PLANNED) NÃO devem influenciar as métricas principais. Eles podem ser mostrados separadamente como contadores auxiliares.

3) Dedupe e normalização
- Dedupe: Antes de qualquer agregação (soma de episódios, contagem de mídias), aplicar dedupeByMediaId para garantir uma única contagem por media.id.
- Episodes: Somar episódios apenas uma vez por media.id (usar o valor media.episodes quando disponível).
- Scores: Normalizar escala (por exemplo, averageScore 0-100 → 0-10) antes de agregar.

4) Cache e revalidação
- Valores exibidos podem refletir cache local (CACHE_TTL). Sempre oferecer um botão "Forçar Atualização" que chama a rotina com { forceRefresh: true } para revalidar diretamente na API.

5) Transparência na UI
- Incluir um tooltip/linha de ajuda na página de Estatísticas que diga claramente: "Estatísticas principais calculadas a partir de animes marcados como 'Completed'. Filtros de gênero vêm de 'Planned'."

6) Testes e verificação automática
- Testes unitários obrigatórios: verificar que as funções de agregação filtram por COMPLETED; FilterBar coleta gêneros de PLANNING; dedupe evita duplicação.
- CI: incluir checagem simples que roda um teste de amostra para garantir que a contagem de mídias únicas seja consistente entre normalização e dedupe.

Notas de implementação
- Use estas regras ao implementar novas métricas, gráficos ou relatórios.
- Mantenha a documentação detalhada em docs/plano_implementacao_estatisticas.md e remova duplicações.

(Arquivo de autoridade para agentes — alterações devem ser revisadas por um mantenedor.)