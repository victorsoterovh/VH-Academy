-- Schema do sistema VH Soccer
-- Rode este arquivo uma vez no seu banco Postgres (ex: psql "$DATABASE_URL" -f schema.sql)

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  usuario TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagadores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  celular TEXT NOT NULL,
  cep TEXT, logradouro TEXT, numero TEXT, complemento TEXT,
  bairro TEXT, cidade TEXT, uf TEXT,
  senha_hash TEXT,                 -- nulo até a 1ª aprovação (quando a senha temporária é gerada)
  asaas_customer_id TEXT,          -- preenchido após criar o cliente no Asaas
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS turmas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  modalidade TEXT NOT NULL,        -- futsal | beach | nat | futv
  unidade TEXT NOT NULL,           -- Metrópole | Lourdes | Quintas do Sol
  horario TEXT NOT NULL,
  capacidade INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alunos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  nascimento DATE NOT NULL,
  condominio TEXT NOT NULL,
  unidade TEXT NOT NULL,
  modalidade TEXT NOT NULL,
  atleta_tipo TEXT NOT NULL CHECK (atleta_tipo IN ('proprio','filho')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','ativo','inativo')),
  turma_id INTEGER REFERENCES turmas(id),
  pagador_id INTEGER NOT NULL REFERENCES pagadores(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cobrancas (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES alunos(id),
  asaas_payment_id TEXT,           -- id da cobrança/assinatura no Asaas
  tipo TEXT NOT NULL CHECK (tipo IN ('avulsa','recorrente')),
  valor NUMERIC(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  link TEXT,                       -- invoiceUrl retornado pelo Asaas
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alunos_status ON alunos(status);
CREATE INDEX IF NOT EXISTS idx_alunos_pagador ON alunos(pagador_id);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_aluno ON cobrancas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_asaas_id ON cobrancas(asaas_payment_id);
