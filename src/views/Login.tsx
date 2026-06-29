import React, { useState } from 'react';
import { db } from '../services/db';
import type { Usuario } from '../services/db';
import { supabase } from '../services/supabase';
import { Mail, Lock, ShieldAlert, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: Omit<Usuario, 'senha'>) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isCloud = db.isSupabaseMode();
  const [logoFailed, setLogoFailed] = useState(false);

  const mapAuthError = (message: string): string => {
    const mensagens: { [key: string]: string } = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'Email not confirmed': 'Confirme seu e-mail antes de acessar.',
      'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
      'Invalid email': 'E-mail inválido.',
    };
    
    for (const key of Object.keys(mensagens)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return mensagens[key];
      }
    }
    
    return 'Erro ao fazer login. Tente novamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!email.trim()) {
      setError('Informe seu e-mail');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('E-mail inválido');
      return;
    }

    if (!password) {
      setError('Informe sua senha');
      return;
    }

    setLoading(true);

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
    } catch (e) {
      const error = e as Error;
      setError(mapAuthError(error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-brand-blue-dark via-[#0f172a] to-[#0A2E36] px-4 py-12 relative overflow-hidden">
      
      {/* Decorative calm background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow-2" />

      {/* Subtle page-level background watermark (Floating logo) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.07] animate-float-slow">
        {!logoFailed && (
          <img 
            src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipobranco.png" 
            alt="Watermark Logo" 
            className="w-2/3 max-w-2xl h-auto object-contain filter grayscale"
          />
        )}
      </div>

      {/* Main glass container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 bg-slate-950/25 backdrop-blur-2xl shadow-2xl relative z-10 animate-slide-up">
        
        {/* Transparent logo watermark inside the card, behind elements */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.12] select-none animate-float-slow">
          {!logoFailed && (
            <img 
              src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipobranco.png" 
              alt="Watermark Logo Card" 
              className="w-[55%] max-w-md h-auto object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]"
            />
          )}
        </div>

        {/* Left Side: Welcoming brand introduction */}
        <div className="p-8 md:p-12 bg-white/[0.02] flex flex-col justify-between border-r border-white/5 text-white relative z-10">
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

          <div className="space-y-6 my-10 md:my-0 relative z-10 group">
            <div>
              <span className="inline-block opacity-60 text-slate-350 text-[10px] uppercase tracking-[0.25em] font-bold mb-3 select-none">
                Filosofia de Sucesso
              </span>
              <h1 className="font-outfit font-black text-3xl md:text-4.5xl text-white leading-normal tracking-tight">
                {/* First Line */}
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 mb-2">
                  {["AQUELE", "QUE", "NÃO", "SABE", "ONDE", "VAI,"].map((word, i) => (
                    <span 
                      key={i} 
                      className="inline-block transition-all duration-300 hover:text-emerald-400 hover:scale-110 hover:-translate-y-0.5 cursor-default select-none hover:drop-shadow-[0_0_15px_rgba(52,211,153,0.6)] animate-fade-in-up"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
                {/* Second Line */}
                <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                  {["QUALQUER", "CAMINHO", "SERVE."].map((word, i) => (
                    <span 
                      key={i} 
                      className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300 transition-all duration-300 hover:scale-115 hover:-translate-y-1 cursor-default select-none hover:drop-shadow-[0_0_20px_rgba(103,232,249,0.8)] animate-fade-in-shimmer"
                      style={{ 
                        animationDelay: `${(i + 6) * 100}ms`,
                        textShadow: '0 0 40px rgba(52,211,153,0.05)'
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </h1>
              <div className="h-[2px] w-12 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full mt-6 transition-all duration-500 group-hover:w-24" />
            </div>
            
            <p className="text-slate-350 text-xs font-light leading-relaxed max-w-sm tracking-wide animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
              Tenha clareza estratégica. Defina metas precisas para a sua clínica e acompanhe cada indicador de sucesso em um único painel de controle.
            </p>
          </div>
        </div>

        {/* Right Side: Sign-in form panel */}
        <div className="p-8 md:p-12 bg-white/[0.01] flex flex-col justify-center border-l border-white/5 text-white relative z-10">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white font-outfit">Acesso ao Sistema</h2>
            <p className="text-xs text-slate-350 font-light mt-1.5 leading-relaxed">
              Entre com suas credenciais de administrador para acessar o painel de gestão.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-xs text-red-300 animate-fade-in shadow-sm">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <span className="font-bold block">Falha de Autenticação</span>
                <p className="mt-0.5 font-light leading-relaxed text-red-250">{error}</p>
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
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/10 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 text-sm outline-none transition-all placeholder:text-slate-500 bg-white/5 focus:bg-white/10 text-white"
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
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-white/10 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 text-sm outline-none transition-all placeholder:text-slate-500 bg-white/5 focus:bg-white/10 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-outfit text-sm"
            >
              <span>{loading ? 'Verificando...' : 'Acessar CRM'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Connection status note */}
          <div className="mt-8 text-center">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full ${
              isCloud 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isCloud ? 'Nuvem Supabase Ativa' : 'Banco de Dados Local Ativo'}
            </span>
            {!isCloud && (
              <p className="text-[10px] text-slate-500 font-light mt-2 max-w-xs mx-auto">
                Dica: Logins pre-configurados: <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-slate-300 font-medium">alex@espacoalexsilveira.com.br</code> com senha <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-slate-300 font-medium">admin</code>.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
