# Checklist & Prompt de Auditoria — Segurança, Direito Autoral, LGPD, CDC, ECA & Acessibilidade

**Objetivo:** Guia reutilizável para auditar aplicações web/mobile/SaaS antes de publicação ou revisão de segurança e conformidade legal (Brasil + padrão europeu GDPR + WCAG 2.2 AA).
**Status:** Versão 2.0 (consolidando Segurança, Direito Autoral, LGPD/GDPR, E-commerce/SaaS, ECA e Acessibilidade LBI/WCAG — pronta para conversão em Skill).

---

## 1. Prompt Unificado (Pronto para Copiar e Colar)

```markdown
Faça uma auditoria completa de Segurança da Informação, Conformidade Legal no Brasil (LGPD, Marco Civil, CDC, Decreto 7.962/2013, LDA, LPI, ECA/ECA Digital) e Acessibilidade (LBI / WCAG 2.2 AA) neste projeto.
Nesta etapa, SÓ ANALISE E RELATE: não altere nenhum arquivo.

### ETAPA 0: Mapeamento Prévio do Projeto
Antes de verificar a lista, mapeie rapidamente o projeto:
1. O que o serviço faz e como funciona a cobrança (gratuito, assinatura, compra única, teste grátis).
2. Quais páginas/telas públicas existem e quais formulários coletam dados.
3. Onde os dados ficam guardados (navegador `localStorage`/`IndexedDB`, banco de dados, região/país do servidor).
4. Quais serviços de terceiros recebem dados dos usuários (analytics, pixels, pagamento, autenticação, banco/BaaS, fontes/CDNs, e-mail, chat, IA, CRM, APIs externas).

Depois, verifique cada item das 5 seções abaixo.

Para cada item, responda obrigatoriamente com:
- **Status:** `OK`, `Problema`, `Não se aplica` ou `Não foi possível verificar`
- **Evidência:** o arquivo e a linha exata, a página ou a configuração que você analisou
- **Risco:** o que pode acontecer (em português simples, técnico e jurídico) se não for corrigido
- **Correção:** o que precisa mudar (ou alternativa segura e com licença aberta)

---

### SEÇÃO 1: Segredos, Variáveis `.env` e Histórico do Git
- [ ] **1.1 Chaves no código:** Existe alguma chave de API, senha, token JWT ou URL privada escrita direto no código, scripts ou arquivos temporários?
- [ ] **1.2 Regra do `.gitignore` vs. Arquivos já rastreados:** Todos os `.env*` (exceto `.env.example`) estão no `.gitignore`? Rodar `git ls-files` para garantir que nenhum `.env` (ex: `.env.development`) foi comitado antes de entrar no `.gitignore`.
- [ ] **1.3 Variáveis públicas no navegador (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`):** Alguma variável que vai para o navegador carrega chave secreta (ex: `service_role`, `sb_secret_`, chave privada de API)? Há trava no código impedindo isso?
- [ ] **1.4 Histórico do Git (`git log`):** Algum arquivo `.env` ou chave real já foi enviado em commits passados (`git log --all --full-history -- "**/.env*"`)?
- [ ] **1.5 Template limpo:** O `.env.example` contém apenas os nomes das variáveis vazias (sem valores reais ou URLs de teste que confundam o build)?

### SEÇÃO 2: As 5 Portas Abertas de Segurança
- [ ] **2.1 Chave de API de terceiros no cliente:** Chamadas a APIs privadas passam por backend/Edge Function ou expõem credenciais no navegador?
- [ ] **2.2 Tabelas sem RLS ou sem limites:** Todas as tabelas têm Row Level Security (RLS) para `SELECT`, `INSERT`, `UPDATE` e `DELETE`? Há constraints `CHECK` limitando o tamanho de colunas `jsonb`/`text` para evitar que um usuário lote o banco de graça?
- [ ] **2.3 Servidor / Edge Functions sem firewall:** O CORS está aberto com `*` em vez de restrito ao domínio oficial? Há rate-limit por IP? Loops de paginação (`while`) têm limite máximo de páginas (`MAX_PAGES`)? Existe `Content-Security-Policy` (CSP) e `Referrer-Policy`?
- [ ] **2.4 Consultas sem parâmetro / SSRF / Links inseguros:** Há concatenação de strings em SQL/GraphQL/NoSQL? Parâmetros de entrada (IDs, usernames, buscas) são validados com regex/tamanho? URLs de paginação externa e links `<a href>` / `window.open` validam o protocolo (`http/https`) contra `javascript:` e SSRF, e usam `rel="noopener noreferrer"`?
- [ ] **2.5 Configuração de teste no ar:** O pipeline de deploy (CI/CD) falha se faltar variável de produção ou sobe silenciosamente apontando para `localhost`/`placeholder`? Confirmação de e-mail e tamanho mínimo de senha (8+ caracteres) estão ativos na configuração de Auth?

### SEÇÃO 3: Direito Autoral, Marcas e Propaganda Enganosa (LDA, LPI e CDC)
- [ ] **3.1 Imagens, Vídeos, Músicas e Textos:** De onde vêm as mídias e textos do site? Têm licença de uso comprovada? São hospedadas localmente, geradas em Canvas/PNG (risco de redistribuição/CORS taint) ou exibidas via CDN oficial? Há atribuição de fonte e canal de remoção (DMCA)?
- [ ] **3.2 Fontes e Ícones:** Qual a licença das fontes e ícones usados? Existem ícones herdados de templates (ex: logo do Vite/Next/Vercel no `favicon`, ícones quebrados no `manifest.json`)? As fontes são carregadas do Google Fonts remoto (enviando o IP do visitante ao Google) ou hospedadas localmente (ex: `@fontsource`)?
- [ ] **3.3 Logos de outras empresas e Selos "Visto em":** Há uso de logos/nomes de terceiros (streaming, OAuth, clientes, imprensa, parceiros)? Há autorização ou disclaimer claro de não-afiliação no rodapé?
- [ ] **3.4 Depoimentos, Números e Avaliações:** Existem depoimentos fictícios, logos de clientes, contadores de usuários/vendas ou avaliações que não tenham origem real comprovada no código/banco?
- [ ] **3.5 Promessas sem comprovação (CDC Art. 37):** Há promessas absolutas ou sem comprovação (ex: "100% seguro", "resultados garantidos", "o melhor do Brasil", "aumente suas vendas em 300%")?

### SEÇÃO 4: Privacidade, SaaS, Consumidor e Proteção de Menores (LGPD, Marco Civil, CDC, Decreto 7.962/13 e ECA)
- [ ] **4.1 Política de Privacidade publicada e coerente com o código:** Está acessível em todas as páginas? O que o texto diz bate exatamente com o que o código coleta, guarda e compartilha com terceiros?
- [ ] **4.2 Termos de Uso e Registro do Aceite no Cadastro:** Há Termos de Uso publicados (regras de uso, cobrança, renovação, cancelamento e limitação de responsabilidade)? O cadastro exige aceite explícito e grava o timestamp/versão (`accepted_terms_at`, `terms_version`) no banco de dados como prova (LGPD Art. 8º §2º)?
- [ ] **4.3 Formulários e Coleta Mínima (LGPD Art. 6º III e Art. 8º):** Cada campo pedido nos formulários e salvo no banco tem finalidade clara? Os formulários informam a finalidade, têm link para a Política de Privacidade e nenhuma caixa de consentimento vem pré-marcada? Se o usuário consultar dados públicos de terceiros logado, o app evita salvar isso na conta dele sem confirmação?
- [ ] **4.4 Direitos do Titular e Exclusão Real (LGPD Art. 18 / GDPR Art. 17):** O usuário consegue acessar/exportar, corrigir (incluindo redefinir senha) e **excluir de verdade** seus dados e conta no banco (`DELETE` + `ON DELETE CASCADE`), no navegador (`localStorage`/`IndexedDB` limpos no logout), nos backups e nos serviços de terceiros?
- [ ] **4.5 Cookies, Analytics e Scripts de Rastreamento:**
  - Existe banner de consentimento bloqueando cookies/scripts não essenciais antes do aceite, com botão de "Recusar" tão fácil quanto "Aceitar"?
  - O Google Analytics está com *Consent Mode* e sem enviar dados pessoais (e-mail, nome, CPF, username) em eventos ou URLs?
  - Pixels (Meta, TikTok, Hotjar, Clarity, LinkedIn) só carregam após consentimento e estão listados na Política?
- [ ] **4.6 Integrações e Transferência Internacional (LGPD Arts. 9º e 33):** Quais dados cada serviço de terceiro recebe, em qual país/região ele guarda esses dados e isso está informado na Política de Privacidade?
- [ ] **4.7 Dados da Empresa, Reembolso e Cancelamento (Decreto 7.962/13 e CDC Art. 49):**
  - Há canal de atendimento e identificação do responsável/controlador visíveis no site (exigido pela LGPD mesmo em apps gratuitos)?
  - *(Se houver cobrança/SaaS pago)* Exibe razão social, CNPJ/CPF, endereço físico, preço total com taxas, política de reembolso com direito de arrependimento de 7 dias e cancelamento da assinatura tão simples quanto a contratação?
- [ ] **4.8 Crianças, Adolescentes e Conteúdo +18 (ECA, ECA Digital Lei 15.211/25 e LGPD Art. 14):** O app pode exibir conteúdo adulto/NSFW vindo de APIs ou usuários? O filtro `+18 / Safe Mode` vem ligado por padrão? Há declaração de idade mínima (ex: 16+ ou 18+ anos) no cadastro?

### SEÇÃO 5: Acessibilidade Digital (Lei Brasileira de Inclusão — Lei 13.146/2015 & WCAG 2.2 Nível AA)
- [ ] **5.1 Texto alternativo em imagens e `<canvas>` (WCAG 1.1.1):** Todas as imagens com conteúdo e elementos `<canvas>` têm `alt` ou `role="img"` + `aria-label` descritivo, e imagens/ícones/emojis puramente decorativos têm `alt=""` ou `aria-hidden="true"`?
- [ ] **5.2 Contraste mínimo (WCAG 1.4.3 / 1.4.11):** O contraste atinge no mínimo `4.5:1` em textos normais e `3:1` em textos grandes, elementos de interface e gráficos/canvas?
- [ ] **5.3 Navegação completa por teclado e Focus Trap (WCAG 2.1.1 / 2.1.2 / 2.4.3 / 2.4.7):**
  - Todos os elementos interativos são alcançáveis e acionáveis via teclado (`Tab`, `Enter`, `Space`, `Escape`) com `:focus-visible` nítido (sem `<div onClick>`, `<span onClick>` ou `<th onClick>` sem `tabIndex={0}` e `onKeyDown`)?
  - Modais e menus prendem o foco dentro deles enquanto abertos (*Focus Trap*) e devolvem o foco ao botão de origem ao fechar?
- [ ] **5.4 Botões, links e formulários com nome acessível (WCAG 2.4.4 / 4.1.2):** Todos os botões (especialmente os que só têm ícone como `✕` ou tema) e links têm texto claro ou `aria-label` traduzido (nada de "clique aqui" ou botão sem rótulo)?

---

### Regras Obrigatórias da Auditoria:
- **Não presuma:** Só marque `OK` se tiver encontrado a evidência no código, no conteúdo ou na configuração.
- **Compare os textos legais com o código:** Se a política diz uma coisa e o código faz outra, marque como `Problema`.
- **Painéis externos:** Se um item depender de algo que você não consegue ver do repositório (painel do Supabase, Google Cloud Console, Google Analytics, Tag Manager, contrato com fornecedor, gateway de pagamento), marque `Não foi possível verificar` e me diga **exatamente onde eu devo olhar e o que conferir**.
- **Não invente dados:** Não invente dados da empresa, CNPJ, endereço, números ou depoimentos. Se faltar alguma informação, me pergunte.
- **Rascunho jurídico:** Se sugerir um texto legal (Política de Privacidade, Termos de Uso, Disclaimer), marque claramente como *rascunho para revisão de um advogado*.

### Formato de Fechamento do Relatório (Obrigatório ao Final):
Ao final da análise das 5 seções, entregue 3 blocos separados:
1. **FATOS CONFIRMADOS NO CÓDIGO (Por Ordem de Gravidade):** Liste todos os problemas técnicos e legais encontrados em `Crítico`, `Alto`, `Médio` e `Baixo`.
2. **DÚVIDAS PARA LEVAR AO ADVOGADO (Separação Fato vs. Interpretação Jurídica):** Separe tudo o que depende de interpretação jurídica ou decisão societária/contratual (ex.: enquadramento exato da base legal na LGPD, necessidade de DPO/Encarregado, limites de uso informativo/*fair use* de mídias de terceiros, cláusulas de limitação de responsabilidade, regras tributárias/CNAE ou exigências específicas do setor) em formato de perguntas diretas prontas para eu enviar a um advogado.
3. **PLANO DE CORREÇÃO PROPOSTO:** Ordem recomendada de execução das melhorias técnicas.

Não corrija nada ainda. Espere eu aprovar o plano.
```

---

## 2. Comandos Rápidos de Verificação (Para o Agente / Auditor)

Quando este documento for convertido em **Skill**, o agente poderá executar automaticamente:

1. **Verificar `.env` rastreados indevidamente pelo Git:**
   ```bash
   git ls-files | grep -E '\.env|secret|token|key'
   ```
2. **Vasculhar o histórico do Git por `.env` antigos:**
   ```bash
   git log --all --full-history --stat -- "**/.env*" ".env*"
   ```
3. **Buscar variáveis expostas ao cliente (`VITE_`, `NEXT_PUBLIC_`):**
   ```bash
   grep -rnE "VITE_|NEXT_PUBLIC_|PUBLIC_" src/
   ```
4. **Verificar políticas RLS completas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) nas migrations:**
   ```bash
   grep -rnE "enable row level security|create policy" supabase/migrations/
   ```
5. **Checar chamadas externas no `index.html` (ex.: Google Fonts CDN, scripts de Analytics/Pixels):**
   ```bash
   grep -rnE "https?://|gtag|fbq|clarity|hotjar|ttq" index.html src/
   ```
6. **Detectar elementos clicáveis não nativos sem suporte a teclado (`<span onClick>`, `<div onClick>`, `<th onClick>`):**
   ```bash
   grep -rnE "<(span|div|th|td|li)[^>]*onClick" src/
   ```
