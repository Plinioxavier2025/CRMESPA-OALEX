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
  Activity
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

export const Dashboard: React.FC = () => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  // Time context variables based on simulation (June 2026)
  const currentYear = 2026;
  const currentMonthStr = '06'; // June

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await db.getPacientes();
        setPatients(data);
      } catch (e) {
        console.error(e);
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

  const prefix = `${currentYear}-${currentMonthStr}`;
  const novosMes = patients.filter(p => p.data_cadastro.startsWith(prefix)).length;
  const desistentesMes = patients.filter(p => p.status === 'Desistiu' && p.data_ultima_atualizacao.startsWith(prefix)).length;

  // Clientes Cadastrados no Mês / Ano
  const cadastradosMes = patients.filter(p => p.data_cadastro.startsWith(prefix)).length;
  const cadastradosAno = patients.filter(p => p.data_cadastro.startsWith(String(currentYear))).length;

  // Math calculation for Growth comparing June to May
  // Active in May (Registered before 2026-06-01 and didn't drop out before 2026-06-01)
  const activeInMay = patients.filter(p => {
    const registeredBeforeJune = p.data_cadastro < '2026-06-01';
    const isDesistenteBeforeJune = p.status === 'Desistiu' && p.data_ultima_atualizacao < '2026-06-01';
    return registeredBeforeJune && !isDesistenteBeforeJune;
  }).length;

  const growthRate = activeInMay > 0 
    ? ((novosMes - desistentesMes) / activeInMay) * 100 
    : 0;

  // Retention Rate: (Active + New) / Total Patients * 100
  const activeAndNew = activePatients + newPatients;
  const retentionRate = totalPatients > 0 
    ? (activeAndNew / totalPatients) * 100 
    : 100;

  // ----------------------------------------------------
  // CHART DATA: PIX DATA (Ativos vs Novos vs Desistentes)
  // ----------------------------------------------------
  const statusPieData = [
    { name: 'Ativos', value: activePatients, color: '#059669' },
    { name: 'Novos', value: newPatients, color: '#3B82F6' },
    { name: 'Desistentes', value: desistentesPatients, color: '#EF4444' }
  ];

  // ----------------------------------------------------
  // CHART DATA: MONTHLY ENTRIES & EXITS (BARS)
  // ----------------------------------------------------
  const monthsNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const barChartData = monthsNames.map((name, index) => {
    const monthNum = String(index + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${monthNum}`;

    const entries = patients.filter(p => p.data_cadastro.startsWith(monthPrefix)).length;
    const exits = patients.filter(p => p.status === 'Desistiu' && p.data_ultima_atualizacao.startsWith(monthPrefix)).length;

    return {
      name,
      'Novas Entradas': entries,
      'Desistências': exits
    };
  }).slice(0, 6); // Expose Jan to June (First semester of 2026)

  // ----------------------------------------------------
  // CHART DATA: HISTORICAL EVOLUTION LINE
  // ----------------------------------------------------
  const lineChartData = monthsNames.map((name, index) => {
    const monthNum = String(index + 1).padStart(2, '0');
    const lastDayStr = `${currentYear}-${monthNum}-31`; // generic cutoff
    
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
  }).slice(0, 6);

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

  const REASONS_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  return (
    <div className="space-y-6">
      {/* Dynamic welcome greetings bar */}
      <div className="bg-gradient-to-r from-brand-blue-dark to-brand-accent p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-white/5 skew-x-12 transform origin-top-right pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-outfit text-white">Painel Executivo</h2>
            <p className="text-xs text-slate-200 font-light max-w-xl">
              Bem-vindo ao CRM do Espaço Alex Silveira. Aqui estão compilados os indicadores de atração, crescimento e retenção da clínica para o mês de Junho de 2026.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
            <Calendar className="w-4.5 h-4.5 text-emerald-400" />
            <span>Mês de Referência: <strong>Junho / 2026</strong></span>
          </div>
        </div>
      </div>

      {/* Primary Indicator Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Pacientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-brand-blue-light text-brand-blue-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Total de Pacientes</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">{totalPatients}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Histórico acumulado na clínica</span>
          </div>
        </div>

        {/* Pacientes Ativos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-brand-green-primary">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Pacientes Ativos</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">{activePatients}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Recebendo atendimento contínuo</span>
          </div>
        </div>

        {/* Novos Pacientes do Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Novos do Mês</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">{novosMes}</strong>
            <span className="text-[10px] text-emerald-600 mt-1 block font-medium">+{cadastradosMes} cadastrados este mês</span>
          </div>
        </div>

        {/* Pacientes Desistentes do Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-red-50 text-red-600">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Desistentes do Mês</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">{desistentesMes}</strong>
            <span className="text-[10px] text-red-600 mt-1 block font-medium">-{desistentesMes} saídas este mês</span>
          </div>
        </div>

        {/* Crescimento Mensal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Crescimento Mensal</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Relação entradas x saídas</span>
          </div>
        </div>

        {/* Taxa de Retenção */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Taxa de Retenção</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">{retentionRate.toFixed(1)}%</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Proporção de pacientes ativos</span>
          </div>
        </div>

        {/* Cadastrados no Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-orange-50 text-orange-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Cadastros no Mês</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">{cadastradosMes}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Faturamento e captação</span>
          </div>
        </div>

        {/* Cadastrados no Ano */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-sky-50 text-sky-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Cadastros no Ano</span>
            <strong className="text-2xl font-bold text-brand-blue-dark font-outfit block mt-0.5">{cadastradosAno}</strong>
            <span className="text-[10px] text-slate-400 mt-1 block">Acumulado anual (2026)</span>
          </div>
        </div>

      </div>

      {/* Charts Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Entradas vs Saídas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Fluxo Mensal de Entradas e Saídas</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Estatísticas comparativas de novas consultas e saídas de pacientes.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Novas Entradas" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="Desistências" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pizza */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Distribuição de Status</h3>
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
                <Tooltip formatter={(value) => [`${value} pacientes`]} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: Active patient progression */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Evolução de Pacientes Ativos</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Curva acumulada de pacientes ativos na clínica ao longo dos meses.</p>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
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
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Motivos de Desistência</h3>
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
                    <Tooltip formatter={(value) => [`${value} desistências`]} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
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
