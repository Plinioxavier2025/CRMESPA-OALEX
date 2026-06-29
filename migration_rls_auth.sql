-- SQL MIGRATION FOR CRM ESPAÇO ALEX
-- Execute these statements in the SQL Editor of your Supabase Dashboard

-- 1. Recreate the trigger function without the "senha" column references
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'admin'
  )
  ON CONFLICT (email) DO UPDATE 
  SET id = new.id,
      nome = COALESCE(new.raw_user_meta_data->>'nome', public.usuarios.nome);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the "senha" column from "usuarios" table
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS senha;

-- 3. Create a helper function to check if the current user is an admin
-- Runs as SECURITY DEFINER to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND perfil = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-configure RLS on "usuarios" table
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_public_read ON public.usuarios;
DROP POLICY IF EXISTS usuarios_admin_all ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: leitura própria" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: admin vê todos" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: admin insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: admin update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: admin delete" ON public.usuarios;

-- Policy: Authenticated users can read their own profile
CREATE POLICY "usuarios: leitura própria"
ON public.usuarios FOR SELECT
USING (auth.uid() = id);

-- Policy: Admin users can read all profiles
CREATE POLICY "usuarios: admin vê todos"
ON public.usuarios FOR SELECT
USING (public.is_admin());

-- Policy: Admin users can insert new profiles
CREATE POLICY "usuarios: admin insert"
ON public.usuarios FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy: Admins can update any profile, and users can update their own
CREATE POLICY "usuarios: admin update"
ON public.usuarios FOR UPDATE
TO authenticated
USING (public.is_admin() OR auth.uid() = id)
WITH CHECK (public.is_admin() OR auth.uid() = id);

-- Policy: Admin users can delete profiles
CREATE POLICY "usuarios: admin delete"
ON public.usuarios FOR DELETE
TO authenticated
USING (public.is_admin());

-- 5. Re-configure RLS on "logs" table (Remove public read)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logs_public_read ON public.logs;
DROP POLICY IF EXISTS logs_authenticated_all ON public.logs;
DROP POLICY IF EXISTS "logs: acesso total para autenticados" ON public.logs;

CREATE POLICY "logs: acesso total para autenticados"
ON public.logs FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Re-configure RLS on "configuracoes" table (Remove public read)
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configuracoes_public_read ON public.configuracoes;
DROP POLICY IF EXISTS configuracoes_authenticated_all ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes: acesso total para autenticados" ON public.configuracoes;

CREATE POLICY "configuracoes: acesso total para autenticados"
ON public.configuracoes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
