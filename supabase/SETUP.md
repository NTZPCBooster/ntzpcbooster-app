# PCBoost — Supabase Backend Setup

## 1. Criar Projeto no Supabase

Se ainda nao tem um projeto:
1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Nome: `pcboost` | Regiao: South America (Sao Paulo)
4. Anote a senha do banco

## 2. Rodar o Schema SQL

1. No dashboard do projeto, va em **SQL Editor**
2. Cole o conteudo de `migrations/001_initial_schema.sql`
3. Clique em **Run**

## 3. Configurar Secrets

No dashboard: **Settings > Edge Functions > Secrets**, adicione:

| Secret | Valor |
|--------|-------|
| `ADMIN_SECRET` | Uma senha forte que voce vai usar no painel admin |
| `STRIPE_SECRET_KEY` | `sk_test_...` (Stripe Dashboard > API Keys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (criado no passo 5) |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ja sao injetados automaticamente.

## 4. Deploy das Edge Functions

```bash
# Instalar Supabase CLI (se nao tem)
npm i -g supabase

# Linkar ao projeto
supabase login
supabase link --project-ref SEU_PROJECT_REF

# Deploy de todas as funcoes
supabase functions deploy validate --no-verify-jwt
supabase functions deploy check --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy admin --no-verify-jwt
```

> `--no-verify-jwt` porque a autenticacao e feita manualmente (apikey header + service_role interno).

## 5. Configurar Stripe Webhook

1. Stripe Dashboard > Developers > Webhooks
2. "Add endpoint"
3. URL: `https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Eventos: `checkout.session.completed`, `charge.refunded`, `invoice.payment_succeeded`
5. Copie o `Signing secret` (whsec_...) e coloque nos Secrets do Supabase

## 6. Configurar o App

Edite `.env` na raiz do projeto:

```
VITE_SUPABASE_FUNCTIONS_URL=https://SEU_PROJECT_REF.supabase.co/functions/v1
VITE_SUPABASE_ANON_KEY=eyJ...  (Settings > API > anon public)
```

## 7. Testar

### Criar uma licenca de teste (via SQL Editor):
```sql
INSERT INTO licenses (key, email, plan, status)
VALUES ('TESTE-ABCDE-FGHIJ-KLMNO', 'teste@pcboost.com', 'vitalicio', 'pending');
```

### Ativar no app:
- Abra o PCBoost
- Insira: `TESTE-ABCDE-FGHIJ-KLMNO`
- Deve ativar e vincular ao seu Hardware ID

### Testar admin API (via curl):
```bash
curl -X POST https://SEU_PROJECT_REF.supabase.co/functions/v1/admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_ADMIN_SECRET" \
  -d '{"action": "admin.overview"}'
```
