import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Paciente } from '../services/db';
import { 
  CalendarDays, 
  ArrowUpRight, 
  ArrowDownRight, 
  UserCheck, 
  UserPlus, 
  UserMinus, 
  TrendingUp, 
  Percent,
  ShieldAlert
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

export const MonthlyAnalysis: React.FC = () => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Month and Year (defaulting to current simulation month: June 2026)
  const [selectedMonth, setSelectedMonth] = useState('06');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [dbError, setDbError] = useState<any>(null);

  const monthsList = [
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

  const yearsList = ['2026', '2025'];

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
  // CALCULATIONS & STATISTICS FOR FILTERED MONTH
  // ----------------------------------------------------
  const targetPrefix = `${selectedYear}-${selectedMonth}`;
  const isBeforeJune2026 = targetPrefix < '2026-06';
  
  const previousMonthVal = Number(selectedMonth) === 1 ? 12 : Number(selectedMonth) - 1;
  const previousYearVal = Number(selectedMonth) === 1 ? Number(selectedYear) - 1 : Number(selectedYear);
  const prevMonthPrefix = `${previousYearVal}-${String(previousMonthVal).padStart(2, '0')}`;

  // 1. Novos Pacientes (registered in the selected month or modified to Active/New in this month)
  const novosMes = isBeforeJune2026 
    ? 0 
    : patients.filter(p => {
        const isNewDirect = !p.usuario_cadastro?.includes('Planilha') && p.data_cadastro.startsWith(targetPrefix) && p.data_cadastro >= '2026-06-01';
        const isModifiedToActive = p.data_ultima_atualizacao.startsWith(targetPrefix) && 
                                   p.data_ultima_atualizacao !== p.data_cadastro && 
                                   (p.status === 'Ativo' || p.status === 'Novo Cliente');
        return isNewDirect || isModifiedToActive;
      }).length;

  // 2. Pacientes Desistentes (status changed to Desistiu or Inativo in the selected month)
  const desistentesMes = isBeforeJune2026 
    ? 0 
    : patients.filter(p => {
        const isExitStatus = p.status === 'Desistiu' || p.status === 'Inativo';
        const isModifiedThisMonth = p.data_ultima_atualizacao.startsWith(targetPrefix);
        const isSystemScope = !p.usuario_cadastro?.includes('Planilha') || (p.data_ultima_atualizacao !== p.data_cadastro);
        return isExitStatus && isModifiedThisMonth && isSystemScope;
      }).length;

  // 3. Pacientes Ativos no final do mês selecionado (system scope)
  const ativosFimMes = patients.filter(p => {
    const isSystemScope = (!p.usuario_cadastro?.includes('Planilha') && p.data_cadastro >= '2026-06-01') ||
                          (p.data_ultima_atualizacao >= '2026-06-01' && p.data_ultima_atualizacao !== p.data_cadastro);
    return isSystemScope && p.status === 'Ativo';
  }).length;

  // 4. Pacientes Ativos no final do mês anterior (incluindo planilha para representar a base real de comparação)
  const lastDayOfPrevMonthStr = `${prevMonthPrefix}-31`;
  const totalAtPrevMonth = patients.filter(p => p.data_cadastro <= lastDayOfPrevMonthStr).length;
  const activeAtPrevMonth = patients.filter(p => {
    const registeredOnOrBefore = p.data_cadastro <= lastDayOfPrevMonthStr;
    const wasInactiveOrDesistiuOnOrBefore = (p.status === 'Desistiu' || p.status === 'Inativo') && p.data_ultima_atualizacao <= lastDayOfPrevMonthStr;
    return registeredOnOrBefore && !wasInactiveOrDesistiuOnOrBefore;
  }).length;

  const crescimentoPercentualPrev = totalAtPrevMonth > 0 
    ? (activeAtPrevMonth / totalAtPrevMonth) * 100 
    : 0;

  // 5. Crescimento Percentual: Proporção de ativos sobre o total no mês selecionado
  const lastDayOfMonthStr = `${selectedYear}-${selectedMonth}-31`; // generic cutoff
  const totalAtSelectedMonth = patients.filter(p => p.data_cadastro <= lastDayOfMonthStr).length;
  const activeAtSelectedMonth = patients.filter(p => {
    const registeredOnOrBefore = p.data_cadastro <= lastDayOfMonthStr;
    const wasInactiveOrDesistiuOnOrBefore = (p.status === 'Desistiu' || p.status === 'Inativo') && p.data_ultima_atualizacao <= lastDayOfMonthStr;
    return registeredOnOrBefore && !wasInactiveOrDesistiuOnOrBefore;
  }).length;

  const crescimentoPercentual = totalAtSelectedMonth > 0 
    ? (activeAtSelectedMonth / totalAtSelectedMonth) * 100 
    : 0;

  const diffFromPrevMonth = crescimentoPercentual - crescimentoPercentualPrev;

  // 6. Retenção Percentual: Baseada em todos os pacientes do sistema desde junho
  const retentionPatients = patients.filter(p => 
    (!p.usuario_cadastro?.includes('Planilha') && p.data_cadastro >= '2026-06-01') ||
    (p.data_ultima_atualizacao >= '2026-06-01' && p.data_ultima_atualizacao !== p.data_cadastro)
  );
  const totalPatientsRet = retentionPatients.length;
  const activePatientsRet = retentionPatients.filter(p => p.status === 'Ativo').length;
  const newPatientsRet = retentionPatients.filter(p => p.status === 'Novo Cliente').length;
  const activeAndNewRet = activePatientsRet + newPatientsRet;
  const retencaoPercentual = totalPatientsRet > 0 
    ? (activeAndNewRet / totalPatientsRet) * 100 
    : 100;

  const inativosFimMes = patients.filter(p => {
    const isSystemScope = (!p.usuario_cadastro?.includes('Planilha') && p.data_cadastro >= '2026-06-01') ||
                          (p.data_ultima_atualizacao >= '2026-06-01' && p.data_ultima_atualizacao !== p.data_cadastro);
    return isSystemScope && p.status === 'Inativo';
  }).length;

  // ----------------------------------------------------
  // CHART 1: STATUS DISTRIBUTION FOR FILTERED MONTH
  // ----------------------------------------------------
  const statusPieData = [
    { name: 'Ativos', value: ativosFimMes, color: '#059669' },
    { name: 'Novos no Mês', value: novosMes, color: '#94A3B8' },
    { name: 'Inativos', value: inativosFimMes, color: '#F59E0B' },
    { name: 'Desistências no Mês', value: desistentesMes, color: '#EF4444' }
  ];

  // ----------------------------------------------------
  // CHART 2: HISTORICAL TREND COMPARISON (6 MONTHS ENDING IN SELECTED MONTH)
  // ----------------------------------------------------
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    let mVal = Number(selectedMonth) - i;
    let yVal = Number(selectedYear);
    if (mVal <= 0) {
      mVal = 12 + mVal;
      yVal = yVal - 1;
    }
    const mStr = String(mVal).padStart(2, '0');
    const prefixStr = `${yVal}-${mStr}`;
    const mName = monthsList.find(m => m.value === mStr)?.label.substring(0, 3) || mStr;

    const entries = patients.filter(p => p.data_cadastro.startsWith(prefixStr) && !p.usuario_cadastro?.includes('Planilha')).length;
    const exits = patients.filter(p => p.status === 'Desistiu' && p.data_ultima_atualizacao.startsWith(prefixStr)).length;

    trendData.push({
      name: `${mName}/${String(yVal).substring(2)}`,
      'Entradas': entries,
      'Saídas': exits
    });
  }

  // ----------------------------------------------------
  // CHART 3: DYNAMIC ACTIVE EVOLUTION LINE (Ativos vs Inativos vs Desistentes)
  // ----------------------------------------------------
  const evolutionData = [];
  for (let i = 5; i >= 0; i--) {
    let mVal = Number(selectedMonth) - i;
    let yVal = Number(selectedYear);
    if (mVal <= 0) {
      mVal = 12 + mVal;
      yVal = yVal - 1;
    }
    const mStr = String(mVal).padStart(2, '0');
    const cutoffDate = `${yVal}-${mStr}-31`;
    const mName = monthsList.find(m => m.value === mStr)?.label.substring(0, 3) || mStr;

    const activeCount = patients.filter(p => {
      const registered = p.data_cadastro <= cutoffDate;
      const isDesistenteAtCutoff = p.status === 'Desistiu' && p.data_ultima_atualizacao <= cutoffDate;
      const isInativoAtCutoff = p.status === 'Inativo' && p.data_ultima_atualizacao <= cutoffDate;
      return registered && !isDesistenteAtCutoff && !isInativoAtCutoff;
    }).length;

    const desistenteCount = patients.filter(p => {
      const registered = p.data_cadastro <= cutoffDate;
      const isDesistenteAtCutoff = p.status === 'Desistiu' && p.data_ultima_atualizacao <= cutoffDate;
      return registered && isDesistenteAtCutoff;
    }).length;

    const inativoCount = patients.filter(p => {
      const registered = p.data_cadastro <= cutoffDate;
      const isInativoAtCutoff = p.status === 'Inativo' && p.data_ultima_atualizacao <= cutoffDate;
      return registered && isInativoAtCutoff;
    }).length;

    evolutionData.push({
      name: `${mName}/${String(yVal).substring(2)}`,
      'Pacientes Ativos': activeCount,
      'Desistências': desistenteCount,
      'Pacientes Inativos': inativoCount
    });
  }

  // ----------------------------------------------------
  // CHART 4: DROPOUT REASONS IN SELECT PERIOD
  // ----------------------------------------------------
  const monthlyDropouts = patients.filter(
    p => p.status === 'Desistiu' && p.data_ultima_atualizacao.startsWith(targetPrefix)
  );
  
  const reasonsCount: { [key: string]: number } = {
    'Finanças': 0,
    'Mudança': 0,
    'Insatisfação': 0,
    'Falta Tempo': 0,
    'Alta Terap.': 0,
    'Outros': 0
  };

  monthlyDropouts.forEach(p => {
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
      
      {/* Selection Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-brand-blue-light text-brand-blue-primary rounded-xl">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 font-outfit text-sm">Filtro de Análise</h3>
            <p className="text-slate-400 text-[10px] font-light mt-0.5">Selecione o mês e ano para auditar o fluxo clínico.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Select Month */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 focus:border-brand-blue-primary rounded-xl text-xs font-semibold bg-white outline-none appearance-none"
          >
            {monthsList.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Select Year */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 focus:border-brand-blue-primary rounded-xl text-xs font-semibold bg-white outline-none appearance-none"
          >
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
                A conexão com a nuvem Supabase está activa, mas as tabelas do CRM (<code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">pacientes</code>, <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">logs</code>, <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">configuracoes</code>, <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-slate-200">usuarios</code>) não foram encontradas. Por isso, as análises de desempenho não estão carregando.
              </p>
            </div>
          </div>
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Como resolver isso:</h4>
            <ul className="list-decimal list-inside text-xs text-slate-350 space-y-2 font-light leading-relaxed">
              <li>Acesse o painel do seu projeto no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 font-semibold hover:underline">Supabase Console</a>.</li>
              <li>No menu lateral esquerdo, clique na opção <strong>SQL Editor</strong>.</li>
              <li>Clique em <strong>New Query</strong> para criar uma consulta SQL em branco.</li>
              <li>Abra o arquivo <code className="text-emerald-400 bg-slate-900/80 px-1 py-0.5 rounded font-mono">supabase_schema.sql</code> localizado na raiz da pasta do seu projeto CRM, copie todo o seu conteúdo de código, cole no SQL Editor do Supabase e clique em <strong>Run</strong> (ou aperte Ctrl+Enter).</li>
              <li>Após rodar com sucesso, recarregue esta página do CRM!</li>
            </ul>
          </div>
        </div>
      )}

      {/* Analytics Resumo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Novos Pacientes */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Novos</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{novosMes}</strong>
          </div>
        </div>

        {/* Pacientes Ativos */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-brand-green-primary">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Ativos</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{ativosFimMes}</strong>
          </div>
        </div>

        {/* Desistentes */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50 text-red-600">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Desistentes</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{desistentesMes}</strong>
          </div>
        </div>

        {/* Crescimento % */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className={`p-2 rounded-lg ${totalAtPrevMonth > 0 ? (diffFromPrevMonth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600') : 'bg-purple-50 text-purple-600'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Crescimento</span>
            <strong className="text-lg font-bold text-slate-700 mt-0.5 flex items-center gap-0.5">
              <span>{crescimentoPercentual.toFixed(1)}%</span>
              {totalAtPrevMonth > 0 && (
                <>
                  {diffFromPrevMonth >= 0 
                    ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                  }
                  <span className={`text-[10px] ml-0.5 ${diffFromPrevMonth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ({diffFromPrevMonth >= 0 ? '+' : ''}{diffFromPrevMonth.toFixed(1)}%)
                  </span>
                </>
              )}
            </strong>
          </div>
        </div>

        {/* Retenção % */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Retenção</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{retencaoPercentual.toFixed(1)}%</strong>
          </div>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend comparative: Entradas e Saídas (Last 6 Months) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Evolução do Fluxo Clínico</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Histórico comparativo de entradas e saídas até a data selecionada.</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Entradas" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown for selected month */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Distribuição Mensal</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Diagnóstico proporcional do período selecionado.</p>
          </div>
          <div className="h-[180px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
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
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Ativos Fim</span>
              <span className="text-xl font-extrabold text-brand-blue-dark font-outfit">{ativosFimMes}</span>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            {statusPieData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-brand-blue-dark">
                  {item.value} ({ativosFimMes + desistentesMes > 0 ? ((item.value / (ativosFimMes + desistentesMes)) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Comparative patients curve */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Comparativo de Evolução Semestral</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Trajetória e comparação de pacientes ativos, inativos e desistências.</p>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="Pacientes Ativos" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  activeDot={{ r: 6 }} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Pacientes Inativos" 
                  stroke="#F59E0B" 
                  strokeWidth={2.5} 
                  activeDot={{ r: 5 }} 
                  dot={{ r: 3, strokeWidth: 1.5, fill: '#FFFFFF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Desistências" 
                  stroke="#EF4444" 
                  strokeWidth={2.5} 
                  activeDot={{ r: 5 }} 
                  dot={{ r: 3, strokeWidth: 1.5, fill: '#FFFFFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reasons of Dropout for selected period */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Motivos de Abandono no Período</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Mapeamento causal de saídas em {monthsList.find(m => m.value === selectedMonth)?.label}.</p>
          </div>

          {reasonsPieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-6 text-slate-400 text-xs font-light">
              Nenhuma desistência registrada neste mês selecionado.
            </div>
          ) : (
            <>
              <div className="h-[150px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {reasonsPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={REASONS_COLORS[index % REASONS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} saídas`]} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[120px] pr-1 scrollbar">
                {reasonsPieData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: REASONS_COLORS[idx % REASONS_COLORS.length] }} />
                      {item.name}
                    </span>
                    <span className="font-bold text-brand-blue-dark">
                      {item.value} ({((item.value / desistentesMes) * 100).toFixed(0)}%)
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
