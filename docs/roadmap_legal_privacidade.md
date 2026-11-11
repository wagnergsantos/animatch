# Roadmap — Adequação Legal, Privacidade e Proteção de Dados (LGPD / GDPR / ECA)

**Repositório:** wagnergsantos/animatch
**Data:** 10/11/2026
**Escopo:** Auditoria jurídica/técnica para o Brasil (LGPD — Lei 13.709/18, ECA — Lei 8.069/90, ECA Digital — Lei 15.211/25, LDA — Lei 9.610/98, LPI — Lei 9.279/96, LBI — Lei 13.146/15 / WCAG 2.2 AA) alinhada às boas práticas europeias (GDPR) e padrões de plataformas equivalentes (`anime.plus`, `notify.moe`, `LiveChart.me`, `Anime-Planet`).

---

## 1. Premissas e Decisões de Produto

1. **Natureza 100% Gratuita e Não-Comercial:** O AniMatch não possui módulo de vendas, assinaturas pagas ou anúncios. As exigências de e-commerce (CNPJ/CPF/endereço físico, preço com taxas e direito de arrependimento de 7 dias do Decreto 7.962/13 e Art. 49 do CDC) não se aplicam ao estado atual.
2. **Arquivos locais em `scripts/`:** Os dumps `scripts/animes.csv` e `scripts/kitsu_mal_export.xml*` pertencem ao próprio autor do repositório e não configuram vazamento de terceiros.
3. **Sem Banner de Cookies Invasivo:** Como o app não utiliza rastreadores publicitários ou analytics de terceiros (apenas `localStorage` e `IndexedDB` estritamente necessários para funcionamento offline e sessão), aplica-se a dispensa de banner de cookies (Diretiva ePrivacy / orientações ANPD), bastando transparência na página *Sobre & Privacidade*.
4. **Uso Informativo de Metadados e Capas (Padrão LiveChart.me):** As capas e sinopses são carregadas diretamente das CDNs oficiais dos provedores (AniList, Kitsu, MyAnimeList) para fins informativos e de catalogação pessoal, com atribuição explícita às fontes, links para plataformas oficiais de streaming e canal de remoção (DMCA/Takedown).

---

## 2. Fases de Implementação e Issues Vinculadas

### [x] Fase 1 (L1) — Proteção de Menores e Filtro +18 / Safe Mode nos Providers (#27)

**Referência Legal:** ECA (Arts. 74–79), ECA Digital (Lei 15.211/2025) e LGPD (Art. 14).

**Problema no Código:**
- `supabase/functions/mal-proxy/index.ts` (linha 101) força `&nsfw=true` na chamada à API do MyAnimeList.
- `src/api/providers/anilist.js` não solicita nem filtra o campo `isAdult`.
- `src/api/providers/kitsu.js` não filtra `attributes.nsfw` nem `attributes.ageRating === 'R18'`.
- Como qualquer visitante pode consultar listas públicas sem verificação etária, obras `+18 / Hentai` presentes na lista consultada são exibidas livremente.

**Correção Técnica:**
1. **MyAnimeList (`supabase/functions/mal-proxy/index.ts`)**:
   - Remover `&nsfw=true` da URL de busca.
   - Incluir `nsfw` na lista de `fields` requisitados e descartar entradas com classificação adulta (`nsfw === 'black'`).
2. **AniList (`src/api/providers/anilist.js`)**:
   - Incluir `isAdult` no bloco `media` das queries `COMPLETED_QUERY`, `PLANNING_QUERY` e `ALL_LISTS_QUERY`.
   - Em `flattenEntries()`, filtrar itens onde `entry?.media?.isAdult === true`.
3. **Kitsu (`src/api/providers/kitsu.js`)**:
   - Em `normalizeEntry()`, retornar `null` caso `anime?.attributes?.nsfw === true` ou `anime?.attributes?.ageRating === 'R18'`.
4. **Testes (`src/api/providers/*.test.js`)**:
   - Cobrir filtragem automática de itens adultos nos 3 provedores.

---

### [x] Fase 2 (L2) — Sincronização em Nuvem Condicionada à Confirmação de Conta Própria (#28)

**Referência Legal:** LGPD Art. 6º, III (Princípio da Necessidade/Minimização) e Art. 7º, I e V.

**Problema no Código:**
- `src/api/index.js` (linhas 70–76 e 120–122) chama `scheduleCloudAnimeListSync()` automaticamente para qualquer `username` consultado enquanto o usuário estiver autenticado no Supabase, gravando listas de terceiros/amigos na tabela `public.user_anime_lists`.

**Correção Técnica:**
1. **Guarda de Sincronização (`src/api/index.js` / `src/cache/cloudListSync.js`)**:
   - Só sincronizar automaticamente no Supabase se o `username` consultado para aquele `provider` coincidir (case-insensitive) com o username salvo em `settings.linked_usernames[provider]`.
2. **Confirmação Explícita para Contas Não Vinculadas (`src/components/Dashboard.jsx`)**:
   - Se o usuário estiver logado na nuvem (`user != null`) e consultar um `username` ainda não vinculado naquele provedor (ex.: conta secundária `wgsantos` ou lista de terceiro), manter os dados apenas em memória/cache local.
   - Exibir banner/botão discreto no cabeçalho do Dashboard:
     > *"Esta conta (`@username`) é sua? **[Vincular e salvar na minha nuvem]**"*
   - Ao clicar em confirmar: atualizar `linked_usernames[provider] = username` e disparar `scheduleCloudAnimeListSync`.

---

### [x] Fase 3 (L3) — Direito de Exclusão na Nuvem e Zero Resíduos Locais no Logout (#29)

**Referência Legal:** LGPD Art. 18, IV e VI (Eliminação de dados pessoais) e GDPR Art. 17 (*Right to Erasure*).

**Problema no Código:**
1. A migration `supabase/migrations/20261009000000_create_user_settings.sql` criou policies `SELECT`, `INSERT` e `UPDATE` para `public.user_settings`, mas omitiu a policy `FOR DELETE`.
2. Desvincular um provedor em `src/components/SettingsPage.jsx` (linhas 208–223) apenas limpa a string em `linked_usernames`, deixando a lista completa gravada em `public.user_anime_lists` e no cache local (`IndexedDB` / `localStorage`).
3. Não existe botão para o usuário excluir sua conta (`auth.users`) e todos os seus dados da nuvem.
4. `signOut` (`src/auth/AuthContext.jsx`) e `handleLogout` (`src/App.jsx`) não limpam `IndexedDB` (`animatch_db`) nem chaves `animatch_*` do `localStorage`, deixando dados expostos em dispositivos compartilhados.
5. `src/components/LoginScreen.jsx` exibe `Consultas recentes` sem opção de limpar o histórico.

**Correção Técnica:**
1. **Migration SQL (`supabase/migrations/`)**:
   - Criar policy `"Users can delete own settings" on public.user_settings for delete using (auth.uid() = user_id);`.
   - Criar função RPC `public.delete_own_account()` (`language plpgsql security definer`) que executa `delete from auth.users where id = auth.uid();` (acionando `ON DELETE CASCADE` em `user_settings` e `user_anime_lists`).
2. **Limpeza ao Desvincular Provedor (`src/components/SettingsPage.jsx` + `src/cache/cloudListSync.js`)**:
   - Criar helper `deleteCloudAnimeList(userId, provider, username)` que remove o registro de `public.user_anime_lists`.
   - Ao desvincular uma conta em `SettingsPage.jsx`, remover também do Supabase e chamar `clearProviderCache(username, provider)`.
3. **Utilitário `clearAllLocalData()` (`src/cache/idbCache.js` / `src/cache/apiCache.js`)**:
   - Apagar todos os registros do object store `anime_lists` no `IndexedDB` (`animatch_db`) e remover todas as chaves `animatch_*` do `localStorage`.
   - Acionar no `signOut` da conta nuvem e adicionar botão **"Limpar dados locais do navegador"** em `SettingsPage.jsx`.
   - Adicionar botão **"Limpar histórico"** ao lado de "Consultas recentes" em `LoginScreen.jsx`.
4. **Exclusão Completa de Conta (`src/components/SettingsPage.jsx`)**:
   - Adicionar botão **"Excluir minha conta e dados da nuvem"** com confirmação explícita → chama RPC `delete_own_account()`, executa `clearAllLocalData()` e encerra a sessão.

---

### [x] Fase 4 (L4) — Modal "Sobre, Privacidade & Termos", Consentimento 16+, Reset de Senha e Assets (#30)

**Referência Legal:** LGPD Arts. 9º, 33 e 41 / GDPR Arts. 8º, 12–14 e Cap. V / LDA (Lei 9.610/98) / LPI (Lei 9.279/96) / CDC Art. 37.

**Problema no Código:**
- Ausência de aviso de privacidade, termos de uso, atribuição de APIs, disclaimer de marcas e canal de contato (LGPD/DMCA).
- Ausência de declaração de idade mínima (16+ anos) ao criar conta e de recuperação de senha ("Esqueci minha senha") em `src/components/AuthModal.jsx`.
- Texto `auth.sync_desc` (`src/locales/pt-BR.json:78`, `AuthModal.jsx:139`, `SettingsPage.jsx:116`) promete que os dados são salvos "com segurança" absoluta em vez de usar linguagem descritiva neutra.
- `index.html` (linhas 23–25) carrega a fonte `Inter` remotamente de `fonts.googleapis.com` / `fonts.gstatic.com`. Embora a fonte `Inter` possua licença aberta **SIL Open Font License 1.1 (OFL-1.1)** (zero risco de direito autoral para uso pessoal ou comercial), o carregamento via CDN do Google compartilha o IP do visitante com servidores do Google sem necessidade (risco GDPR/LGPD).
- `public/favicon.svg` utiliza a logo oficial do framework Vite (inclusive como `og:image` e `twitter:image` em `index.html`), `public/icons.svg` contém logos de terceiros não utilizados (X, Discord, Bluesky), e `public/manifest.json` referencia `pwa-192x192.png` e `pwa-512x512.png` inexistentes (erro 404). *(Nota: o ícone "G" em `src/components/AuthModal.jsx` deve ser mantido pois é exigência oficial das diretrizes de marca do Google Identity / OAuth).*

**Correção Técnica:**
1. **Componente/Modal `LegalModal.jsx` ("Sobre, Privacidade & Termos" — estilo `anime.plus` / `notify.moe` / `LiveChart.me`)**:
   - Link discreto no rodapé de `LoginScreen.jsx` e `Dashboard.jsx`, além de acesso via `AuthModal.jsx` e `SettingsPage.jsx`, internacionalizado (`pt-BR`, `en`, `ja`).
   - Estrutura enxuta em 4 blocos:
     - **Sobre & Direitos Autorais:** Ferramenta independente e gratuita; atribuição a AniList, Kitsu e MyAnimeList; disclaimer de não-afiliação a serviços de streaming; uso informativo de capas/sinopses.
     - **Privacidade & Dados:** Coleta restrita a listas públicas (com filtro +18 ativo); cache local (`localStorage`/`IndexedDB`) para funcionamento offline; sincronização opcional na nuvem apenas de contas vinculadas; transferência internacional para infraestrutura nos EUA (GitHub Pages, Supabase, Google OAuth) sob Cláusulas-Padrão Contratuais (SCCs/DPA); zero venda de dados ou cookies de anúncios.
     - **Termos & Idade Mínima:** Serviço fornecido *as is*; exigência de **16 anos ou mais** para criação de conta na nuvem.
     - **Contato & Código-Fonte:** Canal de contato para solicitações LGPD/GDPR ou remoção autoral (DMCA) e link para o repositório GitHub.
2. **Adequações no `AuthModal.jsx` e Textos (`src/locales/*.json`)**:
   - Na aba "Criar Conta": adicionar checkbox obrigatório (desmarcado por padrão) *"Declaro ter 16 anos ou mais e concordo com os Termos e Política de Privacidade"*.
   - **Registro de Aceite no Banco (LGPD Art. 8º, § 2º):** ao chamar `supabaseClient.auth.signUp`, enviar `options: { data: { accepted_terms_at: new Date().toISOString(), terms_version: '1.0' } }` para gravar o timestamp do consentimento em `auth.users.raw_user_meta_data`.
   - Na aba "Entrar": adicionar link/fluxo *"Esqueci minha senha"* via `supabaseClient.auth.resetPasswordForEmail`.
   - Atualizar `auth.sync_desc` nos 3 idiomas para *"Sincronize suas preferências e contas vinculadas na nuvem"*.
3. **Fontes e Ícones Locais com Licença Segura (`index.html`, `public/`, `package.json`)**:
   - **Fontes:** Remover `<link href="https://fonts.googleapis.com/..." />` e `fonts.gstatic.com` de `index.html` e hospedar a `Inter` localmente via pacote `@fontsource/inter` (licença aberta **SIL OFL-1.1**, 100% livre e sem requisições externas ao Google) ou usar stack de fontes nativas do sistema (`system-ui, -apple-system, sans-serif`).
   - **Ícones e Manifesto PWA:**
     - Substituir `public/favicon.svg` (logo do Vite) por ícone autoral próprio do AniMatch.
     - Corrigir os ícones quebrados (404) em `public/manifest.json` (`pwa-192x192.png` / `pwa-512x512.png` ou apontar para o novo SVG autoral).
     - Remover `public/icons.svg` não utilizado.
     - Manter o SVG oficial do Google apenas no botão `"Continuar com Google"` (`src/components/AuthModal.jsx`), conforme exigido pelo guia de marca do Google OAuth.

---

### [x] Fase 5 (L5) — Acessibilidade Digital (LBI — Lei 13.146/2015 & WCAG 2.2 Nível AA) (#34)

**Referência Legal:** Lei Brasileira de Inclusão da Pessoa com Deficiência (Lei 13.146/2015 — Art. 63) e diretrizes internacionais **WCAG 2.2 Nível AA**.

**Problema no Código:**
1. **Elementos clicáveis inacessíveis por teclado (WCAG 2.1.1):**
   - `src/components/TasteProfile.jsx` (linhas 33–42): tags de gênero usam `<span onClick={...}>` sem `tabIndex={0}`, `role="button"` ou suporte às teclas `Enter`/`Space`.
   - `src/components/StatisticsView.jsx` (linhas 145–150): cabeçalhos de ordenação `<th onClick={() => toggleSort(...)} role="button">` não possuem `tabIndex={0}` nem handler `onKeyDown` (`Enter`/`Space`), impedindo ordenar a tabela pelo teclado.
2. **Modais sem Focus Trap e sem restauração de foco (WCAG 2.4.3):**
   - Os 6 modais (`AuthModal.jsx`, `AnimeDetailModal.jsx`, `DecisionModal.jsx`, `WrappedModal.jsx`, `GenreOriginModal.jsx` e `GenreRecommendationModal.jsx`) fecham com `Escape`, mas permitem que o foco da tecla `Tab` escape para a página de fundo enquanto abertos e não devolvem o foco ao botão que abriu o modal ao fechar.
3. **Alternativa de texto em `<canvas>` e emojis decorativos (WCAG 1.1.1):**
   - `src/components/WrappedModal.jsx` (linhas 168–173): o elemento `<canvas>` do resumo anual não possui `role="img"` nem `aria-label` descritivo para leitores de tela.
   - Emojis decorativos (`👤`, `☁️`, `⏳`) em `LoginScreen.jsx`, `SettingsPage.jsx` e `ExportSnapshotButton.jsx` não têm `aria-hidden="true"`.
4. **Contraste no rodapé do card Wrapped e i18n (WCAG 1.4.3):**
   - `src/logic/wrappedGenerator.js` (linha 490): texto de rodapé `13px` usa `#64748b` sobre `#1e1b4b` (~3.6:1, abaixo do mínimo de 4.5:1 para texto normal).
   - `src/components/ExportSnapshotButton.jsx` (linhas 52–53): rótulos de exportação hardcoded em PT-BR fora dos arquivos `src/locales/*.json`.

**Correção Técnica:**
1. Converter `<span onClick>` em `<button type="button">` em `src/components/TasteProfile.jsx`.
2. Adicionar `tabIndex={0}`, `onKeyDown` (`Enter`/`Space`) e `aria-sort` nos `<th>` ordenáveis de `src/components/StatisticsView.jsx`.
3. Criar hook reutilizável `useModalFocusTrap(isOpen, modalRef, onClose)` para prender `Tab`/`Shift+Tab` dentro dos 6 modais e devolver o foco ao elemento acionador ao fechar.
4. Adicionar `role="img"` e `aria-label` dinâmico no `<canvas>` de `src/components/WrappedModal.jsx` e `aria-hidden="true"` nos emojis decorativos.
5. Ajustar a cor secundária do rodapé em `src/logic/wrappedGenerator.js` de `#64748b` para `#94a3b8` (contraste > 5.8:1) e internacionalizar `src/components/ExportSnapshotButton.jsx`.

---

## 3. Resumo de Execução

| Ordem | Issue | Código | Fase / Entrega | Prioridade | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **#27** | **L1** | Filtro +18 / Safe Mode nos 3 providers (`mal-proxy`, `anilist`, `kitsu`) | 🔥 Crítica | ✅ Concluído |
| **2** | **#28** | **L2** | Sincronização em nuvem só com confirmação de conta própria | 🔥 Alta | ✅ Concluído |
| **3** | **#29** | **L3** | Exclusão na nuvem (RLS `DELETE` + RPC `delete_own_account`) e limpeza local | 🔥 Crítica | ✅ Concluído |
| **4** | **#30** | **L4** | Modal Sobre/Privacidade/Termos, Consentimento 16+ (`accepted_terms_at`), Reset de Senha e Fonte/Ícones locais | 🟡 Alta | ✅ Concluído |
| **5** | **#34** | **L5** | Acessibilidade Digital (LBI / WCAG 2.2 AA), Teclado, Focus Trap em Modais e Contraste | 🟡 Alta | ✅ Concluído |
