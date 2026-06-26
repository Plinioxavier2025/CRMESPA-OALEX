import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Paciente } from '../services/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Calendar,
  Sparkles,
  ClipboardList,
  AlertCircle
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected report type
  const [reportType, setReportType] = useState<'pacientes' | 'crescimento' | 'desistencias'>('pacientes');

  // Filters for Patient Report
  const [filterStatus, setFilterStatus] = useState('');
  const [filterConvenio, setFilterConvenio] = useState('');
  const [conveniosList, setConveniosList] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-brand-blue-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ----------------------------------------------------
  // REPORT 1: PATIENTS LIST DATA
  // ----------------------------------------------------
  const patientsReportData = patients.filter(p => {
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchConvenio = !filterConvenio || p.convenio === filterConvenio;
    return matchStatus && matchConvenio;
  });

  // ----------------------------------------------------
  // REPORT 2: GROWTH MATRIX DATA (Jan to June 2026)
  // ----------------------------------------------------
  const monthsNames = [
    { num: '01', label: 'Janeiro' },
    { num: '02', label: 'Fevereiro' },
    { num: '03', label: 'Março' },
    { num: '04', label: 'Abril' },
    { num: '05', label: 'Maio' },
    { num: '06', label: 'Junho' },
    { num: '07', label: 'Julho' },
    { num: '08', label: 'Agosto' },
    { num: '09', label: 'Setembro' },
    { num: '10', label: 'Outubro' },
    { num: '11', label: 'Novembro' },
    { num: '12', label: 'Dezembro' }
  ];

  const growthReportData = monthsNames.map((m) => {
    const targetPrefix = `2026-${m.num}`;
    const lastDayCutoff = `2026-${m.num}-31`;

    const entries = patients.filter(p => 
      p.data_cadastro.startsWith(targetPrefix) && 
      !p.usuario_cadastro?.includes('Planilha')
    ).length;

    const exits = patients.filter(p => 
      (p.status === 'Desistiu' || p.status === 'Inativo') && 
      p.data_ultima_atualizacao.startsWith(targetPrefix)
    ).length;

    const activeAtMonth = patients.filter(p => {
      const registered = p.data_cadastro <= lastDayCutoff;
      const isDesistenteAtCutoff = p.status === 'Desistiu' && p.data_ultima_atualizacao <= lastDayCutoff;
      const isInativoAtCutoff = p.status === 'Inativo' && p.data_ultima_atualizacao <= lastDayCutoff;
      return registered && !isDesistenteAtCutoff && !isInativoAtCutoff;
    }).length;

    const netGrowth = entries - exits;
    const totalPeriod = activeAtMonth + exits;
    const retentionRate = totalPeriod > 0 ? (activeAtMonth / totalPeriod) * 100 : 100;

    return {
      mes: m.label,
      entradas: entries,
      saidas: exits,
      crescimentoNet: netGrowth,
      retencao: retentionRate
    };
  }).slice(0, 6); // First semester 2026

  // ----------------------------------------------------
  // REPORT 3: WITHDRAWALS DATA
  // ----------------------------------------------------
  const desistenciasReportData = patients
    .filter(p => p.status === 'Desistiu')
    .map(p => ({
      nome: p.nome,
      data: p.data_ultima_atualizacao,
      motivo: p.motivo_desistencia || 'Não especificado'
    }))
    .sort((a, b) => b.data.localeCompare(a.data));

  // Helper date formatting
  const formatD = (dStr: string) => {
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  // ----------------------------------------------------
  // EXPORT EXCEL GENERATOR (SHEETJS)
  // ----------------------------------------------------
  const exportToExcel = () => {
    let sheetData: any[] = [];
    let fileName = 'relatorio.xlsx';

    if (reportType === 'pacientes') {
      sheetData = patientsReportData.map(p => ({
        'Nome Completo': p.nome,
        'Telefone': p.telefone,
        'Convênio': p.convenio,
        'Status': p.status,
        'Data de Cadastro': formatD(p.data_cadastro)
      }));
      fileName = 'relatorio_pacientes.xlsx';
    } else if (reportType === 'crescimento') {
      sheetData = growthReportData.map(g => ({
        'Mês / 2026': g.mes,
        'Entradas (Novos)': g.entradas,
        'Saídas (Desistências)': g.saidas,
        'Crescimento Líquido': g.crescimentoNet,
        'Taxa de Retenção (%)': `${g.retencao.toFixed(1)}%`
      }));
      fileName = 'relatorio_crescimento.xlsx';
    } else if (reportType === 'desistencias') {
      sheetData = desistenciasReportData.map(d => ({
        'Nome do Paciente': d.nome,
        'Data Desistência': formatD(d.data),
        'Motivo da Desistência': d.motivo
      }));
      fileName = 'relatorio_desistencias.xlsx';
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, fileName);
  };

  // ----------------------------------------------------
  // EXPORT PDF GENERATOR (JSPDF + JSPDF-AUTOTABLE)
  // ----------------------------------------------------
  const exportToPDF = () => {
    try {
      console.log('Iniciando exportação de PDF...');
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString('pt-BR');
      
      // Add header branding metadata
      doc.setFillColor(13, 46, 94); // Navy blue primary color
      doc.rect(0, 0, 210, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('CRM ESPAÇO ALEX', 15, 18);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(200, 220, 255);
      doc.text('Espaço Alex Silveira Silveira - Consultório de Psicologia', 15, 24);
      doc.text(`Gerado em: ${currentDate}`, 160, 24);

      let titleText = '';
      let tableHeaders: string[][] = [];
      let tableRows: any[][] = [];

      if (reportType === 'pacientes') {
        titleText = 'Relatório Geral de Pacientes';
        tableHeaders = [['Nome Completo', 'Telefone', 'Convênio', 'Status', 'Data Cadastro']];
        tableRows = patientsReportData.map(p => [
          p.nome,
          p.telefone,
          p.convenio,
          p.status,
          formatD(p.data_cadastro)
        ]);
      } else if (reportType === 'crescimento') {
        titleText = 'Relatório de Crescimento Clínico (2026)';
        tableHeaders = [['Mês / 2026', 'Entradas', 'Saídas', 'Crescimento Líquido', 'Retenção (%)']];
        tableRows = growthReportData.map(g => [
          g.mes,
          g.entradas,
          g.saidas,
          g.crescimentoNet,
          `${g.retencao.toFixed(1)}%`
        ]);
      } else if (reportType === 'desistencias') {
        titleText = 'Relatório de Desistências de Pacientes';
        tableHeaders = [['Nome do Paciente', 'Data Desistência', 'Motivo da Desistência']];
        tableRows = desistenciasReportData.map(d => [
          d.nome,
          formatD(d.data),
          d.motivo
        ]);
      }

      doc.setTextColor(13, 46, 94);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(titleText, 15, 42);

      console.log('Chamando autoTable com cabeçalhos:', tableHeaders, 'e linhas:', tableRows.length);
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

      const finalFileName = reportType === 'pacientes' ? 'relatorio_pacientes.pdf' :
                            reportType === 'crescimento' ? 'relatorio_crescimento.pdf' :
                            'relatorio_desistencias.pdf';

      console.log('Salvando documento PDF:', finalFileName);
      doc.save(finalFileName);
      console.log('PDF exportado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar relatório em PDF. Por favor, tente novamente.');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Report selector cards list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Pacientes list */}
        <button
          onClick={() => setReportType('pacientes')}
          className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer ${
            reportType === 'pacientes'
              ? 'bg-white border-brand-blue-primary shadow-md ring-1 ring-brand-blue-primary/10'
              : 'bg-white/60 hover:bg-white border-slate-100 shadow-sm'
          }`}
        >
          <div className={`p-3 rounded-xl ${reportType === 'pacientes' ? 'bg-brand-blue-light text-brand-blue-primary' : 'bg-slate-100 text-slate-400'}`}>
            <ClipboardList className="w-5.5 h-5.5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold font-outfit text-sm text-brand-blue-dark">Listagem de Pacientes</h3>
            <p className="text-[10px] text-slate-400 font-light leading-relaxed">Filtre cadastros por convênio e status para exportar em listas estruturadas.</p>
          </div>
        </button>

        {/* Crescimento matrix */}
        <button
          onClick={() => setReportType('crescimento')}
          className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer ${
            reportType === 'crescimento'
              ? 'bg-white border-brand-blue-primary shadow-md ring-1 ring-brand-blue-primary/10'
              : 'bg-white/60 hover:bg-white border-slate-100 shadow-sm'
          }`}
        >
          <div className={`p-3 rounded-xl ${reportType === 'crescimento' ? 'bg-emerald-50 text-brand-green-primary' : 'bg-slate-100 text-slate-400'}`}>
            <Sparkles className="w-5.5 h-5.5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold font-outfit text-sm text-brand-blue-dark">Relatório de Crescimento</h3>
            <p className="text-[10px] text-slate-400 font-light leading-relaxed">Matriz de faturamento com entradas, saídas, crescimento líquido e taxas de retenção.</p>
          </div>
        </button>

        {/* Desistências tracking */}
        <button
          onClick={() => setReportType('desistencias')}
          className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer ${
            reportType === 'desistencias'
              ? 'bg-white border-brand-blue-primary shadow-md ring-1 ring-brand-blue-primary/10'
              : 'bg-white/60 hover:bg-white border-slate-100 shadow-sm'
          }`}
        >
          <div className={`p-3 rounded-xl ${reportType === 'desistencias' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
            <AlertCircle className="w-5.5 h-5.5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold font-outfit text-sm text-brand-blue-dark">Desistências de Clientes</h3>
            <p className="text-[10px] text-slate-400 font-light leading-relaxed">Exponha nomes dos pacientes retirados, datas de saída e motivos justificados.</p>
          </div>
        </button>

      </div>

      {/* Main Report viewer container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        
        {/* Filters and Actions headers bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-brand-blue-dark" />
            <h3 className="font-bold text-slate-800 font-outfit text-xs uppercase tracking-wider">
              {reportType === 'pacientes' ? 'Lista de Pacientes' :
               reportType === 'crescimento' ? 'Matriz Comparativa de Crescimento (Semestre)' :
               'Lista de Desistências Clínicas'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Conditional filters for patient list report */}
            {reportType === 'pacientes' && (
              <>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                >
                  <option value="">Filtrar Status</option>
                  <option value="Novo Cliente">Novo Cliente</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Desistiu">Desistiu</option>
                  <option value="Inativo">Inativo</option>
                </select>

                <select
                  value={filterConvenio}
                  onChange={(e) => setFilterConvenio(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                >
                  <option value="">Filtrar Convênio</option>
                  {conveniosList.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </>
            )}

            {/* Export buttons */}
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Data tables container */}
        <div className="overflow-x-auto text-xs">
          
          {/* Table 1: Patients Directory */}
          {reportType === 'pacientes' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Nome Completo</th>
                  <th className="p-4">Telefone</th>
                  <th className="p-4">Convênio</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Data Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-light">
                {patientsReportData.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30">
                    <td className="p-4 font-semibold text-brand-blue-dark">{p.nome}</td>
                    <td className="p-4 font-mono font-medium">{p.telefone}</td>
                    <td className="p-4 font-medium">{p.convenio}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${
                        p.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        p.status === 'Novo Cliente' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        p.status === 'Inativo' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>{p.status}</span>
                    </td>
                    <td className="p-4 font-mono">{formatD(p.data_cadastro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table 2: Growth Matrix */}
          {reportType === 'crescimento' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Mês / 2026</th>
                  <th className="p-4">Entradas (Novos)</th>
                  <th className="p-4">Saídas (Desistências)</th>
                  <th className="p-4">Crescimento Líquido</th>
                  <th className="p-4">Taxa de Retenção (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-light">
                {growthReportData.map((g, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30">
                    <td className="p-4 font-bold text-brand-blue-dark">{g.mes}</td>
                    <td className="p-4 font-semibold text-blue-600">+{g.entradas}</td>
                    <td className="p-4 font-semibold text-red-600">-{g.saidas}</td>
                    <td className={`p-4 font-bold ${g.crescimentoNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {g.crescimentoNet >= 0 ? '+' : ''}{g.crescimentoNet}
                    </td>
                    <td className="p-4 font-bold font-mono">{g.retencao.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table 3: Withdrawals Report */}
          {reportType === 'desistencias' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 w-1/3">Nome do Paciente</th>
                  <th className="p-4 w-1/5">Data Desistência</th>
                  <th className="p-4">Motivo Mapeado da Desistência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-light">
                {desistenciasReportData.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30">
                    <td className="p-4 font-semibold text-brand-blue-dark">{d.nome}</td>
                    <td className="p-4 font-mono font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatD(d.data)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-100 text-[10px] leading-relaxed">
                        {d.motivo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>

      </div>

    </div>
  );
};
