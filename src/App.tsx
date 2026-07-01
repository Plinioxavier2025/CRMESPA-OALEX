import { useState, useEffect } from 'react';
import { Login } from './views/Login';
import { Sidebar } from './components/Sidebar';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { PatientsList } from './views/PatientsList';
import { ImportExcel } from './views/ImportExcel';
import { MonthlyAnalysis } from './views/MonthlyAnalysis';
import { NewPatientsHistory } from './views/NewPatientsHistory';
import { Reports } from './views/Reports';
import { Settings } from './views/Settings';
import { Users } from './views/Users';
import { BulkDelete } from './views/BulkDelete';
import { db } from './services/db';
import type { Usuario } from './services/db';
import { supabase } from './services/supabase';

function App() {
  const [user, setUser] = useState<Omit<Usuario, 'senha'> | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [patientFilters, setPatientFilters] = useState<{ status?: string; month?: string; year?: string; excludePlanilha?: boolean } | null>(null);

  const navigateToPatients = (status?: string, month?: string, year?: string, excludePlanilha?: boolean) => {
    setPatientFilters({ status, month, year, excludePlanilha });
    setCurrentTab('pacientes');
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [checkingSession, setCheckingSession] = useState(true);

  // Check login session on mount
  useEffect(() => {
    const checkSession = async () => {
      // 1. Background ping to wake up Supabase from cold start (no await, runs in bg)
      if (db.isSupabaseMode() && supabase) {
        (async () => {
          try {
            await supabase.from('usuarios').select('id').limit(1);
            console.log("Supabase ping successful (woken up)");
          } catch (err) {
            console.error("Supabase ping error:", err);
          }
        })();
      }

      // 2. Session verification
      if (db.isSupabaseMode() && supabase) {
        try {
          const { data: { user: sbUser }, error: userError } = await supabase.auth.getUser();
          if (sbUser && !userError) {
            // Fetch the user profile from usuarios table
            const { data: profile } = await supabase
              .from('usuarios')
              .select('*')
              .eq('id', sbUser.id)
              .single();

            const userData = {
              id: sbUser.id,
              nome: profile?.nome || sbUser.email?.split('@')[0] || 'Administrador',
              email: sbUser.email || '',
              perfil: 'admin' as const
            };
            setUser(userData);
            localStorage.setItem('crm_alex_session', JSON.stringify(userData));
          } else {
            // Clear local cache if supabase auth is invalid
            setUser(null);
            localStorage.removeItem('crm_alex_session');
          }
        } catch (e) {
          console.error("Erro ao carregar sessão Supabase:", e);
          setUser(null);
          localStorage.removeItem('crm_alex_session');
        }
      } else {
        // Local mode fallback
        const savedSession = localStorage.getItem('crm_alex_session');
        if (savedSession) {
          try {
            setUser(JSON.parse(savedSession));
          } catch (e) {
            localStorage.removeItem('crm_alex_session');
          }
        }
      }

      // 3. Auto transitions
      try {
        await db.autoTransitionPatients();
      } catch (err) {
        console.error("Erro na transição automática de pacientes:", err);
      }

      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (userData: Omit<Usuario, 'senha'>) => {
    setUser(userData);
    localStorage.setItem('crm_alex_session', JSON.stringify(userData));
    const runUpdates = async () => {
      try {
        await db.autoTransitionPatients();
      } catch (err) {
        console.error(err);
      }
    };
    runUpdates();
  };

  const handleLogout = async () => {
    if (user) {
      await db.addLog(user.nome, 'Logoff do sistema', 'Sessão encerrada pelo usuário.');
    }
    if (db.isSupabaseMode() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Erro no signOut do Supabase:", e);
      }
    }
    setUser(null);
    localStorage.removeItem('crm_alex_session');
    setCurrentTab('dashboard');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-[#1E293B] via-[#0f172a] to-[#0A2E36] text-white px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full text-center">
          {/* Logo or Monogram with pulse animation */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-955 font-black text-2xl shadow-xl shadow-emerald-500/20 animate-pulse">
            EA
          </div>
          
          <div className="space-y-2">
            <h2 className="font-outfit font-bold text-lg tracking-wide text-white">Espaço Alex Silveira</h2>
            <p className="text-xs text-slate-400 font-light tracking-widest uppercase">Inicializando CRM...</p>
          </div>
          
          {/* Custom Elegant Skeleton Loader */}
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full w-2/3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Dynamic header tab name translator
  const getTabName = () => {
    switch (currentTab) {
      case 'dashboard': return 'Dashboard Executivo';
      case 'pacientes': return 'Fichas de Pacientes';
      case 'novo-paciente': return 'Fichas de Pacientes';
      case 'importacao': return 'Importar Pacientes (Excel)';
      case 'analise': return 'Análise de Desempenho Mensal';
      case 'novos-mes': return 'Histórico de Novos Clientes';
      case 'relatorios': return 'Exportação de Relatórios Gerenciais';
      case 'exclusao-lote': return 'Exclusão de Pacientes em Lote';
      case 'configuracoes': return 'Configurações de Prontuário';
      case 'usuarios': return 'Administradores do Sistema';
      default: return 'CRM Espaço Alex';
    }
  };

  return (
    <Layout 
      collapsed={sidebarCollapsed} 
      setCollapsed={setSidebarCollapsed}
      currentTabName={getTabName()}
      sidebar={
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={setCurrentTab} 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed}
          onLogout={handleLogout}
          userName={user.nome}
        />
      }
    >
      {/* Sub-views routing logic */}
      <div className="w-full">
        {currentTab === 'dashboard' && (
          <Dashboard 
            setCurrentTab={setCurrentTab} 
            navigateToPatients={navigateToPatients}
          />
        )}
        {currentTab === 'pacientes' && (
          <PatientsList 
            activeUserName={user.nome} 
            initialFilters={patientFilters}
            clearInitialFilters={() => setPatientFilters(null)}
          />
        )}
        {currentTab === 'novo-paciente' && (
          <PatientsList 
            activeUserName={user.nome} 
            triggerFormOpen={true} 
            onFormClosed={() => setCurrentTab('pacientes')} 
            initialFilters={patientFilters}
            clearInitialFilters={() => setPatientFilters(null)}
          />
        )}
        {currentTab === 'importacao' && (
          <ImportExcel activeUserName={user.nome} />
        )}
        {currentTab === 'analise' && <MonthlyAnalysis />}
        {currentTab === 'novos-mes' && <NewPatientsHistory />}
        {currentTab === 'relatorios' && <Reports />}
        {currentTab === 'configuracoes' && (
          <Settings activeUserName={user.nome} />
        )}
        {currentTab === 'usuarios' && (
          <Users activeUserName={user.nome} />
        )}
        {currentTab === 'exclusao-lote' && (
          <BulkDelete activeUserName={user.nome} />
        )}
      </div>
    </Layout>
  );

}

export default App;
