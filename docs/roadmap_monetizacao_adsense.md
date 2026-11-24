# Roadmap — Monetização com Google AdSense, Conteúdo e Consentimento

**Repositório:** wagnergsantos/animatch  
**Data:** 23/11/2026  
**Objetivo:** Estruturar e adequar o AniMatch para aprovação no Google AdSense, garantindo conformidade com políticas de conteúdo, termos de uso, consentimento de cookies (Consent Mode v2 / LGPD / GDPR) e posicionamento estratégico de anúncios.

---

## 1. O Desafio de Aprovação em Web Apps (Thin Content)

O robô do Google AdSense não interage com caixas de busca nem pesquisa usernames. Ao auditar uma SPA pura vazia, o Google rejeita como *"Conteúdo de baixo valor"* ou *"Site em construção"*.  
**Solução:** Enriquecer a landing page com conteúdo textual estático/explicativo, criar páginas institucionais com URLs públicas diretas e demonstrar valor antes da interação do usuário.

---

## 2. Fases de Execução

### Fase AD1 — Conteúdo Indexável & Rastreabilidade (Preparação para Aprovação)
- [x] **Seções textuais na Landing Page (abaixo da busca)**:
  - **"Como o AniMatch funciona"**: Explicação detalhada do cálculo de afinidade por gêneros, notas normalizadas e ponderação de formato/origem.
  - **FAQ (Perguntas Frequentes)**: 4 perguntas em texto semântico (privacidade de listas, compatibilidade com AniList/Kitsu/MAL, scores).
  - **Demonstração estática / Exemplo visual**: Card de demonstração de recomendação estática para que o crawler veja um exemplo de resultado mesmo sem executar chamadas de API.
- [x] **Desacoplar Páginas Legais do Modal**:
  - Criadas páginas estáticas HTML completas acessíveis por URL direta no `public/`:
    - `public/sobre.html` (Sobre o projeto, metodologia, transparência)
    - `public/termos.html` (Termos de Uso)
    - `public/privacidade.html` (Política de Privacidade)
  - Links institucionais visíveis no rodapé da página inicial.
- [x] **SEO Técnico & Rastreio**:
  - Criar `public/robots.txt` permitindo indexação dos crawlers do Google (`Mediapartners-Google` e `Googlebot`).
  - Criar `public/sitemap.xml` listando as URLs públicas.

---

### Fase AD2 — Adequação Legal Obrigatória (Google + LGPD + GDPR)
- [x] **Atualização da Política de Privacidade**:
  - Declarar veiculação de anúncios por terceiros (Google).
  - Explicar uso de cookies DoubleClick / Google Ads para personalização com base em visitas anteriores.
  - Incluir link obrigatório do Google: *[Como o Google usa dados ao usar sites de parceiros](https://policies.google.com/technologies/partner-sites)*.
  - Incluir links de opt-out: [Google Ads Settings](https://adssettings.google.com) e [aboutads.info](https://www.aboutads.info).
- [x] **Atualização dos Termos de Uso**:
  - Cláusula de isenção de responsabilidade sobre produtos, serviços ou links veiculados nos anúncios de terceiros.

---

### Fase AD3 — Gestão de Consentimento & Banner de Cookies (CMP)
- [ ] **Integração de CMP Certificada (Google Consent Mode v2)**:
  - Ativar o recurso nativo de **Privacidade e Mensagens** do painel do AdSense (gratuito e integrado) OU integrar CMP open-source (Klaro / Cookiebot).
  - Implementar suporte ao Consent Mode v2 (`ad_storage`, `ad_user_data`, `ad_personalization`).
- [ ] **Controle de Bloqueio**:
  - Bloquear scripts de publicidade até o consentimento explícito em regiões com exigência legal (EEA/UK/LGPD).
- [ ] **Link de Revogação**:
  - Adicionar botão fixo no rodapé: *"Gerenciar preferências de cookies"*.

---

### Fase AD4 — Configurações Técnicas Web
- [ ] **Arquivo `public/ads.txt`**:
  - Criar o arquivo na raiz pública contendo seu identificador de publisher:
    ```text
    google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
    ```
- [ ] **Atualizar Content Security Policy (`index.html`)**:
  - Adicionar permissões do Google Ads na meta tag CSP:
    - `script-src`: `https://pagead2.googlesyndication.com` `https://adservice.google.com` `https://ep2.adtrafficquality.google`
    - `frame-src`: `https://googleads.g.doubleclick.net` `https://pagead2.googlesyndication.com`
    - `img-src`: `https://pagead2.googlesyndication.com`
    - `connect-src`: `https://pagead2.googlesyndication.com`
- [ ] **Inserir Snippet de Verificação**:
  - Colocar o `<script async src="...pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-..." crossorigin="anonymous"></script>` no `<head>`.

---

### Fase AD5 — Posicionamento de Anúncios no App (Pós-Aprovação)
- [ ] **Posicionamento sem poluir a UX**:
  - **Banner Superior (Leaderboard)**: Topo do Dashboard de resultados (discreto).
  - **In-feed nativo**: 1 bloco de anúncio estilizado entre as linhas de animes recomendados.
  - **Lateral (Desktop)**: Bloco vertical na lateral da tela de estatísticas/recomendações.
- [ ] **Proteção de Usabilidade**:
  - Zero pop-ups invasivos ou anúncios cobrindo botões de ação e modais de detalhes.
  - Layout shifts (CLS) controlados: reservar altura fixa (`min-height`) nos containers de anúncios para evitar saltos de tela ao carregar o anúncio.

---

### Fase AD6 — Otimização de Conversão e Arquitetura da Landing Page (Pós-Analytics)
- [ ] **Mover o formulário para logo abaixo do hero** (Hero → Formulário → Como funciona → Exemplo → FAQ):
  - *Condição de disparo*: Reavaliar hierarquia somente após termos dados consolidados de analytics (se poucos visitantes descerem a página até a área de busca).
  - *Métricas a mensurar antes*:
    - Taxa de cliques no CTA do hero ("Experimentar agora ↓").
    - Taxa de visitantes que atingem a seção do formulário (scroll depth / visualizações do input).
    - Total de buscas / recomendações geradas vs. visitantes totais.
