# Nome do Projeto (a definir)

Uma aplicação web inteligente que analisa a sua lista do AniList para gerar recomendações personalizadas de animes usando um algoritmo baseado em gostos, popularidade e avaliação da comunidade.

## Funcionalidades Principais

- **Integração com AniList**: Basta inserir seu nome de usuário do AniList, sem necessidade de senhas ou autenticação complexa.
- **Perfil de Gosto (Taste Profile)**: O sistema analisa suas notas dadas aos animes concluídos e calcula o quão bem você avalia cada gênero.
- **Média Bayesiana**: Utiliza um cálculo Bayesiano para nivelar gêneros que você assistiu pouco em relação aos que você assiste muito.
- **Recomendações Inteligentes**: Compara a sua lista de "Plan to Watch" (Planejando Assistir) com o seu Perfil de Gosto para prever a nota que você daria a cada obra.
- **Onde Assistir & Dublagem**: Mostra diretamente nos cards em quais plataformas de streaming (Crunchyroll, Netflix, etc.) o anime está disponível e verifica se ele possui dubladores brasileiros listados no AniList (Dublagem PT-BR).
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
git clone https://github.com/seu-usuario/nome-do-projeto.git
```

2. Acesse a pasta do projeto:
```bash
cd nome-do-projeto
```

3. Instale as dependências:
```bash
npm install
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

5. Abra o navegador na porta indicada (normalmente `http://localhost:5173`).

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
