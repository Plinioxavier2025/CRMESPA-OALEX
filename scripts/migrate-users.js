import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log("=== SCRIPT DE MIGRAÇÃO DE USUÁRIOS PARA SUPABASE AUTH ===");
  console.log("Este script migra usuários cadastrados na tabela pública 'usuarios'");
  console.log("para o Supabase Auth (auth.users) preservando senhas e dados.");
  console.log("---------------------------------------------------------");

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://enkvfqzxqudfannjebpz.supabase.co';
  console.log(`URL do Supabase configurada: ${supabaseUrl}`);

  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    serviceRoleKey = await askQuestion("Por favor, informe a SERVICE_ROLE_KEY do seu Supabase: ");
    serviceRoleKey = serviceRoleKey.trim();
  }

  if (!serviceRoleKey) {
    console.error("ERRO: A SERVICE_ROLE_KEY é obrigatória para migrar usuários.");
    rl.close();
    return;
  }

  // Initialize Supabase Client with service_role key to bypass RLS and use Admin Auth API
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log("\nBuscando usuários existentes na tabela 'usuarios'...");
  const { data: profiles, error: selectError } = await supabase
    .from('usuarios')
    .select('*');

  if (selectError) {
    console.error("Erro ao buscar perfis na tabela 'usuarios':", selectError.message);
    rl.close();
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log("Nenhum perfil encontrado na tabela 'usuarios'.");
    rl.close();
    return;
  }

  console.log(`Encontrados ${profiles.length} perfis. Iniciando migração...`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (const profile of profiles) {
    // If the password is 'supabase_auth', it means this user was already created through auth sync
    if (profile.senha === 'supabase_auth') {
      console.log(`[-] Pulando ${profile.email} (já está migrado/usa Supabase Auth)`);
      skippedCount++;
      continue;
    }

    if (!profile.senha) {
      console.log(`[-] Pulando ${profile.email} (sem senha configurada)`);
      skippedCount++;
      continue;
    }

    console.log(`[+] Migrando ${profile.nome} (${profile.email})...`);

    // Create user in Supabase Auth
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: profile.email,
      password: profile.senha, // preserves the existing plaintext password!
      email_confirm: true,
      user_metadata: {
        nome: profile.nome
      }
    });

    if (createError) {
      if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
        console.log(`[!] Usuário ${profile.email} já existe no Supabase Auth. Vinculando ID...`);
        
        // Let's find the user in Supabase Auth to get their actual ID
        const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`[X] Erro ao listar usuários de auth para obter ID de ${profile.email}:`, listError.message);
          failCount++;
          continue;
        }

        const existingAuthUser = userList.users.find(u => u.email.toLowerCase() === profile.email.toLowerCase());
        if (existingAuthUser) {
          // Update the public.usuarios record with the auth user's ID
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ id: existingAuthUser.id })
            .eq('email', profile.email);

          if (updateError) {
            console.error(`[X] Erro ao atualizar ID na tabela usuarios para ${profile.email}:`, updateError.message);
            failCount++;
          } else {
            console.log(`[✓] ID do usuário ${profile.email} atualizado com sucesso para ${existingAuthUser.id}.`);
            successCount++;
          }
        } else {
          console.error(`[X] Não foi possível encontrar o usuário ${profile.email} na lista de auth.`);
          failCount++;
        }
      } else {
        console.error(`[X] Erro ao criar usuário ${profile.email}:`, createError.message);
        failCount++;
      }
    } else if (authUser?.user) {
      console.log(`[✓] Usuário ${profile.email} migrado com sucesso! ID: ${authUser.user.id}`);
      successCount++;
    }
  }

  console.log("\n---------------------------------------------------------");
  console.log("RELATÓRIO DE MIGRAÇÃO:");
  console.log(`- Sucesso: ${successCount}`);
  console.log(`- Pulados/Já migrados: ${skippedCount}`);
  console.log(`- Falhas: ${failCount}`);
  console.log("---------------------------------------------------------");
  console.log("\nPRÓXIMO PASSO RECOMENDADO:");
  console.log("Execute a migration SQL (migration_rls_auth.sql) no seu painel do Supabase");
  console.log("para apagar a coluna 'senha' da tabela pública 'usuarios' e ativar o RLS.");
  
  rl.close();
}

main().catch(err => {
  console.error("Erro fatal na migração:", err);
  rl.close();
});
