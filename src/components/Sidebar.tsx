import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Upload, 
  BarChart3, 
  FileText, 
  Settings, 
  UserCog, 
  LogOut, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
  userName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  onLogout,
  userName
}) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'pacientes', name: 'Pacientes', icon: Users },
    { id: 'novo-paciente', name: 'Novo Paciente', icon: UserPlus },
    { id: 'importacao', name: 'Importação Excel', icon: Upload },
    { id: 'analise', name: 'Análise Mensal', icon: BarChart3 },
    { id: 'relatorios', name: 'Relatórios', icon: FileText },
    { id: 'configuracoes', name: 'Configurações', icon: Settings },
    { id: 'usuarios', name: 'Usuários', icon: UserCog }
  ];

  return (
    <aside 
      className={`fixed top-0 z-30 h-screen bg-brand-blue-dark text-white border-r border-slate-800 transition-all duration-300 flex flex-col justify-between md:left-0 md:translate-x-0 ${
        collapsed ? '-translate-x-full md:w-20' : 'left-0 translate-x-0 w-64 md:w-64'
      }`}
    >
      {/* Header section with brand */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-850">
          {!collapsed ? (
            <div className="flex items-center gap-2 select-none animate-fade-in">
              <img 
                src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipobranco.png" 
                alt="Logo Espaço Alex" 
                className="h-8 w-auto object-contain max-w-[150px]"
                onError={(e) => {
                  // Fallback to text if remote image fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <img 
                src="https://www.psicologoalexsilveira.com.br/assets/imgs/favicon/favicon-96x96.png" 
                alt="Icon Espaço Alex" 
                className="h-7 w-7 object-contain"
                onError={(e) => {
                  // Fallback to generic dot if remote image fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer hidden md:block"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>


        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-brand-green-primary text-white shadow-md shadow-emerald-950/20' 
                    : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer section with User info & logout */}
      <div className="p-3 border-t border-slate-850">
        {!collapsed && (
          <div className="px-3 py-2 mb-2 rounded-xl bg-slate-850 text-slate-300 text-xs truncate flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-green-primary animate-pulse" />
            <span>Olá, <strong className="text-white">{userName}</strong></span>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all cursor-pointer`}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};
