import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Paciente } from '../services/db';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye, 
  HelpCircle, 
  Calendar, 
  ChevronDown, 
  RefreshCw, 
  X,
  UserCheck2,
  ShieldAlert,
  ArrowUpDown,
  Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PatientForm } from '../components/PatientForm';

interface PatientsListProps {
  activeUserName: string;
  triggerFormOpen?: boolean;
  onFormClosed?: () => void;
  initialFilters?: { status?: string; month?: string; year?: string; excludePlanilha?: boolean } | null;
  clearInitialFilters?: () => void;
}

export const PatientsList: React.FC<PatientsListProps> = ({ 
  activeUserName,
  triggerFormOpen = false,
  onFormClosed,
  initialFilters = null,
  clearInitialFilters
}) => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterConvenio, setFilterConvenio] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [excludePlanilha, setExcludePlanilha] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<'nome' | 'data_cadastro'>('nome');
  const [sortAscending, setSortAscending] = useState(true);

  // Modals state
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Paciente | null>(null);

  // Dyn lists
  const [conveniosList, setConveniosList] = useState<string[]>([]);
  
  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await db.getPacientes();
      setPatients(data);
      const convs = await db.getConfig('convenios');
      if (convs) setConveniosList(convs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (initialFilters) {
      setFilterStatus(initialFilters.status || '');
      setFilterMonth(initialFilters.month || '');
      setFilterYear(initialFilters.year || '');
      setExcludePlanilha(initialFilters.excludePlanilha || false);
      
      if (initialFilters.status || initialFilters.month || initialFilters.year || initialFilters.excludePlanilha) {
        setShowFilters(true);
      }
      
      if (clearInitialFilters) {
        clearInitialFilters();
      }
    }
  }, [initialFilters, clearInitialFilters]);

  // Listen to triggering creation form from sidebar shortcut
  useEffect(() => {
    if (triggerFormOpen) {
      setSelectedPatient(null);
      setIsEditOpen(true);
    }
  }, [triggerFormOpen]);

  const handleEditSubmit = () => {
    setIsEditOpen(false);
    setSelectedPatient(null);
    if (onFormClosed) onFormClosed();
    loadPatients();
  };

  const handleEditCancel = () => {
    setIsEditOpen(false);
    setSelectedPatient(null);
    if (onFormClosed) onFormClosed();
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;
    try {
      await db.deletePaciente(patientToDelete.id);
      await db.addLog(
        activeUserName, 
        'Paciente excluído', 
        `Excluído cadastro do paciente ${patientToDelete.nome} (Telefone: ${patientToDelete.telefone}).`
      );
      setIsDeleteOpen(false);
      setPatientToDelete(null);
      loadPatients();
    } catch (e) {
      console.error(e);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterConvenio('');
    setFilterMonth('');
    setFilterYear('');
    setFilterReason('');
    setFilterStartDate('');
    setFilterEndDate('');
    setExcludePlanilha(false);
  };

  // ----------------------------------------------------
  // FILTERING LOGIC
  // ----------------------------------------------------
  const filteredPatients = patients.filter((p) => {
    // 1. Text Search matching Nome, Telefone or Convênio
    const term = search.toLowerCase();
    const matchSearch = !term || 
      p.nome.toLowerCase().includes(term) ||
      p.telefone.includes(term) ||
      p.convenio.toLowerCase().includes(term);

    // 2. Status Filter
    const matchStatus = !filterStatus || p.status === filterStatus;

    // 3. Convênio Filter
    const matchConvenio = !filterConvenio || p.convenio === filterConvenio;

    // 4. Registration or Dropout Month / Year
    let patientYear = '';
    let patientMonth = '';
    if (p.status === 'Desistiu') {
      const [upYear, upMonth] = p.data_ultima_atualizacao.split('-');
      patientYear = upYear;
      patientMonth = upMonth;
    } else {
      const [regYear, regMonth] = p.data_cadastro.split('-');
      patientYear = regYear;
      patientMonth = regMonth;
    }
    const matchMonth = !filterMonth || patientMonth === filterMonth;
    const matchYear = !filterYear || patientYear === filterYear;

    // 5. Dropout Reason Filter
    let matchReason = true;
    if (filterReason) {
      if (p.status !== 'Desistiu' || !p.motivo_desistencia) {
        matchReason = false;
      } else {
        matchReason = p.motivo_desistencia.startsWith(filterReason) || 
          (filterReason === 'Outro' && p.motivo_desistencia.startsWith('Outro'));
      }
    }

    // 6. Period Range (Date start/end)
    const matchPeriod = (!filterStartDate || p.data_cadastro >= filterStartDate) &&
                        (!filterEndDate || p.data_cadastro <= filterEndDate);

    // 7. Exclude sheet imports
    const matchExcludePlanilha = !excludePlanilha || !p.usuario_cadastro?.includes('Planilha');

    return matchSearch && matchStatus && matchConvenio && matchMonth && matchYear && matchReason && matchPeriod && matchExcludePlanilha;
  });

  // ----------------------------------------------------
  // SORTING LOGIC
  // ----------------------------------------------------
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'nome') {
      comparison = a.nome.localeCompare(b.nome);
    } else if (sortField === 'data_cadastro') {
      comparison = a.data_cadastro.localeCompare(b.data_cadastro);
    }
    return sortAscending ? comparison : -comparison;
  });

  const toggleSort = (field: 'nome' | 'data_cadastro') => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  const exportFilteredToPDF = () => {
    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString('pt-BR');
      
      let titleText = 'Relatório Geral de Pacientes';
      if (filterStatus) {
        titleText = `Relatório de Pacientes - Status: ${filterStatus}`;
      } else if (search) {
        titleText = 'Relatório Filtrado de Pacientes';
      }
      
      // Header branding
      doc.setFillColor(13, 46, 94); // Navy blue primary color
      doc.rect(0, 0, 210, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('CRM ESPAÇO ALEX', 15, 18);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(200, 220, 255);
      doc.text('Espaço Alex Silveira - Consultório de Psicologia', 15, 24);
      doc.text(`Gerado em: ${currentDate}`, 160, 24);

      // Title
      doc.setTextColor(13, 46, 94);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(titleText, 15, 42);

      // Table columns (same order as table)
      const tableHeaders = [['Nome Completo', 'Telefone', 'Convênio', 'Status', 'Data Cadastro']];
      
      const formatD = (dStr: string) => {
        const parts = dStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dStr;
      };

      const tableRows = sortedPatients.map(p => [
        p.nome,
        p.telefone,
        p.convenio,
        p.status,
        formatD(p.data_cadastro)
      ]);

      // Call AutoTable plugin
      autoTable(doc, {
        startY: 48,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [13, 46, 94], 
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        margin: { horizontal: 15 },
      });

      const statusSuffix = filterStatus ? `_${filterStatus.toLowerCase().replace(/\s+/g, '_')}` : '';
      const finalFileName = `relatorio_pacientes${statusSuffix}.pdf`;

      doc.save(finalFileName);
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      alert('Erro ao gerar relatório em PDF.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic forms popup modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={handleEditCancel} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl z-10 animate-slide-up">
            <PatientForm 
              patient={selectedPatient || undefined}
              onSubmit={handleEditSubmit}
              onCancel={handleEditCancel}
              activeUserName={activeUserName}
            />
          </div>
        </div>
      )}

      {/* Primary Actions and Searches Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Quick text search */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Pesquisar por nome, telefone ou convênio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 text-sm outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showFilters 
                  ? 'bg-slate-100 border-slate-300 text-slate-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros Avançados</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Refresh */}
            <button
              onClick={loadPatients}
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-brand-blue-dark transition-all cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Export PDF */}
            <button
              onClick={exportFilteredToPDF}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-brand-blue-dark text-xs font-bold rounded-xl transition-all cursor-pointer"
              title="Exportar lista atual de pacientes para PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>

            {/* Register Shortcut */}
            <button
              onClick={() => {
                setSelectedPatient(null);
                setIsEditOpen(true);
              }}
              className="ml-auto md:ml-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-blue-dark hover:bg-brand-blue-primary text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              <span>+ Novo Paciente</span>
            </button>
          </div>
        </div>

        {/* Collapsible filters options block */}
        {showFilters && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in text-xs">
            
            {/* Filter Status */}
            <div className="space-y-1.5">
              <label htmlFor="filter-status" className="font-semibold text-slate-500">Status</label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 outline-none bg-white"
              >
                <option value="">Todos</option>
                <option value="Novo Cliente">Novo Cliente</option>
                <option value="Ativo">Ativo</option>
                <option value="Desistiu">Desistiu</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            {/* Filter Convênio */}
            <div className="space-y-1.5">
              <label htmlFor="filter-convenio" className="font-semibold text-slate-500">Convênio</label>
              <select
                id="filter-convenio"
                value={filterConvenio}
                onChange={(e) => setFilterConvenio(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 outline-none bg-white"
              >
                <option value="">Todos</option>
                {conveniosList.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter Month */}
            <div className="space-y-1.5">
              <label htmlFor="filter-month" className="font-semibold text-slate-500">Mês Cadastro</label>
              <select
                id="filter-month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 outline-none bg-white"
              >
                <option value="">Todos</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>

            {/* Filter Year */}
            <div className="space-y-1.5">
              <label htmlFor="filter-year" className="font-semibold text-slate-500">Ano Cadastro</label>
              <select
                id="filter-year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 outline-none bg-white"
              >
                <option value="">Todos</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            {/* Filter Date Range (Start) */}
            <div className="space-y-1.5">
              <label htmlFor="filter-start-date" className="font-semibold text-slate-500">Período De</label>
              <input
                id="filter-start-date"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 outline-none bg-white"
              />
            </div>

            {/* Filter Date Range (End) */}
            <div className="space-y-1.5">
              <label htmlFor="filter-end-date" className="font-semibold text-slate-500">Período Até</label>
              <input
                id="filter-end-date"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 outline-none bg-white"
              />
            </div>

            {/* Filter Dropout Reason */}
            <div className="space-y-1.5">
              <label htmlFor="filter-reason" className="font-semibold text-slate-500">Motivo Desistência</label>
              <select
                id="filter-reason"
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 outline-none bg-white"
              >
                <option value="">Todos</option>
                <option value="Questão financeira">Questão financeira</option>
                <option value="Mudança de cidade">Mudança de cidade</option>
                <option value="Insatisfação">Insatisfação</option>
                <option value="Alta terapêutica">Alta terapêutica</option>
                <option value="Falta de tempo">Falta de tempo</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            
            {/* Ocultar Importados (Planilha) */}
            <div className="flex items-center gap-2 pt-5 select-none">
              <input
                id="filter-exclude-planilha"
                type="checkbox"
                checked={excludePlanilha}
                onChange={(e) => setExcludePlanilha(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-blue-primary focus:ring-brand-blue-primary cursor-pointer font-semibold"
              />
              <label htmlFor="filter-exclude-planilha" className="font-semibold text-slate-500 cursor-pointer">
                Excluir Planilhas
              </label>
            </div>

            {/* Reset Filters button */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full p-2 rounded-lg border border-slate-200 hover:border-slate-350 text-slate-500 font-semibold bg-white transition-all cursor-pointer text-center"
              >
                Limpar Todos Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-brand-blue-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3 font-light">Carregando prontuário de pacientes...</p>
          </div>
        ) : sortedPatients.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 font-outfit text-sm">Nenhum Paciente Encontrado</h3>
            <p className="text-xs text-slate-400 font-light max-w-sm mx-auto">
              Nenhum paciente corresponde aos filtros ou buscas aplicados no momento. Tente expandir sua pesquisa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-brand-blue-dark transition-colors"
                    onClick={() => toggleSort('nome')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nome Completo</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4">Telefone</th>
                  <th className="p-4">Convênio</th>
                  <th className="p-4">Status</th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-brand-blue-dark transition-colors"
                    onClick={() => toggleSort('data_cadastro')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Data de Cadastro</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-4">Última Atualização</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-light">
                {sortedPatients.map((p) => {
                  let statusBadge = '';
                  if (p.status === 'Ativo') {
                    statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  } else if (p.status === 'Novo Cliente') {
                    statusBadge = 'bg-blue-50 text-blue-700 border-blue-100';
                  } else if (p.status === 'Inativo') {
                    statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                  } else {
                    statusBadge = 'bg-red-50 text-red-700 border-red-100';
                  }

                  // Format dates
                  const formatD = (dStr: string) => {
                    const parts = dStr.split('-');
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    return dStr;
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-brand-blue-dark">{p.nome}</td>
                      <td className="p-4 font-mono font-medium">{p.telefone}</td>
                      <td className="p-4 font-medium">{p.convenio}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusBadge}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatD(p.data_cadastro)}</span>
                        </div>
                      </td>
                      <td className="p-4">{formatD(p.data_ultima_atualizacao)} às {p.hora_ultima_atualizacao}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 text-slate-500 hover:text-brand-blue-dark transition-all cursor-pointer"
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setIsEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 text-slate-500 hover:text-brand-blue-primary transition-all cursor-pointer"
                            title="Editar Paciente"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setPatientToDelete(p);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                            title="Excluir Paciente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {isDetailOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsDetailOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl z-10 overflow-hidden animate-slide-up">
            <div className="p-4 bg-brand-blue-dark text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserCheck2 className="w-5 h-5 text-brand-green-primary" />
                <span className="font-outfit font-extrabold text-sm uppercase tracking-wide">Ficha do Paciente</span>
              </div>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-700">
              <div className="border-b border-slate-100 pb-4 space-y-1">
                <h3 className="text-lg font-bold text-brand-blue-dark font-outfit leading-tight">{selectedPatient.nome}</h3>
                <span className="text-[10px] text-slate-400 font-mono">ID: {selectedPatient.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Telefone</span>
                  <span className="font-mono font-medium text-slate-800">{selectedPatient.telefone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Convênio/Modalidade</span>
                  <span className="font-medium text-slate-800">{selectedPatient.convenio}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Status Atual</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] mt-0.5 ${
                    selectedPatient.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    selectedPatient.status === 'Novo Cliente' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    selectedPatient.status === 'Inativo' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-red-50 text-red-700 border border-red-100'
                  }`}>{selectedPatient.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Usuário que Cadastrou</span>
                  <span className="font-medium text-slate-800">{selectedPatient.usuario_cadastro}</span>
                </div>
              </div>

              {selectedPatient.status === 'Desistiu' && selectedPatient.motivo_desistencia && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 space-y-1">
                  <span className="font-bold block text-amber-850">Motivo da Desistência:</span>
                  <p className="font-light leading-relaxed">{selectedPatient.motivo_desistencia}</p>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 text-[10px] text-slate-400">
                <div>
                  <span>Data do Cadastro</span>
                  <strong className="block text-slate-600 mt-0.5">{selectedPatient.data_cadastro} às {selectedPatient.hora_cadastro}</strong>
                </div>
                <div>
                  <span>Última Atualização</span>
                  <strong className="block text-slate-600 mt-0.5">{selectedPatient.data_ultima_atualizacao} às {selectedPatient.hora_ultima_atualizacao}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-xl text-slate-700 transition-all cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsDeleteOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl z-10 overflow-hidden animate-slide-up p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-800 font-outfit text-base">Confirmar Exclusão</h3>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Você tem certeza que deseja excluir permanentemente o paciente <strong className="text-slate-700">{patientToDelete.nome}</strong>?
                Esta ação registrará um log de auditoria e não poderá ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteOpen(false);
                  setPatientToDelete(null);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="py-2.5 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl transition-all shadow-md shadow-red-900/10 cursor-pointer text-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
