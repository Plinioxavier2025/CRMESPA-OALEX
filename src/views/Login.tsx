import React, { useState } from 'react';
import { db } from '../services/db';
import type { Usuario } from '../services/db';
import { supabase } from '../services/supabase';
import { Mail, Lock, ShieldAlert, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: Omit<Usuario, 'senha'>) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isCloud = db.isSupabaseMode();
  const [logoFailed, setLogoFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    try {
      if (supabase) {
        // Supabase Cloud Auth
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (authError) throw authError;

        if (data?.user) {
          // Fetch additional profile info if needed, or build default profile
          const { data: profile } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', data.user.email)
            .single();

          onLoginSuccess({
            id: data.user.id,
            nome: profile?.nome || data.user.email?.split('@')[0] || 'Administrador',
            email: data.user.email || email,
            perfil: 'admin'
          });
          
          await db.addLog(profile?.nome || data.user.email || 'Sistema', 'Login no sistema', 'Autenticação bem-sucedida via Supabase Auth.');
        }
      } else {
        // Local storage mock authentication
        const admins = await db.getUsuarios();
        const foundUser = admins.find(
          u => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === password
        );

        if (!foundUser) {
          throw new Error('E-mail ou senha incorretos.');
        }

        onLoginSuccess({
          id: foundUser.id,
          nome: foundUser.nome,
          email: foundUser.email,
          perfil: foundUser.perfil
        });
        
        await db.addLog(foundUser.nome, 'Login no sistema', 'Autenticação bem-sucedida em banco local simulado.');
      }
    } catch (e: any) {
      setError(e.message || 'Falha na autenticação. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-brand-blue-dark via-[#0f172a] to-[#0A2E36] px-4 py-12 relative overflow-hidden">
      
      {/* Decorative calm background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-blue-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-green-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Subtle brand background watermark */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        {!logoFailed && (
          <img 
            src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipobranco.png" 
            alt="Watermark Logo" 
            className="w-2/3 max-w-2xl h-auto object-contain filter grayscale"
          />
        )}
      </div>

      {/* Main glass container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-slate-800/60 bg-[#0d1321]/50 backdrop-blur-xl shadow-2xl relative z-10 animate-slide-up">
        
        {/* Left Side: Welcoming brand introduction */}
        <div className="p-8 md:p-12 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] flex flex-col justify-between border-r border-slate-800/50 text-white relative">
          {/* Subtle glow layer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-green-primary/5 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-2 select-none relative z-10">
            {!logoFailed ? (
              <img 
                src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipobranco.png" 
                alt="Logo Espaço Alex" 
                className="h-12 w-auto object-contain max-w-[200px] filter drop-shadow-md"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="flex items-center gap-3 text-white font-bold font-outfit text-lg tracking-wide">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20">
                  EA
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-outfit font-bold text-base tracking-wide text-white">Espaço</span>
                  <span className="font-sans font-light text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Alex Silveira</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 my-10 md:my-0 relative z-10">
            <h1 className="font-outfit font-black text-3xl md:text-4.5xl text-white leading-[1.15] tracking-tight">
              Gestão acolhedora, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300">clínica organizada.</span>
            </h1>
            <p className="text-slate-400 text-sm font-light leading-relaxed max-w-sm">
              Acompanhe o fluxo de pacientes, meça a taxa de retenção da clínica, faça análises mensais e emita relatórios com praticidade e segurança.
            </p>
          </div>
        </div>

        {/* Right Side: Sign-in form panel */}
        <div className="p-8 md:p-12 bg-white flex flex-col justify-center border-l border-slate-100">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-800 font-outfit">Acesso ao Sistema</h2>
            <p className="text-xs text-slate-400 font-light mt-1.5 leading-relaxed">
              Entre com suas credenciais de administrador para acessar o painel de gestão.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-xs text-red-700 animate-fade-in shadow-sm">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <span className="font-bold block">Falha de Autenticação</span>
                <p className="mt-0.5 font-light leading-relaxed text-red-650">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">E-mail Administrativo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="exemplo@espacoalexsilveira.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 text-sm outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Senha Individual</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 text-sm outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Verificando...' : 'Acessar CRM'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Connection status note */}
          <div className="mt-8 text-center">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full ${
              isCloud 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              {isCloud ? 'Nuvem Supabase Ativa' : 'Banco de Dados Local Ativo'}
            </span>
            {!isCloud && (
              <p className="text-[10px] text-slate-400 font-light mt-2 max-w-xs mx-auto">
                Dica: Logins pre-configurados: <code className="bg-slate-50 px-1 py-0.5 rounded font-mono text-slate-500 font-medium">alex@espacoalexsilveira.com.br</code> com senha <code className="bg-slate-50 px-1 py-0.5 rounded font-mono text-slate-500 font-medium">admin</code>.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
