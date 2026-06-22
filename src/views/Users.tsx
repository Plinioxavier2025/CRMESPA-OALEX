import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Usuario } from '../services/db';
import { UserCog, User, Mail, ShieldAlert, Edit, Save, X, CheckCircle2 } from 'lucide-react';

export const Users: React.FC<{ activeUserName: string }> = ({ activeUserName }) => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  
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
    setEditingUser(u);
    setNome(u.nome);
    setEmail(u.email);
    setSenha(u.senha || '');
    setFeedback('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    if (!editingUser) return;

    if (!nome.trim() || !email.trim() || !senha) {
      setFeedback('Todos os campos são obrigatórios.');
      return;
    }

    try {
      const payload = {
        id: editingUser.id,
        nome: nome.trim(),
        email: email.trim(),
        senha: senha,
        perfil: 'admin' as const
      };

      await db.saveUsuario(payload);
      await db.addLog(
        activeUserName, 
        'Dados de Usuário alterados', 
        `Alteradas credenciais de ${editingUser.nome} para ${nome.trim()} (${email.trim()}).`
      );
      
      setFeedback('Dados de administrador atualizados com sucesso!');
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      console.error(err);
      setFeedback('Erro ao atualizar dados do administrador.');
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
          <h2 className="text-lg font-bold text-brand-blue-dark font-outfit font-black">Gerenciamento de Administradores</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
            O sistema possui um limite restrito de <strong>2 usuários administradores</strong> com acesso total. Utilize o painel abaixo para revisar e alterar os nomes de perfil, e-mails de acesso ou senhas individuais.
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
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Usuários Ativos (2/2)</h3>
            <p className="text-[10px] text-slate-400 font-light mt-0.5">Listagem das contas autorizadas de administrador.</p>
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
                    className="w-full flex items-center justify-center gap-1 py-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-brand-blue-dark font-semibold border border-slate-200 rounded-lg transition-all cursor-pointer"
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
        {editingUser ? (
          <div className="bg-white p-5 rounded-2xl border border-brand-blue-primary shadow-md flex flex-col justify-start space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-brand-blue-dark font-outfit">Alterar Credenciais</h3>
                <span className="text-[10px] text-slate-400">Editando perfil de {editingUser.nome}</span>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all bg-white"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label htmlFor="edit-user-password" className="font-bold text-slate-400 block uppercase tracking-wider">Senha de Acesso</label>
                <input
                  id="edit-user-password"
                  type="text"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all bg-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 bg-brand-blue-dark hover:bg-brand-blue-primary text-white font-bold rounded-xl transition-all shadow-md shadow-slate-900/10 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Credenciais</span>
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
