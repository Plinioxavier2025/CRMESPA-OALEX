import { useState, useEffect } from 'react';
import { Login } from './views/Login';
import { Sidebar } from './components/Sidebar';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { PatientsList } from './views/PatientsList';
import { ImportExcel } from './views/ImportExcel';
import { MonthlyAnalysis } from './views/MonthlyAnalysis';
import { Reports } from './views/Reports';
import { Settings } from './views/Settings';
import { Users } from './views/Users';
import { db } from './services/db';
import type { Usuario } from './services/db';

function App() {
  const [user, setUser] = useState<Omit<Usuario, 'senha'> | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check login session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('crm_alex_session');
    if (savedSession) {
      try {
        setUser(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem('crm_alex_session');
      }
    }
    setCheckingSession(false);
  }, []);

  const handleLoginSuccess = (userData: Omit<Usuario, 'senha'>) => {
    setUser(userData);
    localStorage.setItem('crm_alex_session', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    if (user) {
      await db.addLog(user.nome, 'Logoff do sistema', 'Sessão encerrada pelo usuário.');
    }
    setUser(null);
    localStorage.removeItem('crm_alex_session');
    setCurrentTab('dashboard');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-blue-primary border-t-transparent rounded-full animate-spin" />
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
      case 'relatorios': return 'Exportação de Relatórios Gerenciais';
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
          <Dashboard setCurrentTab={setCurrentTab} />
        )}
        {currentTab === 'pacientes' && (
          <PatientsList activeUserName={user.nome} />
        )}
        {currentTab === 'novo-paciente' && (
          <PatientsList 
            activeUserName={user.nome} 
            triggerFormOpen={true} 
            onFormClosed={() => setCurrentTab('pacientes')} 
          />
        )}
        {currentTab === 'importacao' && (
          <ImportExcel activeUserName={user.nome} />
        )}
        {currentTab === 'analise' && <MonthlyAnalysis />}
        {currentTab === 'relatorios' && <Reports />}
        {currentTab === 'configuracoes' && (
          <Settings activeUserName={user.nome} />
        )}
        {currentTab === 'usuarios' && (
          <Users activeUserName={user.nome} />
        )}
      </div>
    </Layout>
  );

}

export default App;
