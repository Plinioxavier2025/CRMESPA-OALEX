import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Paciente } from '../services/db';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  UserMinus, 
  TrendingUp, 
  Percent, 
  Calendar,
  Layers,
  Activity,
  ShieldAlert,
  UserX
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';

export const Dashboard: React.FC<{ 
  setCurrentTab: (tab: string) => void;
  navigateToPatients?: (status?: string, month?: string, year?: string, excludePlanilha?: boolean) => void;
}> = ({ setCurrentTab, navigateToPatients }) => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Time context variables based on selection (Defaults to June 2026 as current simulation month)
  const [selectedMonth, setSelectedMonth] = useState('06');
  const [selectedYear, setSelectedYear] = useState('2026');
  
  const [seeding, setSeeding] = useState(false);
  const [dbError, setDbError] = useState<any>(null);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const mockPacientes = [
        // Janeiro 2026
        { nome: 'Mariana Santos Rodrigues', telefone: '(11) 98765-4321', convenio: 'SulAmérica', status: 'Ativo', data_cadastro: '2026-01-15', hora_cadastro: '09:30:00' },
        { nome: 'Carlos Eduardo Ramos', telefone: '(11) 97765-8822', convenio: 'Particular', status: 'Ativo', data_cadastro: '2026-01-20', hora_cadastro: '14:00:00' },
        { nome: 'Beatriz Vasconcelos', telefone: '(11) 95432-1098', convenio: 'Care Plus', status: 'Desistiu', motivo_desistencia: 'Questão financeira', data_cadastro: '2026-01-22', hora_cadastro: '16:45:00' },
        // Fevereiro 2026
        { nome: 'Juliana Paes de Oliveira', telefone: '(11) 96543-2109', convenio: 'Particular', status: 'Ativo', data_cadastro: '2026-02-05', hora_cadastro: '10:00:00' },
        { nome: 'Rodrigo Faro Nogueira', telefone: '(11) 91234-5678', convenio: 'SulAmérica', status: 'Ativo', data_cadastro: '2026-02-12', hora_cadastro: '11:30:00' },
        { nome: 'Renata Lins Albuquerque', telefone: '(11) 92345-6789', convenio: 'Vivest', status: 'Desistiu', motivo_desistencia: 'Mudança de cidade', data_cadastro: '2026-02-18', hora_cadastro: '08:15:00' },
        // Março 2026
        { nome: 'Lucas Medeiros Santos', telefone: '(11) 99887-7665', convenio: 'Care Plus', status: 'Ativo', data_cadastro: '2026-03-03', hora_cadastro: '15:00:00' },
        { nome: 'Aline de Souza Ferreira', telefone: '(11) 93456-7890', convenio: 'Particular', status: 'Ativo', data_cadastro: '2026-03-10', hora_cadastro: '17:30:00' },
        { nome: 'Gustavo Henrique Costa', telefone: '(11) 94567-8901', convenio: 'Vivest', status: 'Desistiu', motivo_desistencia: 'Alta terapêutica', data_cadastro: '2026-03-25', hora_cadastro: '14:15:00' },
        // Abril 2026
        { nome: 'Patrícia Pillar Mendes', telefone: '(11) 95678-9012', convenio: 'SulAmérica', status: 'Ativo', data_cadastro: '2026-04-02', hora_cadastro: '10:30:00' },
        { nome: 'Felipe Camargo Rezende', telefone: '(11) 96789-0123', convenio: 'Care Plus', status: 'Ativo', data_cadastro: '2026-04-14', hora_cadastro: '09:00:00' },
        { nome: 'Letícia Spiller Lima', telefone: '(11) 97890-1234', convenio: 'Particular', status: 'Desistiu', motivo_desistencia: 'Falta de tempo', data_cadastro: '2026-04-20', hora_cadastro: '11:15:00' },
        // Maio 2026
        { nome: 'Thiago Lacerda Santos', telefone: '(11) 98901-2345', convenio: 'Vivest', status: 'Ativo', data_cadastro: '2026-05-04', hora_cadastro: '16:00:00' },
        { nome: 'Fernanda Montenegro', telefone: '(11) 99012-3456', convenio: 'Particular', status: 'Novo Cliente', data_cadastro: '2026-05-18', hora_cadastro: '14:30:00' },
        { nome: 'Tony Ramos Fernandes', telefone: '(11) 90123-4567', convenio: 'SulAmérica', status: 'Desistiu', motivo_desistencia: 'Insatisfação', data_cadastro: '2026-05-22', hora_cadastro: '15:15:00' },
        // Junho 2026
        { nome: 'Cláudia Abreu Fonseca', telefone: '(11) 91234-8765', convenio: 'Care Plus', status: 'Novo Cliente', data_cadastro: '2026-06-02', hora_cadastro: '10:00:00' },
        { nome: 'Fábio Assunção Becker', telefone: '(11) 92345-9876', convenio: 'Vivest', status: 'Ativo', data_cadastro: '2026-06-08', hora_cadastro: '09:15:00' },
        { nome: 'Glória Pires de Souza', telefone: '(11) 93456-0987', convenio: 'Particular', status: 'Desistiu', motivo_desistencia: 'Outro: Indicada a outro especialista em TDAH de crianças', data_cadastro: '2026-06-11', hora_cadastro: '14:00:00' },
        { nome: 'Marcos Palmeira Neto', telefone: '(11) 94567-2109', convenio: 'SulAmérica', status: 'Novo Cliente', data_cadastro: '2026-06-15', hora_cadastro: '16:00:00' }
      ];

      for (const p of mockPacientes) {
        await db.savePaciente({
          nome: p.nome,
          telefone: p.telefone,
          convenio: p.convenio,
          status: p.status as any,
          motivo_desistencia: p.motivo_desistencia,
          usuario_cadastro: 'Sistema (Carga Inicial)',
          data_cadastro: p.data_cadastro,
          hora_cadastro: p.hora_cadastro
        });
      }

      await db.addLog('Sistema', 'Importação Inicial', 'Banco de dados online populado com os 19 pacientes de teste.');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar dados de teste.');
    } finally {
      setSeeding(false);
    }
  };

  const monthsOptions = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await db.getPacientes();
        setPatients(data);
        setDbError(null);
      } catch (e: any) {
        console.error(e);
        setDbError(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-brand-blue-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ----------------------------------------------------
  // CALCULATIONS & INDICATORS
  // ----------------------------------------------------
  const totalPatients = patients.length;
  const activePatients = patients.filter(p => p.status === 'Ativo').length;
  const newPatients = patients.filter(p => p.status === 'Novo Cliente').length;
  const desistentesPatients = patients.filter(p => p.status === 'Desistiu').length;
  const inativoPatients = patients.filter(p => p.status === 'Inativo').length;



  const prefix = `${selectedYear}-${selectedMonth}`;
  const isBeforeJune2026 = prefix < '2026-06';
  
  // Novos do mês: Cadastrados diretamente no site no mês selecionado (a partir de junho de 2026),
  // ou pacientes que foram modificados no sistema para Ativo ou Novo Cliente neste mês.
  const novosMes = isBeforeJune2026 ? 0 : patients.filter(p => {
    const isNewDirect = !p.usuario_cadastro?.includes('Planilha') && p.data_cadastro.startsWith(prefix) && p.data_cadastro >= '2026-06-01';
    const isModifiedToActive = p.data_ultima_atualizacao.startsWith(prefix) && 
                               p.data_ultima_atualizacao !== p.data_cadastro && 
                               (p.status === 'Ativo' || p.status === 'Novo Cliente');
    return isNewDirect || isModifiedToActive;
  }).length;

  // Desistentes/Inativos do mês (Saídas): Alterações de status para Desistiu ou Inativo no mês selecionado
  const desistentesMes = isBeforeJune2026 ? 0 : patients.filter(p => {
    const isExitStatus = p.status === 'Desistiu' || p.status === 'Inativo';
    const isModifiedThisMonth = p.data_ultima_atualizacao.startsWith(prefix);
    const isSystemScope = !p.usuario_cadastro?.includes('Planilha') || (p.data_ultima_atualizacao !== p.data_cadastro);
    return isExitStatus && isModifiedThisMonth && isSystemScope;
  }).length;

  // Clientes Cadastrados no Mês / Ano (sistema, não planilha)
  const cadastradosMes = patients.filter(p => p.data_cadastro.startsWith(prefix) && !p.usuario_cadastro?.includes('Planilha')).length;
  const cadastradosAno = patients.filter(p => p.data_cadastro.startsWith(selectedYear) && !p.usuario_cadastro?.includes('Planilha')).length;

  // Math calculation for Growth (Proportion of active patients in the selected month)
  const lastDayOfMonthStr = `${selectedYear}-${selectedMonth}-31`; // generic cutoff
  const totalAtSelectedMonth = patients.filter(p => p.data_cadastro <= lastDayOfMonthStr).length;
  const activeAtSelectedMonth = patients.filter(p => {
    const registeredOnOrBefore = p.data_cadastro <= lastDayOfMonthStr;
    const wasInactiveOrDesistiuOnOrBefore = (p.status === 'Desistiu' || p.status === 'Inativo') && p.data_ultima_atualizacao <= lastDayOfMonthStr;
    return registeredOnOrBefore && !wasInactiveOrDesistiuOnOrBefore;
  }).length;

  const growthRate = totalAtSelectedMonth > 0 
    ? (activeAtSelectedMonth / totalAtSelectedMonth) * 100 
    : 0;

  // Growth rate for the previous month to show variation
  const previousMonthVal = Number(selectedMonth) === 1 ? 12 : Number(selectedMonth) - 1;
  const previousYearVal = Number(selectedMonth) === 1 ? Number(selectedYear) - 1 : Number(selectedYear);
  const prevMonthPrefix = `${previousYearVal}-${String(previousMonthVal).padStart(2, '0')}`;
  const lastDayOfPrevMonthStr = `${prevMonthPrefix}-31`;

  const totalAtPrevMonth = patients.filter(p => p.data_cadastro <= lastDayOfPrevMonthStr).length;
  const activeAtPrevMonth = patients.filter(p => {
    const registeredOnOrBefore = p.data_cadastro <= lastDayOfPrevMonthStr;
    const wasInactiveOrDesistiuOnOrBefore = (p.status === 'Desistiu' || p.status === 'Inativo') && p.data_ultima_atualizacao <= lastDayOfPrevMonthStr;
    return registeredOnOrBefore && !wasInactiveOrDesistiuOnOrBefore;
  }).length;

  const growthRatePrev = totalAtPrevMonth > 0 
    ? (activeAtPrevMonth / totalAtPrevMonth) * 100 
    : 0;

  const diffFromPrevMonth = growthRate - growthRatePrev;

  // Taxa de Retenção: Proporção baseada nos pacientes ativos, novos, desistentes e inativos do sistema
  const retentionPatients = patients.filter(p => 
    (!p.usuario_cadastro?.includes('Planilha') && p.data_cadastro >= '2026-06-01') ||
    (p.data_ultima_atualizacao >= '2026-06-01' && p.data_ultima_atualizacao !== p.data_cadastro)
  );
  const totalPatientsRet = retentionPatients.length;
  const activePatientsRet = retentionPatients.filter(p => p.status === 'Ativo').length;
  const newPatientsRet = retentionPatients.filter(p => p.status === 'Novo Cliente').length;
  const activeAndNewRet = activePatientsRet + newPatientsRet;
  const retentionRate = totalPatientsRet > 0 
    ? (activeAndNewRet / totalPatientsRet) * 100 
    : 100;

  // ----------------------------------------------------
  // CHART DATA: PIX DATA (Ativos vs Novos vs Desistentes)
  // ----------------------------------------------------
  const statusPieData = [
    { name: 'Ativos', value: activePatients, color: '#059669' },
    { name: 'Novos', value: newPatients, color: '#94A3B8' },
    { name: 'Inativos', value: inativoPatients, color: '#F59E0B' },
    { name: 'Desistentes', value: desistentesPatients, color: '#EF4444' }
  ];

  // ----------------------------------------------------
  // CHART DATA: MONTHLY ENTRIES & EXITS (BARS)
  // ----------------------------------------------------
  const monthsNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const selectedMonthNum = Number(selectedMonth);

  const barChartData = monthsNames.map((name, index) => {
    const monthNum = String(index + 1).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${monthNum}`;

    const entries = patients.filter(p => p.data_cadastro.startsWith(monthPrefix) && !p.usuario_cadastro?.includes('Planilha')).length;
    const exits = patients.filter(p => p.status === 'Desistiu' && p.data_ultima_atualizacao.startsWith(monthPrefix)).length;

    return {
      name,
      'Novas Entradas': entries,
      'Desistências': exits
    };
  }).slice(0, selectedMonthNum); // Dynamic slice up to the selected month

  // ----------------------------------------------------
  // CHART DATA: HISTORICAL EVOLUTION LINE
  // ----------------------------------------------------
  const lineChartData = monthsNames.map((name, index) => {
    const monthNum = String(index + 1).padStart(2, '0');
    const lastDayStr = `${selectedYear}-${monthNum}-31`; // generic cutoff
    
    // Count active patients at that point in time
    const activeAtMonth = patients.filter(p => {
      const registeredByMonth = p.data_cadastro <= lastDayStr;
      const isDesistenteByMonth = p.status === 'Desistiu' && p.data_ultima_atualizacao <= lastDayStr;
      return registeredByMonth && !isDesistenteByMonth;
    }).length;

    return {
      name,
      'Pacientes Ativos': activeAtMonth
    };
  }).slice(0, selectedMonthNum); // Dynamic slice up to the selected month

  // ----------------------------------------------------
  // CHART DATA: DROPOUT REASONS PIE
  // ----------------------------------------------------
  const dropouts = patients.filter(p => p.status === 'Desistiu');
  const reasonsCount: { [key: string]: number } = {
    'Finanças': 0,
    'Mudança': 0,
    'Insatisfação': 0,
    'Falta Tempo': 0,
    'Alta Terap.': 0,
    'Outros': 0
  };

  dropouts.forEach(p => {
    const r = p.motivo_desistencia || '';
    if (r.startsWith('Questão financeira')) reasonsCount['Finanças']++;
    else if (r.startsWith('Mudança')) reasonsCount['Mudança']++;
    else if (r.startsWith('Insatisfação')) reasonsCount['Insatisfação']++;
    else if (r.startsWith('Falta de tempo')) reasonsCount['Falta Tempo']++;
    else if (r.startsWith('Alta terapêutica')) reasonsCount['Alta Terap.']++;
    else reasonsCount['Outros']++;
  });

  const reasonsPieData = Object.keys(reasonsCount).map((name) => ({
    name,
    value: reasonsCount[name]
  })).filter(item => item.value > 0);

  const REASONS_COLORS = ['#94A3B8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  return (
    <div className="space-y-6">
      {/* Dynamic welcome greetings bar */}
      <div className="bg-gradient-to-r from-brand-blue-dark to-brand-accent p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-white/5 skew-x-12 transform origin-top-right pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-outfit text-white">Painel Executivo</h2>
            <p className="text-xs text-slate-200 font-light max-w-xl">
              Bem-vindo ao CRM do Espaço Alex Silveira. Aqui estão compilados os indicadores de atração, crescimento e retenção da clínica para o mês de {monthsOptions.find(m => m.value === selectedMonth)?.label} de {selectedYear}.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold mr-1">Filtrar:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-bold outline-none border-none cursor-pointer focus:ring-0 focus:outline-none [&>option]:text-slate-800 p-0 mr-1"
            >
              {monthsOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-white font-bold outline-none border-none cursor-pointer focus:ring-0 focus:outline-none [&>option]:text-slate-800 p-0"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>

      {dbError && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-red-500/30 p-6 rounded-3xl text-white shadow-xl space-y-4 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-400 font-outfit">Tabelas não encontradas no Supabase</h3>
              <p className="text-xs text-slate-300 font-light mt-1 leading-relaxed">
                A conexão com a nuvem Supabase está ativa, mas as tabelas do CRM (<code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">pacientes</code>, <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">logs</code>, <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">configuracoes</code>, <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">usuarios</code>) não foram encontradas. Por isso, os gráficos não estão carregando.
              </p>
            </div>
          </div>
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Como resolver isso:</h4>
            <ul className="list-decimal list-inside text-xs text-slate-300 space-y-2 font-light leading-relaxed">
              <li>Acesse o painel do seu projeto no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 font-semibold hover:underline">Supabase Console</a>.</li>
              <li>No menu lateral esquerdo, clique na opção <strong>SQL Editor</strong>.</li>
              <li>Clique em <strong>New Query</strong> para criar uma consulta SQL em branco.</li>
              <li>Abra o arquivo <code className="text-emerald-400 bg-slate-900/80 px-1 py-0.5 rounded font-mono">supabase_schema.sql</code> localizado na raiz da pasta do seu projeto CRM, copie todo o seu conteúdo de código, cole no SQL Editor do Supabase e clique em <strong>Run</strong> (ou aperte Ctrl+Enter).</li>
              <li>Após rodar com sucesso, recarregue esta página do CRM!</li>
            </ul>
          </div>
        </div>
      )}

      {!dbError && totalPatients === 0 && (
        <div className="bg-slate-900/50 backdrop-blur-md border border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs dark-theme-main">
          <div className="space-y-1 text-center md:text-left">
            <span className="font-bold text-amber-400 block text-sm">Banco de Dados Vazio</span>
            <p className="text-slate-350 font-light leading-relaxed">
              O seu banco de dados online foi conectado com sucesso, mas ainda não possui nenhum paciente cadastrado. Deseja carregar os 19 pacientes de teste para começar a visualizar os gráficos e estatísticas da clínica?
            </p>
          </div>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full md:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {seeding ? 'Carregando...' : 'Carregar Pacientes de Teste'}
          </button>
        </div>
      )}

      {/* Primary Indicator Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Total Pacientes */}
        <div 
          onClick={() => {
            if (navigateToPatients) navigateToPatients();
            else setCurrentTab('pacientes');
          }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-brand-blue-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-brand-blue-light text-brand-blue-primary group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Total de Pacientes</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-brand-blue-primary transition-colors">{totalPatients}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Histórico acumulado na clínica</span>
          </div>
        </div>

        {/* Pacientes Ativos */}
        <div 
          onClick={() => {
            if (navigateToPatients) navigateToPatients('Ativo');
            else setCurrentTab('pacientes');
          }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-brand-green-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-emerald-50 text-brand-green-primary group-hover:scale-105 transition-transform">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Pacientes Ativos</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-brand-green-primary transition-colors">{activePatients}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Recebendo atendimento contínuo</span>
          </div>
        </div>

        {/* Pacientes Inativos */}
        <div 
          onClick={() => {
            if (navigateToPatients) navigateToPatients('Inativo');
            else setCurrentTab('pacientes');
          }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-amber-600/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Pacientes Inativos</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-amber-600 transition-colors">{inativoPatients}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Pacientes sem retorno/resposta</span>
          </div>
        </div>

        {/* Novos Pacientes do Mês */}
        <div 
          onClick={() => {
            if (navigateToPatients) {
              navigateToPatients(undefined, selectedMonth, selectedYear, true);
            } else {
              setCurrentTab('pacientes');
            }
          }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-600/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Novos do Mês</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-blue-600 transition-colors">{novosMes}</strong>
            <span className="text-[10px] text-emerald-600 mt-1 block font-medium">+{cadastradosMes} cadastrados este mês</span>
          </div>
        </div>

        {/* Pacientes Desistentes do Mês */}
        <div 
          onClick={() => {
            if (navigateToPatients) {
              navigateToPatients('Desistiu', selectedMonth, selectedYear);
            } else {
              setCurrentTab('pacientes');
            }
          }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-red-650/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-red-50 text-red-600 group-hover:scale-105 transition-transform">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Desistentes do Mês</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-red-600 transition-colors">{desistentesMes}</strong>
            <span className="text-[10px] text-red-600 mt-1 block font-medium">-{desistentesMes} saídas este mês</span>
          </div>
        </div>

        {/* Crescimento Mensal */}
        <div 
          onClick={() => setCurrentTab('analise')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-purple-600/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Crescimento Mensal</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-purple-650 transition-colors">
              {growthRate.toFixed(1)}%
            </strong>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {totalAtPrevMonth > 0 
                ? `${diffFromPrevMonth >= 0 ? '+' : ''}${diffFromPrevMonth.toFixed(1)}% vs mês anterior`
                : 'Proporção de ativos sobre o total'
              }
            </span>
          </div>
        </div>

        {/* Taxa de Retenção */}
        <div 
          onClick={() => setCurrentTab('analise')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-emerald-600/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Taxa de Retenção</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-emerald-700 transition-colors">{retentionRate.toFixed(1)}%</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Proporção de pacientes ativos</span>
          </div>
        </div>

        {/* Cadastrados no Mês */}
        <div 
          onClick={() => {
            if (navigateToPatients) {
              navigateToPatients(undefined, selectedMonth, selectedYear, true);
            } else {
              setCurrentTab('pacientes');
            }
          }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-orange-650/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-orange-50 text-orange-600 group-hover:scale-105 transition-transform">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Cadastros no Mês</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-orange-650 transition-colors">{cadastradosMes}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Faturamento e captação</span>
          </div>
        </div>

        {/* Cadastrados no Ano */}
        <div 
          onClick={() => {
            if (navigateToPatients) {
              navigateToPatients(undefined, undefined, selectedYear, true);
            } else {
              setCurrentTab('pacientes');
            }
          }}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-sky-650/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <div className="p-3.5 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Cadastros no Ano</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5 group-hover:text-sky-700 transition-colors">{cadastradosAno}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Acumulado anual (2026)</span>
          </div>
        </div>

      </div>

      {/* Charts Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Entradas vs Saídas */}
        <div 
          onClick={() => setCurrentTab('analise')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col space-y-4 cursor-pointer hover:border-brand-blue-primary/30 hover:shadow-md transition-all group"
        >
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit group-hover:text-brand-blue-primary transition-colors">Fluxo Mensal de Entradas e Saídas</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Estatísticas comparativas de novas consultas e saídas de pacientes.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Novas Entradas" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="Desistências" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pizza */}
        <div 
          onClick={() => setCurrentTab('pacientes')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4 cursor-pointer hover:border-brand-blue-primary/30 hover:shadow-md transition-all group"
        >
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit group-hover:text-brand-blue-primary transition-colors">Distribuição de Status</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Composição percentual dos pacientes cadastrados.</p>
          </div>
          <div className="h-[220px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} pacientes`]} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Absolute Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Geral</span>
              <span className="text-2xl font-extrabold text-brand-blue-dark font-outfit">{totalPatients}</span>
            </div>
          </div>
          
          {/* Custom Legends list */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            {statusPieData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="text-xs font-bold text-brand-blue-dark mt-0.5">
                  {item.value} ({totalPatients > 0 ? ((item.value / totalPatients) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Lower Row Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Line Chart: Active patient progression */}
        <div 
          onClick={() => setCurrentTab('analise')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col space-y-4 cursor-pointer hover:border-brand-blue-primary/30 hover:shadow-md transition-all group"
        >
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit group-hover:text-brand-blue-primary transition-colors">Evolução de Pacientes Ativos</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Curva acumulada de pacientes ativos na clínica ao longo dos meses.</p>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="Pacientes Ativos" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  activeDot={{ r: 6 }} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reasons of Dropout Pie Chart */}
        <div 
          onClick={() => setCurrentTab('analise')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4 cursor-pointer hover:border-brand-blue-primary/30 hover:shadow-md transition-all group"
        >
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit group-hover:text-brand-blue-primary transition-colors">Motivos de Desistência</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Motivos de abandono terapêutico mapeados.</p>
          </div>

          
          {reasonsPieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-6 text-slate-400 text-xs font-light">
              Nenhuma desistência registrada até o momento para cálculo.
            </div>
          ) : (
            <>
              <div className="h-[180px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {reasonsPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={REASONS_COLORS[index % REASONS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} desistências`]} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Detail breakdown list */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[140px] pr-1 scrollbar">
                {reasonsPieData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: REASONS_COLORS[idx % REASONS_COLORS.length] }} />
                      {item.name}
                    </span>
                    <span className="font-bold text-brand-blue-dark">
                      {item.value} ({((item.value / desistentesPatients) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
