import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Paciente } from '../services/db';
import { 
  CalendarDays, 
  UserPlus, 
  UserMinus, 
  TrendingUp, 
  History,
  TrendingDown,
  Info,
  ShieldAlert,
  Calendar,
  Phone,
  FilterX
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

interface NewPatientsHistoryProps {
  navigateToPatients?: (status?: string, month?: string, year?: string, excludePlanilha?: boolean) => void;
}

export const NewPatientsHistory: React.FC<NewPatientsHistoryProps> = ({ navigateToPatients }) => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('crm_selected_year');
    if (saved) return saved;
    return new Date().getFullYear().toString();
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('crm_history_selected_month');
    if (saved) return saved;
    return 'all';
  });

  useEffect(() => {
    localStorage.setItem('crm_selected_year', selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('crm_history_selected_month', selectedMonth);
  }, [selectedMonth]);
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

  const yearsList = (() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    const endYear = Math.max(currentYear + 1, 2027);
    const list = [];
    for (let y = endYear; y >= startYear; y--) {
      list.push(String(y));
    }
    return list;
  })();

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
  // CALCULATE MONTHLY HISTORICAL DATA FOR SELECTED YEAR
  // ----------------------------------------------------
  const monthlyData = monthsList.map(month => {
    const yearMonthPrefix = `${selectedYear}-${month.value}`;
    
    // Entradas (registrados naquele mês via sistema a partir de julho, ou manual spreadsheet patient activations)
    const entries = patients.filter(p => {
      const isNewDirect = !p.usuario_cadastro?.includes('Planilha') && 
                          p.data_cadastro.startsWith(yearMonthPrefix) && 
                          p.data_cadastro >= '2026-07-01';
      const isModifiedToActive = !p.usuario_cadastro?.includes('Planilha') &&
                                 p.data_cadastro < '2026-07-01' &&
                                 p.data_ultima_atualizacao.startsWith(yearMonthPrefix) && 
                                 (p.status === 'Ativo' || p.status === 'Novo Cliente');
      return isNewDirect || isModifiedToActive;
    }).length;

    // Saídas (marcados como Desistiu ou Inativo, com data de atualização naquele mês, e no escopo do sistema)
    const exits = patients.filter(p => {
      const isExitStatus = p.status === 'Desistiu' || p.status === 'Inativo';
      const isModifiedThisMonth = p.data_ultima_atualizacao.startsWith(yearMonthPrefix);
      const isSystemScope = !p.usuario_cadastro?.includes('Planilha') && 
                            (p.data_cadastro >= '2026-07-01' || p.data_ultima_atualizacao !== p.data_cadastro);
      return isExitStatus && isModifiedThisMonth && isSystemScope;
    }).length;
    // Se for anterior a 2026, entradas e saídas permanecem 0

    const balance = entries - exits;

    return {
      monthKey: month.value,
      monthLabel: month.label,
      'Entradas (Novos)': entries,
      'Saídas (Desistências)': exits,
      'Saldo Líquido': balance
    };
  });

  // Calculate year totals
  const totalEntries = monthlyData.reduce((acc, curr) => acc + curr['Entradas (Novos)'], 0);
  const totalExits = monthlyData.reduce((acc, curr) => acc + curr['Saídas (Desistências)'], 0);
  const netBalance = totalEntries - totalExits;
  const bestMonthObj = [...monthlyData].sort((a, b) => b['Entradas (Novos)'] - a['Entradas (Novos)'])[0];
  const bestMonthLabel = bestMonthObj && bestMonthObj['Entradas (Novos)'] > 0 
    ? `${bestMonthObj.monthLabel} (${bestMonthObj['Entradas (Novos)']})`
    : 'Nenhum';

  const selectedMonthData = selectedMonth === 'all' 
    ? null 
    : monthlyData.find(m => m.monthKey === selectedMonth);

  const displayEntries = selectedMonthData ? selectedMonthData['Entradas (Novos)'] : totalEntries;
  const displayExits = selectedMonthData ? selectedMonthData['Saídas (Desistências)'] : totalExits;
  const displayBalance = selectedMonthData ? selectedMonthData['Saldo Líquido'] : netBalance;
  
  const entriesLabel = selectedMonth === 'all' ? 'Entradas no Ano' : 'Entradas no Mês';
  const exitsLabel = selectedMonth === 'all' ? 'Saídas no Ano' : 'Saídas no Mês';
  const balanceLabel = selectedMonth === 'all' ? 'Saldo de Crescimento' : 'Saldo de Crescimento';
  const referenceMonthLabel = selectedMonth === 'all' 
    ? 'Ano Inteiro' 
    : monthsList.find(m => m.value === selectedMonth)?.label || '';

  const selectedYearMonth = `${selectedYear}-${selectedMonth}`;
  
  const entriesPatients = selectedMonth === 'all' 
    ? [] 
    : patients.filter(p => {
        const isNewDirect = !p.usuario_cadastro?.includes('Planilha') && 
                            p.data_cadastro.startsWith(selectedYearMonth) && 
                            p.data_cadastro >= '2026-07-01';
        const isModifiedToActive = !p.usuario_cadastro?.includes('Planilha') &&
                                   p.data_cadastro < '2026-07-01' &&
                                   p.data_ultima_atualizacao.startsWith(selectedYearMonth) && 
                                   (p.status === 'Ativo' || p.status === 'Novo Cliente');
        return isNewDirect || isModifiedToActive;
      });

  const exitsPatients = selectedMonth === 'all' 
    ? [] 
    : patients.filter(p => {
        const isExitStatus = p.status === 'Desistiu' || p.status === 'Inativo';
        const isModifiedThisMonth = p.data_ultima_atualizacao.startsWith(selectedYearMonth);
        const isSystemScope = !p.usuario_cadastro?.includes('Planilha') && 
                              (p.data_cadastro >= '2026-07-01' || p.data_ultima_atualizacao !== p.data_cadastro);
        return isExitStatus && isModifiedThisMonth && isSystemScope;
      });

  return (
    <div className="space-y-6">
      
      {/* Control Panel / Year Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-brand-blue-light text-brand-blue-primary rounded-xl">
            <History className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 font-outfit text-sm">Histórico de Novos Clientes</h3>
            <p className="text-slate-400 text-[10px] font-light mt-0.5">Audite o volume de novos cadastros e desistências mês a mês.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Mês:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-slate-200 focus:border-brand-blue-primary rounded-xl text-xs font-semibold bg-white outline-none appearance-none cursor-pointer min-w-[130px]"
            >
              <option value="all">Todos os Meses</option>
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-slate-200 focus:border-brand-blue-primary rounded-xl text-xs font-semibold bg-white outline-none appearance-none cursor-pointer min-w-[90px]"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
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
              <h3 className="text-base font-bold text-red-400 font-outfit">Erro na conexão do banco de dados</h3>
              <p className="text-xs text-slate-300 font-light mt-1 leading-relaxed">
                Não foi possível carregar a lista de pacientes do Supabase para esta auditoria.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Warning Alert */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800 font-light leading-relaxed">
          <strong>Importante:</strong> Esta visualização calcula os novos clientes pelo mês de cadastro no sistema (excluindo os importados de planilhas). As saídas correspondem a pacientes marcados como desistentes cuja data de atualização foi registrada no respectivo mês. A virada automática do mês que move os pacientes para "Ativo" não altera a contagem histórica de novos cadastros de cada período.
        </div>
      </div>

      {/* Aggregated Totals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Entradas */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{entriesLabel}</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{displayEntries} novos</strong>
          </div>
        </div>

        {/* Total Saídas */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50 text-red-600">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{exitsLabel}</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{displayExits} desistências</strong>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className={`p-2 rounded-lg ${displayBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {displayBalance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{balanceLabel}</span>
            <strong className={`text-lg font-bold block mt-0.5 ${displayBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {displayBalance >= 0 ? '+' : ''}{displayBalance} pacientes
            </strong>
          </div>
        </div>

        {/* Melhor Mês */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-green-light text-brand-green-primary">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              {selectedMonth === 'all' ? 'Melhor Mês do Ano' : 'Mês de Referência'}
            </span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5 truncate">
              {selectedMonth === 'all' ? bestMonthLabel : referenceMonthLabel}
            </strong>
          </div>
        </div>

      </div>

      {/* Content Layout Grid (Chart and Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Historical Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-3 flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Gráfico de Entradas vs Saídas ({selectedYear})</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Visão analítica de novos pacientes contra desistências.</p>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="monthLabel" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }} 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '12px', 
                    color: '#f8fafc', 
                    fontSize: '12px' 
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Entradas (Novos)" fill="#3B4E68" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="Saídas (Desistências)" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Dados por Mês ({selectedYear})</h3>
            <p className="text-xs text-slate-400 font-light mt-0.5">Tabela consolidada sem dados nominais, apenas quantitativos.</p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[300px] overflow-y-auto scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Mês</th>
                  <th className="px-3 py-3 text-center">Entradas</th>
                  <th className="px-3 py-3 text-center">Saídas</th>
                  <th className="px-3 py-3 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {monthlyData.map((row) => (
                  <tr 
                    key={row.monthKey} 
                    className={`transition-colors cursor-pointer ${selectedMonth === row.monthKey ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50/50'}`}
                    onClick={() => setSelectedMonth(row.monthKey)}
                    title={`Clique para selecionar ${row.monthLabel} e ver detalhamento`}
                  >
                    <td className="px-4 py-2.5 text-slate-800 font-semibold flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedMonth === row.monthKey ? 'bg-brand-blue-primary' : 'bg-transparent'}`} />
                      {row.monthLabel}
                    </td>
                    <td className="px-3 py-2.5 text-center text-brand-blue-primary">
                      {row['Entradas (Novos)'] > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (navigateToPatients) navigateToPatients(undefined, row.monthKey, selectedYear, true);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold cursor-pointer transition-colors"
                          title={`Ver novos pacientes de ${row.monthLabel}`}
                        >
                          {row['Entradas (Novos)']}
                        </button>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row['Saídas (Desistências)'] > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (navigateToPatients) navigateToPatients('Desistiu', row.monthKey, selectedYear);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold cursor-pointer transition-colors"
                          title={`Ver desistências de ${row.monthLabel}`}
                        >
                          {row['Saídas (Desistências)']}
                        </button>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {row['Saldo Líquido'] > 0 ? (
                        <span className="text-emerald-600 font-extrabold font-outfit">+{row['Saldo Líquido']}</span>
                      ) : row['Saldo Líquido'] < 0 ? (
                        <span className="text-rose-600 font-extrabold font-outfit">{row['Saldo Líquido']}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Detailed Patients Section (only when a specific month is selected) */}
      {selectedMonth !== 'all' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h3 className="font-bold text-base text-brand-blue-dark font-outfit">
                Detalhamento Clínico — {referenceMonthLabel} de {selectedYear}
              </h3>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                Listagem nominal de entradas e saídas ocorridas neste período.
              </p>
            </div>
            <button
              onClick={() => setSelectedMonth('all')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer w-fit"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Ver Ano Completo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN 1: ENTRADAS (NEW PATIENTS) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-blue-primary" />
                  Novos Pacientes ({entriesPatients.length})
                </span>
              </div>

              {entriesPatients.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-405 font-light text-xs bg-slate-50/20">
                  Nenhum novo paciente cadastrado em {referenceMonthLabel}.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar">
                  {entriesPatients.map((p) => (
                    <div 
                      key={p.id}
                      className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-xs transition-all flex items-center justify-between gap-3 bg-slate-50/30"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <strong 
                          onClick={() => navigateToPatients && navigateToPatients(undefined, selectedMonth, selectedYear, true)}
                          className="font-bold text-xs text-brand-blue-dark truncate block hover:underline cursor-pointer"
                          title="Ir para a ficha de pacientes"
                        >
                          {p.nome}
                        </strong>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-350" />
                            <span className="font-mono">{p.telefone}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-350" />
                            <span>Cadastrado em: {p.data_cadastro.split('-').reverse().join('/')}</span>
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-[9px] font-bold whitespace-nowrap">
                        {p.convenio}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN 2: SAÍDAS (DESISTÊNCIAS) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Desistências / Saídas ({exitsPatients.length})
                </span>
              </div>

              {exitsPatients.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-405 font-light text-xs bg-slate-50/20">
                  Nenhuma desistência registrada em {referenceMonthLabel}.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar">
                  {exitsPatients.map((p) => (
                    <div 
                      key={p.id}
                      className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-xs transition-all flex flex-col gap-2 bg-slate-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <strong 
                            onClick={() => navigateToPatients && navigateToPatients('Desistiu', selectedMonth, selectedYear)}
                            className="font-bold text-xs text-brand-blue-dark truncate block hover:underline cursor-pointer"
                            title="Ver desistentes no prontuário"
                          >
                            {p.nome}
                          </strong>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-350" />
                              <span className="font-mono">{p.telefone}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-350" />
                              <span>Saída em: {p.data_ultima_atualizacao.split('-').reverse().join('/')}</span>
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full border border-slate-150 bg-slate-100 text-slate-600 text-[9px] font-bold whitespace-nowrap">
                          {p.convenio}
                        </span>
                      </div>

                      {p.motivo_desistencia && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-amber-50/50 border border-amber-100/50 text-[10px] text-amber-800 font-medium leading-relaxed">
                          <span className="font-bold block text-[9px] text-amber-700 uppercase tracking-wider mb-0.5">Motivo Relatado:</span>
                          {p.motivo_desistencia}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
