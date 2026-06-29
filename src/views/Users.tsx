import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Usuario } from '../services/db';
import { UserCog, User, Mail, ShieldAlert, Edit, Save, X, CheckCircle2, UserPlus } from 'lucide-react';
import { supabaseUrl, supabaseAnonKey } from '../services/supabase';

export const Users: React.FC<{ activeUserName: string }> = ({ activeUserName }) => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await db.getUsuarios();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleEditClick = (u: Usuario) => {
    setIsCreating(false);
    setEditingUser(u);
    setNome(u.nome);
    setEmail(u.email);
    setSenha(u.senha || '');
    setFeedback('');
  };

  const handleNewUserClick = () => {
    setEditingUser(null);
    setIsCreating(true);
    setNome('');
    setEmail('');
    setSenha('');
    setFeedback('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');

    const isCloud = db.isSupabaseMode();
    const needsPassword = !isCloud || isCreating;

    if (!nome.trim() || !email.trim() || (needsPassword && !senha)) {
      setFeedback('Todos os campos são obrigatórios.');
      return;
    }

    try {
      if (isCreating) {
        if (isCloud && senha.length < 6) {
          setFeedback('No modo nuvem (Supabase), a senha deve possuir pelo menos 6 caracteres.');
          return;
        }

        if (isCloud) {
          // Cloud Supabase User Registration via raw fetch (to avoid session logout)
          const signupUrl = `${supabaseUrl}/auth/v1/signup`;
          const anonKey = supabaseAnonKey;

          const res = await fetch(signupUrl, {
            method: 'POST',
            headers: {
              'apikey': anonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: email.trim(),
              password: senha,
              data: {
                nome: nome.trim()
              }
            })
          });

          const resData = await res.json();

          if (!res.ok) {
            const errorMsg = resData.msg || resData.message || resData.error_description || resData.error || '';
            const isSignupDisabled = 
              errorMsg.toLowerCase().includes('signup') || 
              errorMsg.toLowerCase().includes('disabled') || 
              resData.error_code === 'signup_disabled' || 
              resData.code === 403;

            if (isSignupDisabled) {
              throw new Error('O cadastro de novos usuários está desativado no painel da Supabase. Por favor, acesse o painel e reative a opção "Allow new users to sign up" no menu Sign In/Providers da Supabase.');
            }
            throw new Error(errorMsg || 'Falha ao cadastrar usuário.');
          }

          setFeedback('Novo usuário cadastrado e ativo com sucesso!');
        } else {
          // Local Storage Mode
          const payload = {
            nome: nome.trim(),
            email: email.trim(),
            senha: senha,
            perfil: 'admin' as const
          };
          await db.saveUsuario(payload);
          setFeedback('Novo usuário local cadastrado com sucesso!');
        }

        await db.addLog(
          activeUserName, 
          'Novo usuário cadastrado', 
          `Cadastrado novo acesso para ${nome.trim()} (${email.trim()}).`
        );

        setIsCreating(false);
        loadUsers();
      } else if (editingUser) {
        // Edit mode
        const payload: Omit<Usuario, 'id'> & { id?: string; senha?: string } = {
          id: editingUser.id,
          nome: nome.trim(),
          email: email.trim(),
          perfil: 'admin' as const
        };

        if (!isCloud) {
          payload.senha = senha;
        }

        await db.saveUsuario(payload);
        await db.addLog(
          activeUserName, 
          'Dados de Usuário alterados', 
          `Alteradas credenciais de ${editingUser.nome} para ${nome.trim()} (${email.trim()}).`
        );
        
        setFeedback('Dados do usuário atualizados com sucesso!');
        setEditingUser(null);
        loadUsers();
      }
      
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      console.error(err);
      const error = err as Error;
      setFeedback(error.message || 'Erro ao salvar os dados do usuário.');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up text-xs">
      
      {/* Introduction Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
        <div className="p-3.5 bg-brand-blue-light text-brand-blue-primary rounded-2xl">
          <UserCog className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-blue-dark font-outfit font-black">Gerenciamento de Usuários</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
            Utilize o painel abaixo para revisar, alterar ou cadastrar novas credenciais e usuários autorizados a acessar o CRM da clínica.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid containing list and edit modals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Administrators List Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Usuários Cadastrados</h3>
              <p className="text-[10px] text-slate-400 font-light mt-0.5">Listagem das contas autorizadas de acesso.</p>
            </div>
            <button
              onClick={handleNewUserClick}
              className="flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] bg-brand-blue-dark hover:bg-brand-blue-primary text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="w-6 h-6 border-2 border-brand-blue-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {users.map((u) => (
                <div key={u.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 font-bold text-brand-blue-dark">
                        <User className="w-4 h-4 text-brand-green-primary" />
                        <span className="truncate max-w-[120px]">{u.nome}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-[8px] uppercase">
                        Admin
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-500 font-light truncate">
                      <div className="flex items-center gap-1 text-[10px]">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEditClick(u)}
                    className="w-full flex items-center justify-center gap-1 min-h-[44px] py-2.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-brand-blue-dark font-semibold border border-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar Credenciais</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Form Drawer */}
        {editingUser || isCreating ? (
          <div className="bg-white p-5 rounded-2xl border border-brand-blue-primary shadow-md flex flex-col justify-start space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-brand-blue-dark font-outfit">
                  {isCreating ? 'Cadastrar Novo Usuário' : 'Alterar Credenciais'}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {isCreating ? 'Criação de nova conta de acesso' : `Editando perfil de ${editingUser?.nome}`}
                </span>
              </div>
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setIsCreating(false);
                }}
                className="p-1 rounded hover:bg-slate-50 text-slate-400 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-1">
              {/* Name */}
              <div className="space-y-1">
                <label htmlFor="edit-user-name" className="font-bold text-slate-400 block uppercase tracking-wider">Nome Completo</label>
                <input
                  id="edit-user-name"
                  type="text"
                  required
                  placeholder="Nome do profissional"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all bg-white"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label htmlFor="edit-user-email" className="font-bold text-slate-400 block uppercase tracking-wider">E-mail de Login</label>
                <input
                  id="edit-user-email"
                  type="email"
                  required
                  placeholder="exemplo@espacoalexsilveira.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all bg-white"
                />
              </div>

              {/* Password */}
              {(!db.isSupabaseMode() || isCreating) ? (
                <div className="space-y-1">
                  <label htmlFor="edit-user-password" className="font-bold text-slate-400 block uppercase tracking-wider">Senha de Acesso</label>
                  <input
                    id="edit-user-password"
                    type="text"
                    required
                    placeholder={isCreating ? "Min. 6 caracteres" : "Senha atual"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all bg-white font-mono"
                  />
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 font-light leading-relaxed">
                  <span className="font-bold text-slate-700 block mb-0.5">Gestão de Senha Segura</span>
                  No modo Nuvem (Supabase Auth), a alteração de senhas deve ser realizada pelo próprio usuário através da redefinição de senha ou pelo painel do Supabase.
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] bg-brand-blue-dark hover:bg-brand-blue-primary text-white font-bold rounded-xl transition-all shadow-md shadow-slate-900/10 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isCreating ? 'Cadastrar Usuário' : 'Salvar Credenciais'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col justify-start gap-3">
            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center border border-amber-200">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-amber-850 block">Segurança de Contas</span>
              <p className="text-[10px] text-amber-750 leading-relaxed font-light">
                Para manter a segurança das fichas clínicas e do fluxo, altere senhas regularmente. Lembre-se de anotar as novas credenciais de login para evitar bloqueios de acesso.
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
