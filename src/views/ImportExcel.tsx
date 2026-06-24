import React, { useState, useRef } from 'react';
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
  Play
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
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'update' | 'ignore'>('update');
  const [parsing, setParsing] = useState(false);
  const [validationReport, setValidationReport] = useState<{
    valid: any[];
    duplicates: any[];
    errors: any[];
  } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const errors: any[] = [];

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
            status: 'Novo Cliente' as const,
            rowNum
          };

          // Duplicate verification (check against name OR telephone in existing database)
          const isDuplicate = existingPatients.find(
            (p) => p.nome.toLowerCase() === entry.nome.toLowerCase() || p.telefone.replace(/\D/g, '') === cleanPhoneDigits
          );

          if (isDuplicate) {
            duplicates.push({ ...entry, existingId: isDuplicate.id, existingStatus: isDuplicate.status });
          } else {
            valid.push(entry);
          }
        });

        setValidationReport({ valid, duplicates, errors });
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

    const { valid, duplicates } = validationReport;
    let importedCount = 0;
    let updatedCount = 0;
    let ignoredCount = 0;
    const details: string[] = [];

    try {
      // 1. Insert non-duplicate entries
      for (const item of valid) {
        await db.savePaciente({
          nome: item.nome,
          telefone: item.telefone,
          convenio: item.convenio,
          status: 'Novo Cliente',
          usuario_cadastro: activeUserName + ' (Planilha)'
        });
        importedCount++;
        details.push(`[INSERIDO] Linha ${item.rowNum}: ${item.nome} (${item.convenio})`);
      }

      // 2. Resolve duplicates based on selected policy
      for (const item of duplicates) {
        if (importMode === 'update') {
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
          details.push(`[IGNORADO] Linha ${item.rowNum}: ${item.nome} (Paciente já cadastrado)`);
        }
      }

      // Audit log entry
      const logDetails = `Importados ${importedCount} novos, atualizados ${updatedCount}, ignorados ${ignoredCount}. totalizando ${importedCount + updatedCount} registros.`;
      await db.addLog(activeUserName, 'Importação de Planilha', logDetails);

      setReport({
        total: valid.length + duplicates.length,
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

  const handleReset = () => {
    setFile(null);
    setValidationReport(null);
    setReport(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Introduction Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
        <div className="p-3.5 bg-brand-blue-light text-brand-blue-primary rounded-2xl">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-blue-dark font-outfit">Importação em Lote</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
            Importe planilhas de pacientes de forma automatizada. O sistema lê extensões <strong>XLS e XLSX</strong>, identificando automaticamente colunas de Nome, Telefone e Convênio/Modalidade, com prevenção de cadastros duplicados.
          </p>
        </div>
      </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Válidos */}
            <div className="p-4 rounded-xl border border-slate-100 bg-emerald-50 text-emerald-800 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <div>
                <span className="font-bold block text-sm">{validationReport.valid.length}</span>
                <span className="text-[10px] text-emerald-700 block font-light">Novos registros válidos</span>
              </div>
            </div>

            {/* Duplicados */}
            <div className="p-4 rounded-xl border border-slate-100 bg-amber-50 text-amber-800 flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-amber-600" />
              <div>
                <span className="font-bold block text-sm">{validationReport.duplicates.length}</span>
                <span className="text-[10px] text-amber-700 block font-light">
                  Duplicados ({importMode === 'update' ? 'Serão atualizados' : 'Serão ignorados'})
                </span>
              </div>
            </div>

            {/* Erros */}
            <div className="p-4 rounded-xl border border-slate-100 bg-red-50 text-red-800 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <span className="font-bold block text-sm">{validationReport.errors.length}</span>
                <span className="text-[10px] text-red-700 block font-light">Linhas com erros críticos</span>
              </div>
            </div>

          </div>

          {/* Details Tabs preview */}
          {validationReport.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
              <span className="font-bold text-red-850 block">Erros de Validação Encontrados (Corrija na planilha original):</span>
              <div className="max-h-[140px] overflow-y-auto space-y-1 text-[11px] pr-1">
                {validationReport.errors.map((err, idx) => (
                  <div key={idx} className="flex justify-between items-center text-red-750 font-light border-b border-red-100/40 pb-1">
                    <span><strong>Linha {err.rowNum}</strong>: {err.reason}</span>
                    <span className="font-mono text-[9px] bg-red-100 px-1.5 py-0.5 rounded text-red-800">
                      {err.data.Nome || err.data.Telefone ? 'Incompleto' : 'Linha Vazia'}
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

    </div>
  );
};
