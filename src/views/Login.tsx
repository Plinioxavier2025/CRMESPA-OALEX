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
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Decorative calm background blobs (subtle glows to match theme) */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-glow-1" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-glow-2" />

      {/* Left Panel: Impactful Image & Quote */}
      <div className="w-full md:w-3/5 relative min-h-[45vh] md:min-h-screen flex flex-col justify-between p-8 md:p-16 overflow-hidden">
        {/* Background Image with Ken Burns / Hover Scale effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105" 
          style={{ backgroundImage: `url('/alex_silveira_clean.png')` }}
        />
        {/* Gradient overlays to darken the image and improve text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent md:bg-gradient-to-r md:from-slate-950/90 md:via-slate-950/40 md:to-transparent" />
        <div className="absolute inset-0 bg-slate-950/10" />

        {/* Logo container at top-left */}
        <div className="flex items-center gap-2 select-none relative z-10 animate-fade-in">
          {!logoFailed ? (
            <img 
              src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipobranco.png" 
              alt="Logo Espaço Alex" 
              className="h-14 w-auto object-contain max-w-[220px] filter drop-shadow-lg"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="flex items-center gap-3 text-white font-bold font-outfit text-lg tracking-wide">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
                EA
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-outfit font-bold text-lg tracking-wide text-white">Espaço</span>
                <span className="font-sans font-light text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Alex Silveira</span>
              </div>
            </div>
          )}
        </div>

        {/* Eye-catching Quote & Subtitle at bottom/center */}
        <div className="relative z-10 mt-auto max-w-lg animate-slide-up">
          <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full mb-4 select-none shadow-sm">
            Filosofia de Direcionamento
          </span>
          
          <h1 className="font-outfit font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white leading-tight tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            {/* First Line */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1 sm:mb-2">
              {["AQUELE", "QUE", "NÃO", "SABE", "ONDE", "VAI,"].map((word, i) => (
                <span 
                  key={i} 
                  className="inline-block text-white transition-all duration-300 hover:text-emerald-400 hover:scale-105 hover:-translate-y-0.5 cursor-default select-none animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {word}
                </span>
              ))}
            </div>
            {/* Second Line (gradient and glowing) */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {["QUALQUER", "CAMINHO", "SERVE."].map((word, i) => (
                <span 
                  key={i} 
                  className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300 transition-all duration-300 hover:scale-110 hover:-translate-y-1 cursor-default select-none hover:drop-shadow-[0_0_25px_rgba(52,211,153,0.8)] animate-fade-in-shimmer font-black"
                  style={{ 
                    animationDelay: `${(i + 6) * 80}ms`,
                    textShadow: '0 0 40px rgba(52,211,153,0.1)'
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </h1>
          
          <div className="h-[3px] w-16 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full mt-8 mb-6" />
          
          <p className="text-slate-200 text-sm md:text-base font-light leading-relaxed max-w-md tracking-wide drop-shadow-md">
            Tenha clareza estratégica. Defina metas precisas para a sua clínica e acompanhe cada indicador de sucesso em um único painel de controle.
          </p>
        </div>
      </div>

      {/* Right Panel: Sign-in form panel */}
      <div className="w-full md:w-2/5 min-h-[55vh] md:min-h-screen bg-slate-950 flex flex-col justify-center px-8 py-12 md:p-16 border-t md:border-t-0 md:border-l border-white/5 relative z-10">
        
        {/* Subtle watermark in the background of the form column */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
          {!logoFailed && (
            <img 
              src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipobranco.png" 
              alt="Watermark Logo Card" 
              className="w-[70%] max-w-xs h-auto object-contain filter grayscale"
            />
          )}
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-black text-white font-outfit tracking-tight">Acesso ao Sistema</h2>
            <p className="text-sm text-slate-400 font-light mt-2 leading-relaxed">
              Entre com suas credenciais de administrador para acessar o painel de gestão do CRM.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-xs text-red-300 animate-fade-in shadow-sm">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <span className="font-bold block">Falha de Autenticação</span>
                <p className="mt-0.5 font-light leading-relaxed text-red-250">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Address */}
            <div className="space-y-2">
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
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-white/10 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 text-sm outline-none transition-all placeholder:text-slate-500 bg-white/5 focus:bg-white/10 text-white animate-transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
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
                  className="w-full pl-11 pr-12 py-4 rounded-2xl border border-white/10 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 text-sm outline-none transition-all placeholder:text-slate-500 bg-white/5 focus:bg-white/10 text-white animate-transition"
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
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-outfit text-sm mt-8"
            >
              <span>{loading ? 'Verificando...' : 'Acessar CRM'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Connection status note */}
          <div className="pt-6 text-center border-t border-white/5">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full ${
              isCloud 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isCloud ? 'Nuvem Supabase Ativa' : 'Banco de Dados Local Ativo'}
            </span>
            {!isCloud && (
              <p className="text-[10px] text-slate-500 font-light mt-2 max-w-xs mx-auto">
                Dica: Login pré-configurado: <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-slate-300 font-medium">alex@espacoalexsilveira.com.br</code> com senha <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-slate-300 font-medium">admin</code>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
