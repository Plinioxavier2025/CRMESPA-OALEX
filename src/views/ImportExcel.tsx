import React, { useState, useRef, useEffect } from 'react';
import { db } from '../services/db';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  HelpCircle,
  FileCheck,
  Play,
  History,
  Trash2,
  Calendar,
  Copy
} from 'lucide-react';

interface ImportReport {
  total: number;
  imported: number;
  updated: number;
  ignored: number;
  errors: number;
  details: string[];
}

export const ImportExcel: React.FC<{ activeUserName: string }> = ({ activeUserName }) => {
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'history'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'update' | 'ignore'>('update');
  const [parsing, setParsing] = useState(false);
  const [validationReport, setValidationReport] = useState<{
    valid: any[];
    duplicates: any[];
    sheetDuplicates: any[];
    errors: any[];
  } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History & Undo States
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyImports, setHistoryImports] = useState<{
    importId: string;
    importadoEm: string;
    totalPacientes: number;
    names: string[];
  }[]>([]);
  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);

  // Fetch history when tab switches or action completes
  const fetchImportHistory = async () => {
    setLoadingHistory(true);
    try {
      const patients = await db.getPacientes();
      // Group by import_id
      const groups: { [key: string]: { importadoEm: string; names: string[] } } = {};
      
      patients.forEach(p => {
        if (p.import_id && p.importado_em) {
          if (!groups[p.import_id]) {
            groups[p.import_id] = {
              importadoEm: p.importado_em,
              names: []
            };
          }
          groups[p.import_id].names.push(p.nome);
        }
      });

      const history = Object.keys(groups).map(importId => ({
        importId,
        importadoEm: groups[importId].importadoEm,
        totalPacientes: groups[importId].names.length,
        names: groups[importId].names
      }));

      // Sort by importadoEm descending
      history.sort((a, b) => new Date(b.importadoEm).getTime() - new Date(a.importadoEm).getTime());
      setHistoryImports(history);
    } catch (e) {
      console.error("Erro ao buscar histórico de importações:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchImportHistory();
    }
  }, [activeSubTab]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setValidationReport(null);
      setReport(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationReport(null);
      setReport(null);
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  // ----------------------------------------------------
  // PARSING & VALIDATION PROCESS
  // ----------------------------------------------------
  const handleParse = () => {
    if (!file) return;
    setParsing(true);
    setReport(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rawJson.length === 0) {
          alert('A planilha está vazia!');
          setParsing(false);
          return;
        }

        // Fetch existing patients to run duplicate verification checks
        const existingPatients = await db.getPacientes();

        const valid: any[] = [];
        const duplicates: any[] = [];
        const sheetDuplicates: any[] = [];
        const errors: any[] = [];

        const seenNamesInSheet = new Set<string>();
        const seenPhonesInSheet = new Set<string>();

        rawJson.forEach((row, index) => {
          // Normalize column headers to support multiple variations
          let nomeVal = '';
          let telVal = '';
          let convVal = '';

          // Look for key match terms
          Object.keys(row).forEach((key) => {
            const keyLower = key.toLowerCase().trim();
            const normalizedKey = keyLower.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
            
            if (normalizedKey.includes('nome') || normalizedKey.includes('paciente') || normalizedKey.includes('cliente')) {
              nomeVal = String(row[key]);
            } else if (normalizedKey.includes('fone') || normalizedKey.includes('tel') || normalizedKey.includes('celular') || normalizedKey.includes('contato')) {
              telVal = String(row[key]);
            } else if (normalizedKey.includes('convenio') || normalizedKey.includes('plano') || normalizedKey.includes('modalidade') || normalizedKey.includes('sessao')) {
              convVal = String(row[key]);
            }
          });

          // Row validation check
          const rowNum = index + 2; // spreadsheet 1-indexed header is row 1
          if (!nomeVal.trim()) {
            errors.push({ rowNum, data: row, reason: 'Nome completo ausente ou vazio.' });
            return;
          }

          // Clean up phone number digits
          const cleanPhoneDigits = telVal.replace(/\D/g, '');
          if (cleanPhoneDigits.length < 10) {
            errors.push({ rowNum, data: row, reason: `Telefone inválido ou curto: "${telVal}". Deve conter DDD.` });
            return;
          }

          // Format phone number to standard format
          let formattedPhone = '';
          if (cleanPhoneDigits.length === 10) {
            formattedPhone = `(${cleanPhoneDigits.slice(0, 2)}) ${cleanPhoneDigits.slice(2, 6)}-${cleanPhoneDigits.slice(6)}`;
          } else {
            formattedPhone = `(${cleanPhoneDigits.slice(0, 2)}) ${cleanPhoneDigits.slice(2, 7)}-${cleanPhoneDigits.slice(7, 11)}`;
          }

          // Fallback to "Particular" if no convenio is present
          const finalConvenio = convVal.trim() || 'Particular';

          const entry = {
            nome: nomeVal.trim(),
            telefone: formattedPhone,
            convenio: finalConvenio,
            status: 'Ativo' as const,
            rowNum
          };

          // 1. Check for duplicates within the spreadsheet itself first
          const nameNorm = entry.nome.toLowerCase().trim();
          if (seenNamesInSheet.has(nameNorm) || (cleanPhoneDigits && seenPhonesInSheet.has(cleanPhoneDigits))) {
            sheetDuplicates.push({
              ...entry,
              reason: seenNamesInSheet.has(nameNorm) 
                ? 'Nome duplicado na planilha' 
                : 'Telefone duplicado na planilha'
            });
            return;
          }

          // Track this record as seen in spreadsheet
          seenNamesInSheet.add(nameNorm);
          if (cleanPhoneDigits) {
            seenPhonesInSheet.add(cleanPhoneDigits);
          }

          // 2. Check for duplicate against the existing database
          const isDuplicate = existingPatients.find(
            (p) => p.nome.toLowerCase() === entry.nome.toLowerCase() || p.telefone.replace(/\D/g, '') === cleanPhoneDigits
          );

          if (isDuplicate) {
            duplicates.push({ ...entry, existingId: isDuplicate.id, existingStatus: isDuplicate.status });
          } else {
            valid.push(entry);
          }
        });

        setValidationReport({ valid, duplicates, sheetDuplicates, errors });
      } catch (err) {
        console.error(err);
        alert('Erro ao processar a planilha. Verifique a formatação do arquivo.');
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ----------------------------------------------------
  // SUBMIT IMPORT TO DATABASE
  // ----------------------------------------------------
  const handleImport = async () => {
    if (!validationReport) return;
    setParsing(true);

    const { valid, duplicates, sheetDuplicates } = validationReport;
    let importedCount = 0;
    let updatedCount = 0;
    let ignoredCount = 0;
    const details: string[] = [];

    // Generate unique import ID and importado_em timestamp for the new inserts
    const importId = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const importadoEm = new Date().toISOString();

    try {
      // 1. Insert non-duplicate entries
      for (const item of valid) {
        await db.savePaciente({
          nome: item.nome,
          telefone: item.telefone,
          convenio: item.convenio,
          status: 'Ativo',
          usuario_cadastro: activeUserName + ' (Planilha)',
          import_id: importId,
          importado_em: importadoEm
        });
        importedCount++;
        details.push(`[INSERIDO] Linha ${item.rowNum}: ${item.nome} (${item.convenio})`);
      }

      // 2. Resolve duplicates based on selected policy
      for (const item of duplicates) {
        if (importMode === 'update') {
          // Do NOT assign importId or importadoEm to updated records so they don't get deleted on undo
          await db.savePaciente({
            id: item.existingId,
            nome: item.nome,
            telefone: item.telefone,
            convenio: item.convenio,
            status: item.existingStatus, // Keep existing status or reset to Ativo
            usuario_cadastro: activeUserName + ' (Planilha)'
          });
          updatedCount++;
          details.push(`[ATUALIZADO] Linha ${item.rowNum}: ${item.nome} (${item.convenio})`);
        } else {
          ignoredCount++;
          details.push(`[IGNORADO] Linha ${item.rowNum}: ${item.nome} (Paciente já cadastrado no CRM)`);
        }
      }

      // 3. Log sheet duplicates
      if (sheetDuplicates) {
        for (const item of sheetDuplicates) {
          ignoredCount++;
          details.push(`[IGNORADO - DUPLICADO NA PLANILHA] Linha ${item.rowNum}: ${item.nome} (${item.reason})`);
        }
      }

      // Audit log entry
      const logDetails = `Importados ${importedCount} novos, atualizados ${updatedCount}, ignorados ${ignoredCount}. totalizando ${importedCount + updatedCount} registros.`;
      await db.addLog(activeUserName, 'Importação de Planilha', logDetails);

      setReport({
        total: valid.length + duplicates.length + sheetDuplicates.length,
        imported: importedCount,
        updated: updatedCount,
        ignored: ignoredCount,
        errors: validationReport.errors.length,
        details
      });

      // Clear states
      setFile(null);
      setValidationReport(null);
    } catch (e) {
      console.error(e);
      alert('Ocorreu um erro no meio da importação de dados.');
    } finally {
      setParsing(false);
    }
  };

  // ----------------------------------------------------
  // UNDO IMPORT FROM DATABASE
  // ----------------------------------------------------
  const handleUndoImport = async () => {
    if (!confirmUndoId) return;
    setUndoing(true);
    try {
      const found = historyImports.find(h => h.importId === confirmUndoId);
      const importDateStr = found ? new Date(found.importadoEm).toLocaleString('pt-BR') : '';
      const totalCount = found ? found.totalPacientes : 0;

      const success = await db.deletePacientesByImportId(confirmUndoId);
      if (success) {
        // Log action in audit trails
        await db.addLog(
          activeUserName,
          'Desfazer Importação',
          `Importação realizada em ${importDateStr} desfeita. Removidos ${totalCount} novos pacientes cadastrados no lote.`
        );
        alert(`Importação desfeita com sucesso! ${totalCount} novos pacientes foram removidos.`);
      } else {
        alert('Erro ao tentar desfazer a importação.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro inesperado ao excluir os registros.');
    } finally {
      setConfirmUndoId(null);
      setUndoing(false);
      fetchImportHistory(); // refresh the list
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationReport(null);
    setReport(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Introduction Header with Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-brand-blue-light text-brand-blue-primary rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-blue-dark font-outfit">Importação em Lote</h2>
            <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
              Importe planilhas de pacientes de forma automatizada e desfaça lotes importados se necessário.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 w-full md:w-auto self-stretch md:self-auto justify-stretch">
          <button
            onClick={() => setActiveSubTab('import')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'import'
                ? 'bg-white text-brand-blue-dark shadow-sm font-bold border border-slate-200/20'
                : 'text-slate-500 hover:text-brand-blue-dark'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Planilha</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white text-brand-blue-dark shadow-sm font-bold border border-slate-200/20'
                : 'text-slate-500 hover:text-brand-blue-dark'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Desfazer Importações</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'import' && (
        <>
          {!validationReport && !report && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              {/* File Selection drop target */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleSelectFileClick}
                className="border-2 border-dashed border-slate-200 hover:border-brand-blue-primary rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50/50 hover:bg-brand-blue-light/10 transition-all text-center"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xls,.xlsx"
                  className="hidden"
                />
                <div className="p-4 rounded-full bg-slate-100 text-slate-400 group-hover:bg-brand-blue-light/20 transition-colors">
                  <Upload className="w-8 h-8" />
                </div>
                
                {file ? (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-800 text-sm block">{file.name}</span>
                    <span className="text-[10px] text-slate-400 block">{(file.size / 1024).toFixed(1)} KB • Pronto para leitura</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-600 text-sm block">Arraste a planilha ou clique para selecionar</span>
                    <span className="text-xs text-slate-400 block font-light">Suporta arquivos Excel (.XLS, .XLSX)</span>
                  </div>
                )}
              </div>

              {/* Configuration and Launch */}
              {file && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="space-y-1.5 w-full sm:w-auto">
                    <span className="font-bold text-slate-600 block">Tratamento de Registros Duplicados:</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="dupMode" 
                          checked={importMode === 'update'} 
                          onChange={() => setImportMode('update')}
                          className="accent-brand-blue-primary" 
                        />
                        <span>Atualizar cadastros existentes</span>
                      </label>
                      <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="dupMode" 
                          checked={importMode === 'ignore'} 
                          onChange={() => setImportMode('ignore')}
                          className="accent-brand-blue-primary" 
                        />
                        <span>Ignorar duplicados</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleParse}
                    disabled={parsing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-blue-dark hover:bg-brand-blue-primary text-white font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {parsing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Lendo planilha...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Validar Planilha</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Quick instructions/Tips */}
              <div className="p-4 rounded-2xl bg-brand-blue-light/30 border border-brand-blue-light text-brand-blue-dark text-xs space-y-2">
                <span className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-brand-blue-primary" />
                  <span>Instruções sobre o formato da planilha:</span>
                </span>
                <ul className="list-disc pl-4 space-y-1 font-light leading-relaxed">
                  <li>A planilha deve conter colunas legíveis para: <strong>Nome</strong> (Nome Completo), <strong>Telefone</strong> (com DDD) e <strong>Convênio</strong> (Opcional - ex: SulAmérica, Particular, Care Plus, Vivest).</li>
                  <li>Registros com mesmo nome ou telefone já registrados serão avaliados conforme a opção selecionada (Atualizar ou Ignorar).</li>
                  <li>Linhas sem dados de nome ou com formato de telefone inválido serão listadas na aba de erros para correção.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Validation results preview */}
          {validationReport && !report && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 animate-fade-in text-xs">
              
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Relatório de Validação da Planilha</h3>
                  <p className="text-slate-400 font-light mt-0.5">Analise o diagnóstico abaixo antes de confirmar a gravação no banco de dados.</p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Trocar Arquivo
                </button>
              </div>

              {/* Validation Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Válidos */}
                <div className="p-4 rounded-xl border border-slate-100 bg-emerald-50 text-emerald-800 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <div>
                    <span className="font-bold block text-sm">{validationReport.valid.length}</span>
                    <span className="text-[10px] text-emerald-700 block font-light">Novos válidos</span>
                  </div>
                </div>

                {/* Duplicados BD */}
                <div className="p-4 rounded-xl border border-slate-100 bg-amber-50 text-amber-800 flex items-center gap-3">
                  <FileCheck className="w-8 h-8 text-amber-600" />
                  <div>
                    <span className="font-bold block text-sm">{validationReport.duplicates.length}</span>
                    <span className="text-[10px] text-amber-700 block font-light">
                      Duplicados no CRM ({importMode === 'update' ? 'Atualiza' : 'Ignora'})
                    </span>
                  </div>
                </div>

                {/* Duplicados Planilha */}
                <div className="p-4 rounded-xl border border-slate-100 bg-violet-50 text-violet-850 flex items-center gap-3">
                  <Copy className="w-8 h-8 text-violet-650" />
                  <div>
                    <span className="font-bold block text-sm">{validationReport.sheetDuplicates.length}</span>
                    <span className="text-[10px] text-violet-700 block font-light">Repetidos na Planilha</span>
                  </div>
                </div>

                {/* Erros */}
                <div className="p-4 rounded-xl border border-slate-100 bg-red-50 text-red-800 flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <span className="font-bold block text-sm">{validationReport.errors.length}</span>
                    <span className="text-[10px] text-red-700 block font-light">Com erros críticos</span>
                  </div>
                </div>

              </div>

              {/* Details Tabs preview for errors */}
              {validationReport.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                    <span className="font-bold text-red-850 block">Linhas com Erros Críticos (Serão ignoradas e não importadas):</span>
                    <span className="text-[10px] text-red-700 bg-red-100/60 px-2.5 py-0.5 rounded-md font-bold">Não é obrigatório corrigir para prosseguir</span>
                  </div>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 text-[11px] pr-1">
                    {validationReport.errors.map((err, idx) => (
                      <div key={idx} className="flex justify-between items-center text-red-750 font-light border-b border-red-100/40 pb-1">
                        <span><strong>Linha {err.rowNum}</strong>: {err.reason}</span>
                        <span className="font-mono text-[9px] bg-red-100 px-1.5 py-0.5 rounded text-red-800">
                          {err.data.Nome || err.data.Telefone ? 'Dados Inválidos' : 'Linha Vazia'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Details preview for spreadsheet-level duplicates */}
              {validationReport.sheetDuplicates.length > 0 && (
                <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-2">
                  <span className="font-bold text-violet-850 block">Duplicidades Internas Detectadas na Planilha (Apenas a primeira ocorrência será salva):</span>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 text-[11px] pr-1">
                    {validationReport.sheetDuplicates.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-violet-750 font-light border-b border-violet-100/40 pb-1">
                        <span><strong>Linha {item.rowNum}</strong>: {item.nome} {item.telefone ? `(${item.telefone})` : ''}</span>
                        <span className="font-mono text-[9px] bg-violet-100 px-1.5 py-0.5 rounded text-violet-800">
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Launch Execution bar */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                <span className="text-slate-400 font-light mr-auto">
                  Total de registros acionados: <strong>{validationReport.valid.length + validationReport.duplicates.length}</strong>
                </span>
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 text-slate-500 hover:text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={validationReport.valid.length === 0 && validationReport.duplicates.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-green-primary hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span>Confirmar Importação de Dados</span>
                </button>
              </div>
            </div>
          )}

          {/* Final import report details */}
          {report && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 animate-fade-in text-xs">
              
              <div className="text-center max-w-md mx-auto space-y-3.5 py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-brand-green-primary border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-brand-blue-dark font-outfit">Importação Concluída com Sucesso!</h3>
                  <p className="text-slate-400 font-light">
                    O arquivo de planilha foi processado e as informações gravadas no prontuário.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Avaliado</span>
                  <strong className="text-lg font-bold text-slate-700 mt-1 block">{report.total}</strong>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900">
                  <span className="text-[10px] text-emerald-600 block font-semibold uppercase">Novos Inseridos</span>
                  <strong className="text-lg font-bold text-emerald-800 mt-1 block">{report.imported}</strong>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
                  <span className="text-[10px] text-blue-600 block font-semibold uppercase">Atualizados</span>
                  <strong className="text-lg font-bold text-blue-800 mt-1 block">{report.updated}</strong>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-900">
                  <span className="text-[10px] text-amber-600 block font-semibold uppercase">Ignorados</span>
                  <strong className="text-lg font-bold text-amber-800 mt-1 block">{report.ignored}</strong>
                </div>
              </div>

              {/* Activity Logs details dropdown preview */}
              <div className="space-y-2">
                <span className="font-bold text-slate-600 block">Detalhamento dos registros (Log):</span>
                <div className="bg-slate-55 p-3 rounded-xl border border-slate-100 max-h-[160px] overflow-y-auto space-y-1 font-mono text-[10px] text-slate-500 pr-1 scrollbar">
                  {report.details.map((line, idx) => (
                    <div key={idx} className="border-b border-slate-100/50 pb-1">{line}</div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-brand-blue-dark hover:bg-brand-blue-primary text-white font-bold rounded-xl transition-all shadow-md shadow-slate-900/10 cursor-pointer"
                >
                  Realizar Nova Importação
                </button>
              </div>

            </div>
          )}
        </>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 animate-fade-in text-xs">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Desfazer Importações de Planilhas</h3>
              <p className="text-slate-400 font-light mt-0.5">Selecione um lote de importação abaixo para remover apenas os pacientes cadastrados através daquela planilha.</p>
            </div>
            <button
              onClick={fetchImportHistory}
              disabled={loadingHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-semibold rounded-xl transition-all cursor-pointer text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 border-4 border-brand-blue-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historyImports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-light space-y-2">
              <History className="w-12 h-12 text-slate-300 mx-auto" />
              <p>Nenhuma importação de planilha recente encontrada no sistema.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-3 px-4">Data e Hora da Importação</th>
                    <th className="py-3 px-4">Qtd. Pacientes Importados</th>
                    <th className="py-3 px-4">Amostra de Pacientes</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {historyImports.map((imp) => {
                    const formattedDate = new Date(imp.importadoEm).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });
                    
                    const namesSample = imp.names.slice(0, 3).join(', ') + (imp.names.length > 3 ? '...' : '');

                    return (
                      <tr key={imp.importId} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-brand-blue-primary" />
                            {formattedDate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <span className="bg-brand-blue-light text-brand-blue-primary px-2.5 py-0.5 rounded-full text-[10px]">
                            {imp.totalPacientes} {imp.totalPacientes === 1 ? 'paciente' : 'pacientes'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-450 font-light truncate max-w-xs" title={imp.names.join(', ')}>
                          {namesSample}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setConfirmUndoId(imp.importId)}
                            disabled={undoing}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-700 font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Desfazer</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmUndoId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-slide-up">
                <div className="p-6 space-y-4">
                  <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center border border-red-100 mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-lg text-brand-blue-dark">Confirmar Exclusão</h3>
                    <p className="text-slate-500 font-light text-xs leading-relaxed">
                      Você tem certeza que deseja desfazer a importação de{' '}
                      <strong>
                        {(() => {
                          const found = historyImports.find(h => h.importId === confirmUndoId);
                          return found ? new Date(found.importadoEm).toLocaleString('pt-BR') : '';
                        })()}
                      </strong>
                      ?
                    </p>
                    <div className="p-3 bg-red-50/50 text-red-800 rounded-xl text-left text-[11px] border border-red-100/50 mt-2">
                      <span className="font-bold block mb-1">Atenção:</span>
                      Esta ação excluirá permanentemente os <strong>{historyImports.find(h => h.importId === confirmUndoId)?.totalPacientes}</strong> pacientes inseridos por esta planilha. Pacientes pré-existentes que foram atualizados ou ignorados durante a importação <strong>não</strong> serão alterados ou excluídos.
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    onClick={() => setConfirmUndoId(null)}
                    disabled={undoing}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUndoImport}
                    disabled={undoing}
                    className="px-5 py-2 bg-red-600 hover:bg-red-750 text-white font-bold rounded-xl transition-all shadow-md shadow-red-950/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {undoing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Excluindo...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir Registros</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
