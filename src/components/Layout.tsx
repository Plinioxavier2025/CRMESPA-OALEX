import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Cloud, 
  CloudOff, 
  History,
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { db } from '../services/db';
import type { Log } from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentTabName: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  sidebar,
  collapsed, 
  setCollapsed,
  currentTabName
}) => {
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const isCloud = db.isSupabaseMode();

  const fetchLogs = async () => {
    try {
      const auditLogs = await db.getLogs();
      setLogs(auditLogs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (logsOpen) {
      fetchLogs();
    }
  }, [logsOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebar}
      {/* Top Navbar & Contents Container */}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        collapsed ? 'md:pl-20' : 'md:pl-64'
      }`}>
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-slate-55 hover:text-brand-blue-dark transition-colors md:hidden text-slate-500 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-brand-blue-dark font-outfit truncate">{currentTabName}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Supabase Status Indicator Badge */}
            <div className="relative group">
              {isCloud ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                  <Cloud className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="hidden sm:inline">Supabase Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                  <CloudOff className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">Banco Local Simulado</span>
                </div>
              )}
              
              {/* Status Info Tooltip */}
              <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="flex items-center gap-1.5 font-semibold text-slate-100 mb-1 border-b border-slate-800 pb-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Modo de Armazenamento</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-light">
                  {isCloud 
                    ? "O sistema está gravando diretamente no banco de dados na nuvem Supabase." 
                    : "Os dados estão salvos apenas no seu navegador (localStorage). Para conectar à nuvem, crie o arquivo .env com suas chaves."}
                </p>
              </div>
            </div>

            {/* Audit Logs Trigger */}
            <button
              onClick={() => setLogsOpen(!logsOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-brand-blue-dark hover:bg-slate-100 transition-all cursor-pointer relative"
              title="Registro de Alterações"
            >
              <History className="w-5 h-5" />
            </button>

            {/* Brand Logo inside Navbar */}
            <div className="h-9 flex items-center pl-2 border-l border-slate-100">
              <img 
                src="https://www.psicologoalexsilveira.com.br/assets/imgs/logotipo.png" 
                alt="Logo Espaço Alex" 
                className="h-8 w-auto object-contain max-w-[120px] select-none"
                onError={(e) => {
                  // If remote logo fails to load, replace with clean text block
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto animate-slide-up">
          {children}
        </main>
      </div>

      {/* Audit Logs Right Drawer */}
      {logsOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Overlay */}
          <div 
            onClick={() => setLogsOpen(false)} 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-100 flex flex-col z-50 animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-blue-dark" />
                <h3 className="font-outfit font-bold text-lg text-brand-blue-dark">Registro de Alterações</h3>
              </div>
              <button 
                onClick={() => setLogsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-medium">Últimos registros de auditoria</span>
                <button 
                  onClick={fetchLogs}
                  className="flex items-center gap-1 text-[10px] text-brand-blue-primary hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Atualizar</span>
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm font-light">
                  Nenhum registro de auditoria disponível.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-brand-blue-dark">{log.usuario_nome}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800">{log.acao}</div>
                    {log.detalhes && (
                      <p className="text-slate-500 font-light leading-relaxed bg-white p-2 rounded-lg border border-slate-100">
                        {log.detalhes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
