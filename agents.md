# ⚽ VH Soccer — Guia do Projeto (Agents.md)

Este documento serve como a **base de conhecimento e coordenação principal** para qualquer inteligência artificial que venha a atuar no projeto "VH Soccer". Se você é uma IA (ou novo desenvolvedor) lendo isso, **leia atentamente** antes de sugerir ou aplicar qualquer alteração.

---

## 1. O que é o projeto?
O **VH Soccer** é um sistema web de gestão para academias esportivas (com modalidades como Futsal, Beach Tennis, Natação e Futevôlei). Ele atende a dois públicos:
- **Admin da Academia:** Aprova cadastros, gerencia alunos, cria turmas e gera cobranças.
- **Cliente (Responsável/Atleta):** Realiza a matrícula, acompanha o status da aprovação, vê a turma definida e acessa o histórico de cobranças/faturas.

## 2. Arquitetura e Stack
O projeto segue uma arquitetura **Monorepo** na mesma hospedagem do Vercel, composto por:

### Backend (Pasta `/backend/src` e `/backend/api`)
- **Linguagem / Framework:** Node.js com Express.
- **Banco de Dados:** PostgreSQL (hospedado no Supabase), acessado via pacote `pg` puro (queries SQL, sem ORM).
- **Autenticação:** JWT (`jsonwebtoken`). Senhas (para clientes) não são cadastradas pelo usuário, mas sim geradas na aprovação do cadastro e o hash (`bcrypt`) é salvo no banco. O admin tem credenciais fixas/pré-cadastradas (`admin` / `admin123`).
- **Integração Financeira:** Integração com a API do **Asaas** (modo Sandbox) para gestão de clientes, cobranças e recebimento de webhooks.
- **Deployment:** Vercel (funções Serverless). O arquivo `api/index.js` exporta a aplicação Express, e o `vercel.json` faz o roteamento das rotas `/api/(.*)` para o backend.

### Frontend (Pasta `/backend/public`)
- **Linguagem / Framework:** HTML, CSS puro e JavaScript Vanilla (tudo em um único arquivo: `index.html`).
- **Abordagem:** Single Page Application (SPA) nativa, manipulando DOM diretamente com estado centralizado (`state` e `render()`).
- **Comunicação:** O frontend roda no mesmo domínio do backend. Ele consome o backend através das rotas `/api/*`. O arquivo estático `index.html` é servido pelo próprio Express (em `/`) e pelo Vercel.

## 3. Estrutura de Diretórios (Resumo)
```
vh-soccer/
├── backend/
│   ├── api/
│   │   └── index.js           # Ponto de entrada do Vercel Serverless
│   ├── public/
│   │   └── index.html         # Frontend completo da aplicação
│   ├── src/
│   │   ├── middleware/        # auth.js (validação de JWT e papéis)
│   │   ├── routes/            # alunos.js, auth.js, turmas.js, cliente.js, webhook.js
│   │   ├── services/          # asaas.js (API externa), notificacoes.js (e-mails stub)
│   │   ├── server.js          # App Express e roteamento de arquivos estáticos
│   │   └── seed.js            # Script para popular BD (admin e turmas iniciais)
│   ├── vercel.json            # Configuração de rotas Vercel (tudo p/ /api/index)
│   ├── schema.sql             # Definição das tabelas e relacionamentos do PostgreSQL
│   ├── .env                   # Variáveis de ambiente (local)
│   └── package.json           # Dependências do backend
```

## 4. Banco de Dados (Supabase / PostgreSQL)
Tabelas principais:
- `admins`: Controle de acesso para gerentes.
- `pagadores`: Clientes financeiros, integrados com o Asaas (`asaas_customer_id`).
- `alunos`: Os atletas, com vínculo a um pagador e (opcionalmente) a uma turma.
- `turmas`: Cadastro de modalidades, horários e capacidade por unidade.
- `cobrancas`: Histórico financeiro com `asaas_payment_id` e status (`pendente`, `pago`, `vencida`).

**Atenção:** O banco de dados fica no Supabase. O arquivo `schema.sql` contém a estrutura mais recente. Sempre mantenha o schema alinhado com as rotas.

## 5. Variáveis de Ambiente (Vercel)
O projeto exige as seguintes variáveis configuradas no Vercel para rodar:
- `DATABASE_URL`: String de conexão com Supabase. Ex: `postgresql://postgres:SENHA@HOST:5432/postgres` (cuidado com caracteres especiais na senha, use URL Encode, ex: `@` -> `%40`).
- `JWT_SECRET`: Chave secreta para assinar tokens.
- `ASAAS_ENV`: `sandbox` ou `production`.
- `ASAAS_API_KEY`: Chave de API gerada no Asaas.
- `ASAAS_WEBHOOK_TOKEN`: Token de segurança definido no Asaas para receber notificações de pagamento no endpoint `/api/webhooks/asaas`.
- `FRONTEND_URL`: `*` (ou domínio exato para controle CORS).
- `ADMIN_USUARIO` / `ADMIN_SENHA` (Usados no script de seed/setup inicial, ou caso hardcoded).

## 6. Lógica de Negócio e Fluxos Principais
1. **Cadastro:** O pai (ou o próprio aluno) preenche a matrícula na home.
2. **Revisão:** Cai no Painel Admin como `Pendente`.
3. **Aprovação:** O Admin escolhe uma Turma e clica em Aprovar.
4. **Asaas:** Nesse momento, o backend cria o Customer no Asaas, gera uma senha aleatória para o responsável, envia um "e-mail" (atualmente simulado no console) com a senha de acesso, e o aluno se torna `ativo`.
5. **Painel do Cliente:** O responsável faz login com o CPF e a senha recebida. Pode ver a situação do atleta e os botões "Pagar fatura" que levam à URL de checkout do Asaas.

## 7. Dicas para Manutenção (IMPORTANTE)
- **Frontend SPA:** Sempre que mexer no frontend, mantenha a lógica de atualização do DOM focada nas funções `render()` (ex: `renderPainel`, `renderFicha`, `renderTabs`).
- **Variáveis de CSS:** As cores do projeto estão em `--pitch-deep`, `--pitch-mid`, `--cone`, etc.
- **Vercel Config:** O "Root Directory" do projeto Vercel DEVE estar como `backend`.
- **Git Push:** Atualmente, a autenticação local Git do usuário pode sofrer conflitos de permissão, muitas atualizações foram feitas subindo arquivos manualmente via site do GitHub.

---
**Atualizado em:** 17 de Setembro de 2026.
*(IA: Ao finalizar novas implementações ou mudanças estruturais graves, atualize este arquivo com as novas informações para o próximo desenvolvedor/IA).*
