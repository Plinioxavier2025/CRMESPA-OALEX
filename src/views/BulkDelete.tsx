import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../services/db';
import type { Paciente } from '../services/db';
import { 
  Trash2, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Filter, 
  Info,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface BulkDeleteProps {
  activeUserName: string;
}

export const BulkDelete: React.FC<BulkDeleteProps> = ({ activeUserName }) => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Paciente['status'] | ''>('Inativo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Security Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [securityInput, setSecurityInput] = useState('');

  const loadPatients = async () => {
    if (!selectedStatus) {
      setPatients([]);
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const allPatients = await db.getPacientes();
      const filtered = allPatients.filter(p => p.status === selectedStatus);
      setPatients(filtered);
      setSelectedIds(new Set()); // Reset selections on status change
    } catch (e) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Erro ao carregar os pacientes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [selectedStatus]);

  // Filter patients by search term
  const searchedPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    const cleanTerm = searchTerm.replace(/\D/g, '');
    const cleanPhone = p.telefone.replace(/\D/g, '');
    return !term || 
      p.nome.toLowerCase().includes(term) ||
      p.convenio.toLowerCase().includes(term) ||
      (cleanTerm && cleanPhone.includes(cleanTerm)) ||
      p.telefone.includes(term);
  });

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const ids = searchedPatients.map(p => p.id);
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectBatch = (limit: number) => {
    const ids = searchedPatients.slice(0, limit).map(p => p.id);
    setSelectedIds(new Set(ids));
  };

  const handleDeleteTrigger = () => {
    if (selectedIds.size === 0) return;
    setSecurityInput('');
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (securityInput !== 'EXCLUIR') return;
    setIsModalOpen(false);
    setDeleting(true);
    setFeedback(null);
    
    const idsArray = Array.from(selectedIds);
    const count = idsArray.length;
    
    try {
      const success = await db.deletePacientes(idsArray);
      if (success) {
        // Add audit log
        await db.addLog(
          activeUserName,
          'Exclusão em Lote',
          `Exclusão definitiva de ${count} pacientes com o status "${selectedStatus}".`
        );
        
        setFeedback({ 
          type: 'success', 
          message: `${count} pacientes excluídos com sucesso!` 
        });
        setSelectedIds(new Set());
        loadPatients();
      } else {
        setFeedback({ 
          type: 'error', 
          message: 'Houve um erro ao tentar excluir os pacientes.' 
        });
      }
    } catch (e) {
      console.error(e);
      setFeedback({ 
        type: 'error', 
        message: 'Erro de conexão ou permissão ao excluir pacientes.' 
      });
    } finally {
      setDeleting(false);
    }
  };

  const statusOptions: { value: Paciente['status']; label: string }[] = [
    { value: 'Novo Cliente', label: 'Novo Cliente' },
    { value: 'Ativo', label: 'Ativos' },
    { value: 'Desistiu', label: 'Desistentes' },
    { value: 'Inativo', label: 'Inativos' },
  ];

  const allSelected = searchedPatients.length > 0 && searchedPatients.every(p => selectedIds.has(p.id));
  const someSelected = searchedPatients.length > 0 && searchedPatients.some(p => selectedIds.has(p.id)) && !allSelected;

  return (
    <div className="space-y-6 animate-slide-up text-xs font-sans">
      
      {/* Intro Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
        <div className="p-3.5 bg-red-50 text-red-600 rounded-2xl">
          <Trash2 className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-brand-blue-dark font-outfit font-black">Exclusão de Pacientes em Lote</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
            Selecione uma categoria de status de pacientes para ver a listagem. Você poderá selecionar vários ou todos os registros e excluí-los permanentemente do sistema de uma só vez.
          </p>
        </div>
      </div>

      {/* Warnings & Alerts */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-amber-850 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-900 font-outfit mb-0.5">Atenção: Ação Irreversível</h4>
          <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
            A exclusão removerá permanentemente os registros do banco de dados (tanto no Supabase quanto localmente). Não é possível recuperar os dados dos pacientes após essa operação. Recomendamos exportar relatórios ou fazer backup antes de prosseguir.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-red-50 text-red-800 border-red-100'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <span className="text-[11px]">{feedback.message}</span>
        </div>
      )}

      {/* Filters & Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
            {/* Status Selector */}
            <div className="space-y-1.5 min-w-[200px] w-full sm:w-auto">
              <label className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Filtrar por Status</label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as Paciente['status'])}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all appearance-none bg-white font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="">-- Selecione um Status --</option>
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Internal Search */}
            {selectedStatus && (
              <div className="space-y-1.5 flex-1 min-w-[220px]">
                <label className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Pesquisa rápida no lote</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar por nome, telefone ou convênio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all placeholder:text-slate-400 bg-white font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}
          </div>

          {selectedStatus && (
            <button
              onClick={loadPatients}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-brand-blue-dark transition-all cursor-pointer flex items-center justify-center"
              title="Recarregar lista"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Selected Count & Action Bar */}
        {selectedStatus && !loading && patients.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50 rounded-xl gap-3 border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-blue-primary flex-shrink-0" />
                <span className="text-[11px] font-medium text-slate-600">
                  <strong>{selectedIds.size}</strong> de {searchedPatients.length} selecionados.
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelectBatch(20)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  Selecionar 20
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBatch(50)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  Selecionar 50
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Limpar Seleção
                  </button>
                )}
              </div>
            </div>
            
            <button
              onClick={handleDeleteTrigger}
              disabled={selectedIds.size === 0 || deleting}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                selectedIds.size > 0 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-950/10' 
                  : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Selecionados ({selectedIds.size})</span>
            </button>
          </div>
        )}

        {/* Patients Table */}
        {selectedStatus ? (
          loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-3 border-brand-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-450 font-medium">Buscando pacientes no banco de dados...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <UserX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-650 text-sm font-outfit">Nenhum paciente encontrado</h3>
              <p className="text-slate-400 font-light mt-1 max-w-sm mx-auto">
                Não há pacientes registrados com o status <strong>"{selectedStatus}"</strong> no sistema no momento.
              </p>
            </div>
          ) : searchedPatients.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-650 text-sm font-outfit">Nenhum resultado para a busca</h3>
              <p className="text-slate-400 font-light mt-1">
                Tente alterar os termos de pesquisa rápida.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-brand-green-primary focus:ring-brand-green-primary/30 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Nome do Paciente</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">Convênio</th>
                    <th className="py-3 px-4">Cadastro em</th>
                    <th className="py-3 px-4">Última Atualização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {searchedPatients.map((p) => {
                    const isSelected = selectedIds.has(p.id);
                    return (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-red-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(p.id)}
                            className="w-4 h-4 rounded border-slate-300 text-red-650 focus:ring-red-650/30 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-brand-blue-dark">
                          {p.nome}
                        </td>
                        <td className="py-3 px-4 text-[11px] font-mono text-slate-500">
                          {p.telefone}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            {p.convenio}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-450 font-normal">
                          {new Date(p.data_cadastro + 'T' + p.hora_cadastro).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-slate-450 font-normal">
                          {new Date(p.data_ultima_atualizacao + 'T' + p.hora_ultima_atualizacao).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Filter className="w-10 h-10 text-slate-350 mx-auto mb-3" />
            <h3 className="font-bold text-slate-650 text-sm font-outfit">Selecione um status acima</h3>
            <p className="text-slate-400 font-light mt-1">
              Escolha uma categoria de status de pacientes para começar a gerenciar o lote.
            </p>
          </div>
        )}
      </div>

      {/* Safety Confirmation Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up z-10">
            
            {/* Modal Header */}
            <div className="bg-red-50 p-5 border-b border-red-100 flex items-start gap-3.5">
              <div className="p-2.5 bg-red-100 text-red-650 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-900 font-outfit">Confirmar Exclusão em Lote</h3>
                <p className="text-[10px] text-red-700/80 font-medium mt-0.5">Operação de segurança obrigatória</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed text-xs">
                Você está prestes a excluir definitivamente <strong>{selectedIds.size}</strong> pacientes com status <strong>"{selectedStatus}"</strong>. 
                Esta ação apagará todos os dados associados a estes cadastros permanentemente.
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ação requerida</span>
                <p className="text-slate-700 leading-relaxed font-semibold">
                  Para prosseguir, digite a palavra <strong className="text-red-600">EXCLUIR</strong> no campo abaixo:
                </p>
                <input
                  type="text"
                  required
                  placeholder="Digite EXCLUIR em maiúsculas"
                  value={securityInput}
                  onChange={(e) => setSecurityInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none transition-all placeholder:text-slate-350 text-center font-bold tracking-widest text-slate-800 bg-white uppercase"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={securityInput !== 'EXCLUIR'}
                className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  securityInput === 'EXCLUIR' 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/10' 
                    : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

// Auxiliary UserX icon which is missing in lucide-react standard set or just uses custom inline SVG
const UserX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="17" x2="22" y1="8" y2="13" />
    <line x1="22" x2="17" y1="8" y2="13" />
  </svg>
);
