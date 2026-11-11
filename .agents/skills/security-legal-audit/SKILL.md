---
name: security-legal-audit
description: >-
  Auditoria completa de Seguranca da Informacao (.env, segredos, 5 portas abertas,
  RLS, CORS, CSP, SSRF), Conformidade Legal no Brasil e Europa (LGPD, GDPR, Marco
  Civil, CDC, Decreto 7.962/2013, Direitos Autorais LDA, Marcas LPI, Protecao de
  Menores ECA / ECA Digital Lei 15.211/2025) e Acessibilidade Digital (LBI Lei
  13.146/2015 / WCAG 2.2 AA) para projetos Web, Mobile e SaaS. Use quando o
  usuario pedir auditoria de seguranca, revisao legal/LGPD, checklist SaaS,
  varredura de chaves expostas ou revisao pre-lancamento.
---

# Auditoria de Seguranca, Conformidade Legal (Brasil/SaaS) e Acessibilidade

## Objetivo
Executar uma auditoria tecnica e juridica rigorosa em projetos Web, Mobile ou SaaS **sem alterar nenhum arquivo na etapa de diagnostico**, entregando um relatorio estruturado com evidencias exatas no codigo (`arquivo:linha`), classificacao de status, separacao entre fatos e duvidas juridicas para advogado e plano de correcao priorizado.

---

## Quando usar
- "auditoria de seguranca", "varrer chaves expostas", "5 portas abertas", "verificar .env"
- "revisao legal", "conformidade LGPD", "checklist SaaS", "direito autoral", "propaganda enganosa"
- "problemas no Brasil", "protecao de menores / ECA", "acessibilidade WCAG / LBI"
- "auditar projeto antes de lancar / publicar"

---

## Modos de execucao (parametro opcional)
| Modo | Gatilhos | Comportamento |
|---|---|---|
| `full` (padrao) | ausencia de parametro, "auditoria completa", "checklist completo" | Executa a Etapa 0 (Mapeamento) + todas as 5 Secoes + Fechamento em 3 blocos. |
| `security` | "so seguranca", "chaves e portas abertas" | Executa apenas as Secoes 1 (Segredos/.env) e 2 (5 Portas Abertas). |
| `legal` | "so legal", "LGPD e direito autoral", "checklist SaaS" | Executa a Etapa 0 + Secoes 3 (Autoral/CDC), 4 (LGPD/SaaS/ECA) e 5 (Acessibilidade LBI/WCAG). |

---

## Regras Obrigatorias de Execucao (NUNCA VIOLAR)

1. **Somente Leitura na Auditoria:** Nao altere nenhum arquivo de codigo na etapa de auditoria. Apenas analise e relate. Espere o usuario aprovar o plano antes de editar codigo.
2. **Nao presuma:** So marque `OK` se tiver encontrado a evidencia real no codigo, no conteudo ou na configuracao.
3. **Compare textos legais com o codigo:** Se a Politica de Privacidade ou Termos dizem uma coisa e o codigo faz outra, marque como `Problema`.
4. **Paineis externos:** Se um item depender de algo fora do repositorio (painel do Supabase, Google Cloud Console, Google Analytics, Tag Manager, Stripe/Mercado Pago, contratos), marque `Nao foi possivel verificar` e diga **exatamente o caminho do menu onde o usuario deve olhar e o que conferir**.
5. **Nao invente dados:** Nao invente razao social, CNPJ, endereco, numeros ou depoimentos. Se faltar informacao, pergunte ao usuario.
6. **Rascunho juridico:** Se sugerir texto legal (Politica de Privacidade, Termos de Uso, Disclaimer), marque claramente como *rascunho para revisao de um advogado*.

---

## Passo 1 — Coleta Automatizada de Evidencias (Comandos Base)

Antes de redigir o relatorio, execute buscas rapidas no repositorio para levantar fatos:

1. **Arquivos `.env` ou segredos rastreados no Git e no historico:**
   ```bash
   git ls-files | grep -E '\.env|secret|token|key'
   git log --all --full-history --stat -- "**/.env*" ".env*"
   ```
2. **Variaveis expostas no bundle do navegador (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`):**
   ```bash
   grep -rnE "VITE_|NEXT_PUBLIC_|PUBLIC_|sb_secret_|service_role" src/
   ```
3. **Politicas RLS (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) e constraints nas migrations:**
   ```bash
   grep -rnE "enable row level security|create policy|references auth\.users" supabase/migrations/ prisma/
   ```
4. **Chamadas externas, Fontes CDN e Scripts de Rastreamento/Pixels:**
   ```bash
   grep -rnE "https?://|fonts\.googleapis|gtag|fbq|clarity|hotjar|ttq|linkedin" index.html src/ public/
   ```
5. **Acessibilidade de teclado e elementos clicaveis nao-nativos:**
   ```bash
   grep -rnE "<(span|div|th|td|li)[^>]*onClick|<canvas" src/
   ```

---

## Passo 2 — Estrutura do Relatorio

### ETAPA 0: Mapeamento Previo do Projeto
Apresente um resumo executivo com:
- **O que o servico faz e modelo de cobranca:** gratuito, assinatura (SaaS), compra unica ou teste gratis.
- **Paginas/telas publicas e formularios:** quais rotas existem e quais campos cada formulario coleta.
- **Onde os dados ficam guardados:** navegador (`localStorage`, `IndexedDB`, cookies) e nuvem (banco de dados, tabelas e **regiao/pais do servidor**, ex.: `sa-east-1`).
- **Mapa de terceiros que recebem dados:** hospedagem, auth/banco, analytics, pixels, gateway de pagamento, fontes/CDNs, e-mail, chat, IA, CRM e APIs externas.

---

### Padrao de Resposta por Item (Secoes 1 a 5)
Para **cada item** abaixo, responda obrigatoriamente com os 4 campos:
- **Status:** `OK` | `Problema` | `Nao se aplica` | `Nao foi possivel verificar`
- **Evidencia:** link clicavel para o arquivo e linha exata (`[arquivo](file:///...#L10-L20)`), pagina ou configuracao analisada
- **Risco:** o que pode acontecer (em portugues simples, tecnico e juridico) se nao for corrigido
- **Correcao:** o que precisa mudar (ou alternativa segura e com licenca aberta)

---

### SECAO 1: Segredos, Variaveis `.env` e Historico do Git
- **1.1 Chaves no codigo:** Chaves de API, senhas, tokens JWT ou URLs privadas escritas direto no codigo, scripts ou arquivos temporarios.
- **1.2 `.gitignore` vs. Arquivos ja rastreados:** Todos os `.env*` (exceto `.env.example`) estao no `.gitignore` e fora de `git ls-files`?
- **1.3 Variaveis publicas no navegador (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`):** Alguma variavel publica carrega chave secreta (`service_role`, `sb_secret_`, secret key)? Ha trava no codigo impedindo o uso de secret key no browser?
- **1.4 Historico do Git (`git log`):** Algum arquivo `.env` ou chave real ja foi comitado no passado?
- **1.5 Template `.env.example`:** Existe e contem apenas os nomes das variaveis vazias (sem valores reais)?

### SECAO 2: As 5 Portas Abertas de Seguranca
- **2.1 Chave de API de terceiros no cliente:** Chamadas a APIs privadas passam por backend/Edge Function ou expoem credenciais no navegador?
- **2.2 Tabelas sem RLS ou sem limites:** Todas as tabelas possuem RLS para `SELECT`, `INSERT`, `UPDATE` e `DELETE`? Ha constraints `CHECK` limitando o tamanho de colunas `jsonb`/`text` contra abuso de armazenamento?
- **2.3 Servidor / Edge Functions sem firewall:** CORS restrito ao dominio oficial (sem `*` aberto)? Rate-limit por IP? Loops de paginacao (`while`) com teto `MAX_PAGES`? `Content-Security-Policy` (CSP) e `Referrer-Policy` configurados?
- **2.4 Consultas sem parametro / SSRF / Links inseguros:** Parametros de entrada validados com regex/tamanho? URLs de paginacao externa validam host/protocolo contra SSRF? Links externos validam `http/https` (contra `javascript:`) e usam `rel="noopener noreferrer"`?
- **2.5 Configuracao de teste no ar:** O CI/CD falha se faltar variavel de producao (sem fallback silencioso para `localhost`/`placeholder`)? Confirmacao de e-mail e tamanho minimo de senha (8+ caracteres) ativos no Auth?

### SECAO 3: Direito Autoral, Marcas e Propaganda Enganosa (LDA, LPI e CDC)
- **3.1 Imagens, Videos, Musicas e Textos:** Licenca comprovada? Exibicao via CDN oficial ou redistribuicao em `<canvas>`/PNG (risco autoral e CORS taint)? Atribuicao de fonte e canal DMCA?
- **3.2 Fontes e Icones:** Licenca das fontes (ex.: SIL OFL-1.1)? Fontes hospedadas localmente (`@fontsource`) em vez de enviar o IP do visitante ao Google Fonts CDN? Icones proprios (sem logo herdado do Vite/Next/Vercel no `favicon` ou 404 no `manifest.json`)?
- **3.3 Logos de outras empresas e Selos "Visto em":** Uso de logos de terceiros (streaming, OAuth, clientes, imprensa) possui autorizacao/diretriz oficial e disclaimer de nao-afiliacao?
- **3.4 Depoimentos, Numeros e Avaliacoes:** Existem depoimentos ficticios, logos de clientes, contadores de usuarios ou avaliacoes sem origem comprovada?
- **3.5 Promessas sem comprovacao (CDC Art. 37):** Ha promessas absolutas ou sem comprovacao ("100% seguro", "resultados garantidos", "o melhor do Brasil", "aumente suas vendas em 300%")?

### SECAO 4: Privacidade, SaaS, Consumidor e Protecao de Menores (LGPD, Marco Civil, CDC, Decreto 7.962/13 e ECA)
- **4.1 Politica de Privacidade publicada e coerente com o codigo:** Acessivel em todas as paginas e fiel ao que o codigo realmente coleta e compartilha?
- **4.2 Termos de Uso e Registro do Aceite no Cadastro:** Termos publicados (regras, cobranca, renovacao, cancelamento, limitacao de responsabilidade) e aceite gravando timestamp/versao (`accepted_terms_at`, `terms_version`) no banco (LGPD Art. 8º §2º)?
- **4.3 Formularios e Coleta Minima (LGPD Art. 6º III e Art. 8º):** Finalidade clara em cada campo, link para a Politica, zero checkbox pre-marcado e trava contra salvar dados publicos de terceiros na nuvem sem confirmacao de titularidade?
- **4.4 Direitos do Titular e Exclusao Real (LGPD Art. 18 / GDPR Art. 17):** Exportacao de dados, correcao/reset de senha, exclusao real da conta na nuvem (`DELETE` + `ON DELETE CASCADE` + RPC), limpeza total de `localStorage`/`IndexedDB` no logout e informacao sobre backups/terceiros?
- **4.5 Cookies, Analytics e Scripts de Rastreamento:** Banner bloqueando scripts nao essenciais antes do aceite (com botao "Recusar" equivalente ao "Aceitar")? Google Analytics com *Consent Mode* e sem PII em URLs/eventos? Pixels (Meta, TikTok, Hotjar, Clarity, LinkedIn) carregando so apos consentimento?
- **4.6 Integracoes e Transferencia Internacional (LGPD Arts. 9º e 33):** Quais dados cada terceiro recebe, pais/regiao onde guarda e mencao explicita na Politica?
- **4.7 Dados da Empresa, Reembolso e Cancelamento (Decreto 7.962/13 e CDC Art. 49):**
  - Identificacao do controlador e canal de contato visiveis (obrigatorio pela LGPD ate para apps gratuitos).
  - *(Se houver cobranca/SaaS pago)* Razao social, CNPJ/CPF, endereco fisico, preco total com taxas, direito de arrependimento de 7 dias e cancelamento tao simples quanto a contratacao.
- **4.8 Criancas, Adolescentes e Conteudo +18 (ECA, ECA Digital Lei 15.211/25 e LGPD Art. 14):** Filtro `+18 / Safe Mode / NSFW` ativo por padrao nos providers/APIs e declaracao de idade minima (16+ ou 18+) no cadastro?

### SECAO 5: Acessibilidade Digital (Lei Brasileira de Inclusao — Lei 13.146/2015 & WCAG 2.2 Nivel AA)
- **5.1 Texto alternativo em imagens e `<canvas>` (WCAG 1.1.1):** `alt` descritivo em imagens de conteudo, `role="img"` + `aria-label` em `<canvas>`, e `alt=""` ou `aria-hidden="true"` em elementos/emojis decorativos.
- **5.2 Contraste minimo (WCAG 1.4.3 / 1.4.11):** Minimo de `4.5:1` para texto normal e `3:1` para texto grande, componentes de UI e textos em `<canvas>`.
- **5.3 Navegacao completa por teclado e Focus Trap (WCAG 2.1.1 / 2.1.2 / 2.4.3 / 2.4.7):** Zero `<span onClick>`, `<div onClick>` ou `<th onClick>` sem `tabIndex={0}` e `onKeyDown` (`Enter`/`Space`); `:focus-visible` nitido; *Focus Trap* prendendo `Tab` dentro de modais abertos e devolvendo o foco ao fechar.
- **5.4 Botoes, links e formularios com nome acessivel (WCAG 2.4.4 / 4.1.2):** Rótulos claros e `aria-label` internacionalizado em botoes de icone (`✕`, tema, acoes).

---

## Passo 3 — Formato de Fechamento do Relatorio (Obrigatorio ao Final)

Ao concluir as 5 secoes, apresente sempre estes **3 blocos separados**:

### 1. FATOS CONFIRMADOS NO CODIGO (Por Ordem de Gravidade)
Agrupe todos os problemas encontrados em:
- **Critico** (vazamento de segredos, falta de RLS/exclusao LGPD, exposicao de +18 para menores)
- **Alto** (CORS/firewall aberto, falta de Politica/Termos/Aceite, coleta sem consentimento, bloqueios severos de teclado/Focus Trap)
- **Medio** (fontes remotas enviando IP, falta de disclaimer de marcas/autoral, CSP/Referrer-Policy)
- **Baixo** (ajustes finos de `aria-hidden`, contraste pontual, i18n)

### 2. DUVIDAS PARA LEVAR AO ADVOGADO (Separacao Fato vs. Interpretacao Juridica)
Separe tudo o que depende de interpretacao juridica ou decisao societaria/contratual em formato de **perguntas diretas prontas para o usuario enviar a um advogado** (ex.: enquadramento de base legal na LGPD, dispensa de DPO/Encarregado para pequeno porte, limites de *fair use*/uso informativo de midias de terceiros, clausulas de limitacao de responsabilidade, exigencias societarias/CNAE).

### 3. PLANO DE CORRECAO PROPOSTO
Proponha uma sequencia logica de implementacao dividida em fases (Seguranca -> Legal/Privacidade -> Acessibilidade) e **aguarde a aprovacao explicita do usuario antes de alterar qualquer arquivo**.
