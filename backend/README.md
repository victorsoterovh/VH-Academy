# VH Soccer — Backend

API que sustenta o sistema: cadastro público, aprovação, turmas, login (admin e responsável) e integração com o Asaas.

## 1. Requisitos

- Node.js 18 ou superior
- Um banco PostgreSQL (a maioria das hospedagens já oferece isso — Railway, Render, Supabase, etc.)

## 2. Configuração inicial

```bash
npm install
cp .env.example .env
```

Abra o `.env` e preencha:

- `DATABASE_URL` — string de conexão do Postgres da sua hospedagem
- `JWT_SECRET` — qualquer texto longo e aleatório (ex: gere um em https://generate-secret.vercel.app/32)
- `ADMIN_USUARIO` / `ADMIN_SENHA` — credenciais do primeiro admin
- `ASAAS_API_KEY` — pegue em Asaas > Integrações > API
- `ASAAS_ENV` — comece com `sandbox` (ambiente de testes do Asaas, sem dinheiro real)
- `ASAAS_WEBHOOK_TOKEN` — invente uma senha qualquer; você vai usar a mesma no passo 5
- `FRONTEND_URL` — endereço onde o HTML do sistema está publicado

## 3. Criar as tabelas

Rode o schema uma única vez no seu banco:

```bash
psql "$DATABASE_URL" -f schema.sql
```

(Se sua hospedagem não expõe `psql` diretamente, qualquer cliente de Postgres — DBeaver, TablePlus, o painel web do provedor — também serve. É só colar o conteúdo de `schema.sql`.)

## 4. Criar o admin e as turmas iniciais

```bash
npm run seed
```

Isso cria o usuário administrador definido no `.env` e algumas turmas de exemplo (pode editar/apagar depois pelo próprio painel).

## 5. Rodar localmente

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000`. Teste com:

```bash
curl http://localhost:3000/api/health
```

## 6. Publicar (deploy)

Suba esta pasta pro seu provedor de hospedagem (ex: `git push` se for Railway/Render conectado ao GitHub, ou o método de deploy que sua hospedagem usar). Configure lá as mesmas variáveis de ambiente do `.env` — **nunca envie o arquivo `.env` para o repositório**.

Depois do deploy, repita os passos 3 e 4 apontando `DATABASE_URL` para o banco de produção.

## 7. Configurar o webhook no Asaas

No painel do Asaas: **Integrações → Webhooks → Novo Webhook**

- URL: `https://SEU-BACKEND-PUBLICADO/api/webhooks/asaas`
- Envie o header `asaas-access-token` com o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Eventos: marque pelo menos `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`

É esse webhook que atualiza sozinho o status das cobranças (pago/atrasado) no seu painel.

## 8. Ir para produção de verdade

Quando o fluxo estiver validado no sandbox:

1. Troque `ASAAS_ENV=sandbox` por `ASAAS_ENV=production`
2. Troque `ASAAS_API_KEY` pela chave de produção da sua conta Asaas
3. Reconfigure o webhook (o Asaas trata sandbox e produção como ambientes separados)

## Rotas disponíveis

| Método | Rota | Quem acessa | O que faz |
|---|---|---|---|
| POST | `/api/cadastros` | público | recebe o formulário de matrícula |
| POST | `/api/auth/admin/login` | público | login do admin |
| POST | `/api/auth/cliente/login` | público | login do responsável |
| POST | `/api/auth/cliente/trocar-senha` | responsável | troca a senha temporária |
| GET | `/api/alunos` | admin | lista todos os alunos |
| GET | `/api/alunos/:id` | admin | detalhe de um aluno |
| POST | `/api/alunos/:id/aprovar` | admin | aprova, cria cliente no Asaas e libera acesso |
| POST | `/api/alunos/:id/cobrancas` | admin | cria cobrança avulsa ou assinatura no Asaas |
| GET | `/api/turmas` | admin | lista turmas com contagem de matriculados |
| POST | `/api/turmas` | admin | cria turma |
| GET | `/api/turmas/:id/alunos` | admin | lista alunos de uma turma |
| GET | `/api/cliente/alunos` | responsável | lista os próprios atletas |
| GET | `/api/cliente/alunos/:id` | responsável | detalhe + faturas de um atleta |
| POST | `/api/webhooks/asaas` | Asaas | recebe eventos de pagamento |

## Próximo passo: ligar o frontend

O arquivo `camisa10-prototipo.html` que já temos usa dados mockados em memória. Os pontos marcados com `// BACKEND:` nele são exatamente onde essas chamadas de API entram — trocar o mock por `fetch()` de verdade para essas rotas, guardando o token do login em memória (ou em uma variável JS) para enviar como `Authorization: Bearer <token>` nas chamadas de admin e cliente.

## Segurança — antes de divulgar o link pros condomínios

- Confirme que o site está em **HTTPS**
- `JWT_SECRET` deve ser longo, aleatório, e diferente entre ambientes de teste e produção
- Nunca deixe `ASAAS_API_KEY` exposta no frontend — ela só existe no backend
- Configure o envio real de e-mail/SMS em `src/services/notificacoes.js` antes de aprovar cadastros de verdade (hoje a senha temporária só aparece no log do servidor)
