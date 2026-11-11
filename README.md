# AniMatch

Uma aplicação web inteligente que analisa a sua lista do AniList para gerar recomendações personalizadas de animes usando um algoritmo baseado em gostos, popularidade e avaliação da comunidade.

## Funcionalidades Principais

- **Integração com AniList**: Basta inserir seu nome de usuário do AniList, sem necessidade de senhas ou autenticação complexa.
- **Perfil de Gosto (Taste Profile)**: O sistema analisa suas notas dadas aos animes concluídos e calcula o quão bem você avalia cada gênero.
- **Média Bayesiana**: Utiliza um cálculo Bayesiano para nivelar gêneros que você assistiu pouco em relação aos que você assiste muito.
- **Recomendações Inteligentes**: Compara a sua lista de "Plan to Watch" (Planejando Assistir) com o seu Perfil de Gosto para prever a nota que você daria a cada obra.
- **Onde Assistir**: Mostra diretamente nos cards em quais plataformas de streaming (Crunchyroll, Netflix, etc.) o anime está disponível.
- **Dashboard Estatístico**: Acompanhe o total de animes assistidos, dias de sua vida gastos vendo anime, distribuição de notas, formatos e status da sua coleção.

## Como o Algoritmo Funciona

1. **Coleta de Dados**: O app busca todos os seus animes concluídos e pontuados.
2. **Cálculo por Gênero**: Para cada gênero, ele calcula sua nota média.
3. **Cálculo Bayesiano**: Se você viu apenas 1 anime de "Mecha" e deu 10, a nota sofre um reajuste (peso) em direção à sua média geral para evitar distorções (C = 15).
4. **Predição**: Nos animes da sua lista de planejamento, o sistema cruza os gêneros do anime com suas médias Bayesianas. A nota prevista é a média simples do seu gosto pelos gêneros daquela obra.

## Como Executar Localmente

### Pré-requisitos
- Node.js (v16 ou superior)
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/wagnergsantos/animatch.git
```

2. Acesse a pasta do projeto:
```bash
cd animatch
```

3. Instale as dependências:
```bash
npm install
```

4. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```
Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com as credenciais do seu projeto Supabase.

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Abra o navegador em `http://localhost:5173`.

## Infraestrutura & Supabase

### 1. Migrations e Banco de Dados (RLS)
O projeto utiliza Supabase com Row Level Security (RLS) para isolamento estrito de dados entre usuários.
Para rodar localmente com o Supabase CLI:
```bash
# Iniciar stack local do Supabase
supabase start

# Aplicar migrations pendentes
supabase db push
```

As migrations criam as tabelas `public.user_settings`, `public.user_anime_lists`, as políticas de segurança RLS (leitura/escrita/deleção restritas ao próprio `auth.uid()`) e a RPC `delete_own_account()`.

### 2. Edge Function `mal-proxy` (MyAnimeList)
A integração com o MyAnimeList requer Client ID gerenciado no backend para evitar exposição de chaves no cliente e contornar restrições de CORS:
```bash
# Configurar secret local da function
cp supabase/functions/.env.example supabase/functions/.env
# Preencher MAL_CLIENT_ID com sua chave da API do MyAnimeList

# Deploy da function em produção
supabase functions deploy mal-proxy
supabase secrets set MAL_CLIENT_ID=sua_chave_aqui
```

### 3. Deploy Contínuo e Segurança (CI/CD)
O deploy para o GitHub Pages ocorre via GitHub Actions (`.github/workflows/ci.yml`).
Configure os seguintes **Repository Secrets** no GitHub:
- `VITE_SUPABASE_URL`: URL pública do projeto Supabase (`https://<project-ref>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Chave pública `anon` do Supabase

> **Nota de Segurança:** O job de deploy falha automaticamente se essas variáveis não estiverem configuradas, impedindo builds de produção com credenciais vazias ou placeholders. Chaves secretas (`service_role` ou `sb_secret_`) são expressamente bloqueadas pelo cliente web (`src/supabase.js`).

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor Vite para desenvolvimento com hot-reload.
- `npm run build`: Cria a versão otimizada de produção na pasta `dist`.
- `npm run preview`: Inicia um servidor local para visualizar a versão de produção.
- `npm run test`: Roda os testes unitários da aplicação utilizando o Vitest.
- `npm run lint`: Analisa o código com o ESLint para garantir a qualidade.

## Tecnologias Utilizadas
- **React (com Hooks)**
- **Vite**
- **AniList GraphQL API**
- **Vitest & React Testing Library** (Testes)
- **CSS Vanilla** (CSS Variables, Flexbox, Grid)
