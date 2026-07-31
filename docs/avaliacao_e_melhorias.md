# Avaliação da Ferramenta e Propostas de Melhoria

## Visão Geral
Este documento apresenta uma análise técnica detalhada dos problemas identificados e uma avaliação das 10 propostas de melhoria sugeridas para a aplicação AniMatch.

---

## ⚠️ Avaliação dos Problemas Identificados

### 1. Compatibilidade de Dependências (Crítico)
* **Diagnóstico:** O erro `webidl.util.markAsUncloneable is not a function` ocorre devido a incompatibilidades entre versões do Node.js (v20.19.5 LTS) e versões recentes do `jsdom`/`undici` que exigem Node.js v22+.
* **Recomendação:** A opção de **downgrade das dependências de teste** no `package.json` é a mais adequada. Manter a aplicação no Node 20 LTS garante estabilidade e compatibilidade com a maioria dos ambientes de CI/CD e hospedagem sem forçar uma atualização disruptiva de ambiente.

### 2. API - Falta de Cache
* **Diagnóstico:** Chamadas repetidas à API do AniList sem cache aumentam a latência e o risco de estourar a taxa limite (*rate limit*) da API (90 requisições por minuto).
* **Recomendação:** Implementação de cache via `localStorage` com TTL (Time To Live) de 5 a 10 minutos para dados da lista do usuário. Para evitar que o limite de 5MB do `localStorage` seja atingido por usuários com listas gigantescas, o cache deve armazenar apenas os atributos estritamente necessários.

### 3. Tratamento de Erros
* **Diagnóstico:** Mensagens de erro genéricas e falta de mecanismo de retentativa (*retry*) prejudicam a resiliência em caso de falhas temporárias de rede ou indisponibilidade pontual do GraphQL da AniList.
* **Recomendação:** Implementar um interceptor/wrapper de requisições com *backoff exponencial* (ex: tentar novamente 2 a 3 vezes em intervalos crescentes) e mensagens explicativas em português.

### 4. Performance
* **Diagnóstico:** Payload excessivo devido a buscas de campos desnecessários no GraphQL (ex: `externalLinks` completo) e ausência de paginação/virtualização para listas longas.
* **Recomendação:** Refatorar a query GraphQL para enxugar os campos solicitados e aplicar renderização otimizada/virtualização para listas grandes.

### 5. Segurança
* **Diagnóstico:** Sanitização e validação de URLs externas e HTML em descrições de mídia.
* **Recomendação:** Garantir validação e sanitização rígidas de URLs de streaming externos e manter `asHtml: false` ou utilizar biblioteca de sanitização (ex: `DOMPurify`) se HTML for renderizado.

---

## 🚀 Análise Técnica das 10 Propostas de Melhoria

| # | Proposta | Impacto | Complexidade | Avaliação & Recomendações |
|---|---|---|---|---|
| **1** | **Corrigir Tests (Downgrade JSDOM/Vitest)** | Alto | Baixa | **Essencial & Imediato.** Ajusta as dependências para rodar os testes na versão atual do Node 20 LTS. |
| **2** | **Cache de Dados (`localStorage`)** | Alto | Baixa | **Excelente.** Reduz latência de carregamento para 0ms em acessos subsequentes no intervalo de TTL. Recomenda-se adicionar botão de "Forçar Atualização". |
| **3** | **Otimizar Query GraphQL** | Alto | Baixa | **Cirúrgico.** Diminui payload consumido da rede, acelera o parse JSON no navegador e economiza memória RAM. |
| **4** | **Skeleton Loading nos Cards** | Médio | Baixa | **Padrão de UX moderna.** Evita o efeito *CLS (Cumulative Layout Shift)* e dá feedback visual imediato ao usuário. |
| **5** | **Filtros Avançados (Ano, Formato, Busca, Ordenação)** | Alto | Média | **Fundamental para utilidade.** Permite ao usuário refinar e encontrar animes específicos rapidamente na lista recomendada. |
| **6** | **Export/Import de Dados (CSV/JSON)** | Médio | Baixa | **User-Centric.** Concede autonomia ao usuário sobre seus dados sem necessidade de processamento no servidor. |
| **7** | **PWA (Progressive Web App)** | Médio | Média | **Visão de futuro.** Permite instalação no celular/desktop e melhora experiência de uso como aplicativo nativo. |
| **8** | **Dark/Light Theme Toggle** | Médio | Baixa | **Moderno.** A abordagem sugerida usando variáveis CSS e `oklch` é nativa, super leve e altamente acessível. |
| **9** | **Compartilhar Recomendações** | Médio | Média | **Growth Loop.** Permite gerar URLs com parâmetros de estado (`?user=username`) facilitando o compartilhamento de perfis e listas. |
| **10**| **Histórico de Sessões** | Baixo | Média | **Interessante.** Permite acompanhar a evolução do perfil de recomendações ao longo do tempo. |

---

## 📋 Roteiro de Implementação Sugerido

### Fase 1: Estabilidade e Performance (Prioridade Alta)
1. Ajuste das dependências no `package.json` e execução da suíte de testes.
2. Otimização da query GraphQL no client AniList.
3. Implementação da camada de cache com `localStorage` e TTL.
4. Melhorar mensagens de erro e adicionar retry (3 tentativas)

### Fase 2: Experiência do Usuário & UX (Prioridade Média)
1. Adição dos Skeleton Loaders durante o carregamento de recomendações.
2. Implementação do seletor de temas Dark/Light (`oklch` + CSS Variables).
3. Adição dos Filtros Avançados (ano, formato, ordenação e busca por nome).

### Fase 3: Recursos Adicionais e Expansão (Prioridade Secundária)
1. Exportação de recomendações em CSV.
2. Suporte a PWA (`manifest.json` e Service Worker).
3. URLs de compartilhamento dinâmico e histórico de consultas.

### Backlog (Futuro)

1. Sistema de notificações para novos episódios
2. Integração com MyAnimeList também
3. Modo comparativo (comparar gosto com amigos)
4. Gráficos mais elaborados (D3.js ou Chart.js)
5. Backend próprio para caching e analytics
