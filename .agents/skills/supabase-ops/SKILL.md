---
name: supabase-ops
description: >
  Gestão, desenvolvimento local, migrações SQL, políticas RLS e deploy de Edge Functions
  do Supabase no projeto Animatch. Use quando criar ou alterar tabelas, políticas de segurança,
  testar ou subir a Edge Function mal-proxy ou gerenciar o banco localmente.
---

# Supabase Ops — Animatch

Guia operacional para agentes atuando na camada de banco de dados, autenticação e Edge Functions do Supabase no projeto **Animatch**.

---

## 1. Estrutura do Diretório `supabase/`

```
supabase/
├── config.toml           # Configurações do projeto local (portas, schemas, auth)
├── migrations/           # Histórico sequencial de migrações SQL
│   ├── 20261009000000_create_user_settings.sql
│   ├── 20261017000000_create_user_anime_lists.sql
│   ├── 20261111000000_add_delete_policy_and_account_deletion.sql
│   └── 20261111010000_add_payload_limits_and_constraints.sql
└── functions/            # Edge Functions Deno/TypeScript
    ├── _shared/cors.ts   # Headers CORS compartilhados
    └── mal-proxy/        # Proxy com rate limiting para MyAnimeList API
```

---

## 2. Comandos do Supabase CLI

> Todos os comandos devem ser executados via `npx supabase <comando>` para garantir a versão correta do CLI.

### Desenvolvimento Local

```bash
# Iniciar os serviços locais do Supabase (Docker requerido)
npx supabase start

# Parar serviços locais
npx supabase stop

# Ver status dos serviços locais e credenciais (URL da API, chaves anon e service_role)
npx supabase status
```

### Gestão de Migrações e Banco

```bash
# Criar novo arquivo de migração vazio com timestamp
npx supabase migration new <nome_da_migracao>

# Gerar migração a partir do diff do banco local
npx supabase db diff -f <nome_da_migracao>

# Resetar o banco local e reaplicar todas as migrações desde o início
npx supabase db reset

# Aplicar migrações pendentes no ambiente remoto conectado
npx supabase db push
```

### Edge Functions (`mal-proxy`)

```bash
# Testar a função localmente (com live reload)
npx supabase functions serve mal-proxy --env-file ./supabase/functions/.env

# Fazer deploy da Edge Function para a nuvem
npx supabase functions deploy mal-proxy --no-verify-jwt

# Configurar variáveis de ambiente / secrets na nuvem
npx supabase secrets set MAL_CLIENT_ID="seu_client_id_aqui"
```

---

## 3. Diretrizes de Segurança e RLS (Row Level Security)

1. **RLS Obrigatório**: Nenhuma tabela deve existir no schema `public` sem RLS ativado:
   ```sql
   ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
   ```

2. **Isolamento de Tenant por Usuário**:
   * Políticas de `SELECT`, `INSERT`, `UPDATE` e `DELETE` devem validar `auth.uid() = user_id`.
   * Sempre incluir cláusula `WITH CHECK (auth.uid() = user_id)` nos comandos `INSERT` e `UPDATE`.

3. **Restrições de Payload**:
   * Armazenamento de listas em formato JSON/JSONB deve possuir limite explícito para evitar estouro de armazenamento e DoS (vide migração `20261111010000_add_payload_limits_and_constraints.sql`).

---

## 4. Edge Function: `mal-proxy`

A função [supabase/functions/mal-proxy/index.ts](file:///C:/Sistemas/Projetos/animes/supabase/functions/mal-proxy/index.ts) resolve o problema de CORS da API do MyAnimeList:

- **Rate Limit**: Limita por IP (`30 req/min`) para evitar bloqueio pelo MAL.
- **Autenticação com MAL**: Consome o secret `MAL_CLIENT_ID`.
- **Mirror**: Qualquer mudança estrutural no `mal-proxy` do Supabase deve ser sincronizada com o Cloudflare Pages Function em [functions/api/mal-proxy.ts](file:///C:/Sistemas/Projetos/animes/functions/api/mal-proxy.ts).
