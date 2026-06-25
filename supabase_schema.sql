-- SQL Schema for CRM ESPAÇO ALEX
-- Compatible with Supabase PostgreSQL

-- =========================================================================
-- ATUALIZAÇÃO PARA BANCO DE DADOS EXISTENTE:
-- Se você já possui a tabela de pacientes criada, execute as seguintes linhas
-- no editor SQL do seu painel do Supabase para suportar desfazer importações:
--
-- ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS import_id VARCHAR(100);
-- ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS importado_em TIMESTAMP WITH TIME ZONE;
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLE: usuarios (Administrators)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha TEXT NOT NULL, -- Stored hashed password (or fallback credentials)
    perfil VARCHAR(50) DEFAULT 'admin',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_public_read ON usuarios FOR SELECT USING (true);
CREATE POLICY usuarios_admin_all ON usuarios FOR ALL TO authenticated USING (true);

-- 2. TABLE: pacientes (Patients)
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    convenio VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Novo Cliente', 'Ativo', 'Desistiu', 'Inativo')),
    motivo_desistencia TEXT, -- "Financeiro", "Mudança", etc. and description
    data_cadastro DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_cadastro TIME NOT NULL DEFAULT CURRENT_TIME,
    data_ultima_atualizacao DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_ultima_atualizacao TIME NOT NULL DEFAULT CURRENT_TIME,
    usuario_cadastro VARCHAR(255) NOT NULL, -- Name or Email of the user who registered
    import_id VARCHAR(100),
    importado_em TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for pacientes
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pacientes_authenticated_all ON pacientes FOR ALL TO authenticated USING (true);

-- 3. TABLE: configuracoes (Dynamic variables, e.g. health insurances list)
CREATE TABLE IF NOT EXISTS configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for configuracoes
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY configuracoes_public_read ON configuracoes FOR SELECT USING (true);
CREATE POLICY configuracoes_authenticated_all ON configuracoes FOR ALL TO authenticated USING (true);

-- 4. TABLE: logs (Audit trail)
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_nome VARCHAR(255) NOT NULL,
    acao VARCHAR(255) NOT NULL,
    detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_public_read ON logs FOR SELECT USING (true);
CREATE POLICY logs_authenticated_all ON logs FOR ALL TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome);
CREATE INDEX IF NOT EXISTS idx_pacientes_status ON pacientes(status);
CREATE INDEX IF NOT EXISTS idx_pacientes_convenio ON pacientes(convenio);
CREATE INDEX IF NOT EXISTS idx_pacientes_data_cadastro ON pacientes(data_cadastro);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Seed configurations
INSERT INTO configuracoes (chave, valor) VALUES 
('convenios', '["SulAmérica", "Particular", "Care Plus", "Vivest"]')
ON CONFLICT (chave) DO NOTHING;

-- 5. TRIGGER: Sync auth.users with public.usuarios
-- This automatically creates a corresponding profile in the public.usuarios table
-- when a new user is created in Supabase Auth (auth.users).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, senha, perfil)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'supabase_auth', -- placeholder password (authentication is handled by Supabase Auth)
    'admin'
  )
  ON CONFLICT (email) DO UPDATE 
  SET id = new.id,
      nome = COALESCE(new.raw_user_meta_data->>'nome', public.usuarios.nome);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

