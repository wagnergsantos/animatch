# Design Spec — B5: Exportação e Compartilhamento Visual de Perfil de Gosto (Wrapped) (#15)

**Data:** 2026-10-16  
**Issue:** `#15`  
**Status:** Aprovado para Planejamento

---

## 1. Objetivo
Permitir que o usuário gere, visualize, copie e baixe um card visual estático (`PNG`, `1200x630` — formato OpenGraph / Social Share) resumindo seu perfil de gosto (Taste Profile), métricas globais de animes assistidos e o Top 3 de recomendações personalizadas do seu Planning.

---

## 2. Arquitetura e Componentes

### 2.1. `src/logic/wrappedGenerator.js`
Módulo responsável pela preparação dos dados e renderização em Canvas 2D (`HTMLCanvasElement` `1200x630`):
- **`buildWrappedData({ username, providerLabel, isEnsemble, activeProviders, entries, tasteProfile, recommendations })`**:
  - Extrai KPIs globais de `entries`:
    - `completedCount`: total de animes com status `COMPLETED`.
    - `totalEpisodes`: soma de episódios de animes `COMPLETED` e `CURRENT`.
    - `meanScore`: média aritmética das notas atribuídas pelo usuário (> 0).
  - Extrai **Top 5 Gêneros** do `tasteProfile` ordenados por `adjustedAverage ?? average` decrescente:
    - `{ genre, score, count, percentage }` (onde `percentage` é proporcional ao score em escala 0–100%).
  - Extrai **Top 3 Recomendações** de `recommendations`:
    - `{ rank, id, title, predictedScore, communityScore, format, year, genres, coverImage }`.
- **`renderWrappedCanvas(canvas, wrappedData, labels)`**:
  - Configura o `<canvas>` em `1200x630`.
  - Desenha fundo escuro com gradiente sutil (`#0b0f19` → `#161f33`) e detalhes visuais da marca AniMatch (`#6366f1` / `#8b5cf6`).
  - **Header (`y: 0..100`)**:
    - Logo/Título `✨ AniMatch Wrapped`
    - Identificação do perfil (`@username (AniList)` ou `🌐 Consolidado (AniList · Kitsu · MAL)`)
    - Data da geração no canto superior direito.
  - **Coluna Esquerda (`x: 48..580`, `y: 115..560`)**:
    - **Bloco de Métricas Globais**: 3 cards compactos lado a lado (Concluídos, Episódios, Nota Média).
    - **Seção Top 5 Gêneros (Taste Profile)**: barras de progresso horizontais com nome do gênero, quantidade de obras `(N)` e nota Bayesiana `★ 8.45`.
  - **Coluna Direita (`x: 610..1152`, `y: 115..560`)**:
    - **Seção Top 3 Recomendações**: 3 cards horizontais empilhados.
    - Tenta carregar `coverImage` via `Image` com `crossOrigin = 'anonymous'` (timeout de 2.5s). Se carregar sem erro de CORS, desenha miniatura arredondada (`68x96`); caso contrário, desenha placeholder elegante com o ranking (`#1`, `#2`, `#3`).
    - Exibe título truncado com reticências se necessário, formato/ano, até 3 tags de gênero e badge de compatibilidade (`★ 9.1`).
  - **Footer (`y: 575..630`)**:
    - Assinatura discreta `Gerado por AniMatch` + URL da aplicação.
- **Helpers de Exportação**:
  - `canvasToPngBlob(canvas)`: encapsula `canvas.toBlob(resolve, 'image/png')`.
  - `downloadWrappedPng(canvas, filename)`: faz download do blob como arquivo `.png`.
  - `copyWrappedPngToClipboard(canvas)`: usa `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`.

### 2.2. `src/components/WrappedModal.jsx` + `src/components/WrappedModal.module.css`
Modal interativo e acessível (`role="dialog"`, `aria-modal="true"`, fechamento com `Escape` e clique no backdrop):
- Renderiza preview responsivo do `<canvas>` (mantendo `aspect-ratio: 1200 / 630`).
- Barra de ações no rodapé do modal:
  1. **Baixar PNG** (primário)
  2. **Copiar Imagem** (secundário — oculto/desabilitado apenas se `ClipboardItem` não for suportado pelo navegador, com feedback temporário *"Imagem copiada!"*)
  3. **Copiar Link** (secundário — copia URL com `?user=<username>`, substituindo a função antiga do botão "Compartilhar" do header)

### 2.3. Integrações na UI Existente
1. **`src/components/Dashboard.jsx`**:
   - O botão **Compartilhar** no header passa a abrir o `WrappedModal` (`isWrappedModalOpen`).
   - Passa `onOpenWrapped={() => setIsWrappedModalOpen(true)}` para `StatisticsPage`.
2. **`src/components/StatisticsPage.jsx` & `src/components/ExportSnapshotButton.jsx`**:
   - `ExportSnapshotButton` recebe prop opcional `onOpenWrapped` e exibe o botão **"✨ Card Wrapped"** junto aos botões de exportar CSV e JSON.
3. **Internacionalização (`src/locales/{pt-BR,en,ja}.json`)**:
   - Chaves em `wrapped.*` para títulos do card, métricas, botões de ação e mensagens de feedback.

---

## 3. Tratamento de Erros e Casos de Borda
- **CORS em imagens de capa**: Se qualquer CDN externa bloquear leitura em canvas (`SecurityError` ou `onerror` da imagem), a promessa de carregamento da imagem resolve como `null` e o gerador desenha um badge gráfico de ranking (`#1`, `#2`, `#3`), garantindo que `canvas.toBlob()` **nunca** falhe por *tainted canvas*.
- **Listas vazias / sem recomendações**: Se o usuário tiver menos de 5 gêneros ou menos de 3 recomendações, renderiza apenas os itens disponíveis ou mensagem amigável de estado vazio no card.
- **Clipboard API indisponível**: Se `navigator.clipboard?.write` ou `window.ClipboardItem` falhar, exibe feedback orientando o uso do botão **Baixar PNG**.

---

## 4. Estratégia de Testes
- **`src/__tests__/wrappedGenerator.test.js`**:
  - Testa `buildWrappedData` com entradas reais/mockadas (cálculo de concluídos, episódios, nota média, top 5 gêneros e top 3 recomendações).
  - Testa `renderWrappedCanvas` com mock de contexto 2D do Canvas, validando que o desenho completa mesmo sem imagens carregadas e com listas vazias.
- **`src/__tests__/WrappedModal.test.jsx`**:
  - Testa abertura/fechamento do modal, disparo de download PNG, cópia de imagem e cópia de link para o clipboard.
