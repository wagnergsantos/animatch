# Especificação Técnica — Redesign das Configurações: Página Dedicada (`SettingsPage`)

**Data:** 13/10/2026  
**Status:** Aprovado  

---

## 1. Contexto & Problema

O menu de configurações (`SettingsMenu.jsx`) acumulou múltiplas responsabilidades:
- Autenticação e sincronização na nuvem (Supabase Auth).
- Contas vinculadas de provedores (AniList, Kitsu, MyAnimeList).
- Preferências de tema, idioma e formato de títulos.
- Seleção de múltiplos serviços de streaming e boost de pontuação.
- Ações de recarregamento e logout da lista.

Tudo isso estava concentrado em um dropdown suspenso estreito (`.settings-menu__panel`) com textos comprimidos e barra de rolagem vertical restrita, prejudicando a usabilidade e a hierarquia visual.

---

## 2. Solução: Página Dedicada de Configurações

Substituir o menu suspenso por uma aba dedicada de primeiro nível no `Dashboard`:
- Navegação no cabeçalho: `[Recomendações] [Estatísticas] [Configurações]`.
- Novo componente: `src/components/SettingsPage.jsx` e `src/components/SettingsPage.module.css`.
- Remoção do trigger flutuante de engrenagem ⚙️ do header em favor da aba direta.

---

## 3. Estrutura Visual & Seções

O layout usará um contêiner centralizado (`max-width: 820px`) com cartões visuais bem espaçados (`gap: var(--space-6)`):

### 3.1. Seção 1: Conta AniMatch & Sincronização em Nuvem
- **Não autenticado**:
  - Banner explicativo sobre sincronização multi-dispositivo.
  - Botão de destaque `[Entrar / Criar Conta]` acionando `AuthModal`.
- **Autenticado**:
  - Avatar, email do usuário e badge com status em tempo real (`Sincronizado`, `Sincronizando`, `Offline`, `Erro`).
  - Botão de logout da conta Supabase.

### 3.2. Seção 2: Contas Vinculadas (Multi-Provider)
- Cards/campos claros com labels explicativos e placeholders:
  - AniList (`@username`)
  - Kitsu (`@username`)
  - MyAnimeList (`@username`)
- Persistência e feedback de alteração integrados com `useUserSettings`.

### 3.3. Seção 3: Streaming & Disponibilidade
- Grade de botões/chips dos serviços suportados (`Crunchyroll`, `Netflix`, `Prime Video`, `Disney+`, `Max`, `HIDIVE`).
- Toggle/checkbox espaçado para o boost de +0.3 pontos para animes disponíveis nas assinaturas.

### 3.4. Seção 4: Preferências de Interface
- **Tema**: Botões de alternância direta com ícones (`☀️ Claro` / `🌙 Escuro`).
- **Idioma**: Seletor visual em botões (`Português`, `English`, `日本語`).
- **Títulos dos Animes**: Seletor de preferência (`Inglês`, `Romaji`, `Nativo`).

### 3.5. Seção 5: Dados da Lista
- Botão para recarregar lista do provedor atual (`onRefresh`) com indicador de carregamento.
- Botão para desconectar do usuário atual e retornar à tela inicial (`onLogout`).

---

## 4. Testes & Compatibilidade

- Criar `src/components/SettingsPage.test.jsx` cobrindo todas as seções e interações.
- Atualizar `src/components/Dashboard.jsx` e `src/components/Dashboard.test.jsx` para refletir a nova aba e remover `SettingsMenu`.
- Manter total conformidade com `i18n` em `pt-BR`, `en`, `ja`.
