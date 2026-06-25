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
  ShieldAlert
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

export const NewPatientsHistory: React.FC = () => {
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
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

  const yearsList = ['2026', '2025', '2027'];

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
    
    let entries = 0;
    let exits = 0;

    if (selectedYear === '2026') {
      if (month.value === '06') {
        entries = 24;
        exits = 3;
      } else if (month.value > '06') {
        // Entradas (registered in that month, not imported)
        entries = patients.filter(p => 
          p.data_cadastro.startsWith(yearMonthPrefix) && 
          !p.usuario_cadastro?.includes('Planilha')
        ).length;

        // Saídas (marked as Desistiu, with date of update in that month)
        exits = patients.filter(p => 
          p.status === 'Desistiu' && 
          p.data_ultima_atualizacao.startsWith(yearMonthPrefix)
        ).length;
      }
      // Se for anterior a Junho de 2026, entradas e saídas permanecem 0
    } else if (Number(selectedYear) > 2026) {
      // Entradas (registered in that month, not imported)
      entries = patients.filter(p => 
        p.data_cadastro.startsWith(yearMonthPrefix) && 
        !p.usuario_cadastro?.includes('Planilha')
      ).length;

      // Saídas (marked as Desistiu, with date of update in that month)
      exits = patients.filter(p => 
        p.status === 'Desistiu' && 
        p.data_ultima_atualizacao.startsWith(yearMonthPrefix)
      ).length;
    }
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

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-semibold">Selecionar Ano:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-slate-200 focus:border-brand-blue-primary rounded-xl text-xs font-semibold bg-white outline-none appearance-none cursor-pointer min-w-[100px]"
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
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Entradas no Ano</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{totalEntries} novos</strong>
          </div>
        </div>

        {/* Total Saídas */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50 text-red-600">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Saídas no Ano</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5">{totalExits} desistências</strong>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className={`p-2 rounded-lg ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {netBalance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Saldo de Crescimento</span>
            <strong className={`text-lg font-bold block mt-0.5 ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netBalance >= 0 ? '+' : ''}{netBalance} pacientes
            </strong>
          </div>
        </div>

        {/* Melhor Mês */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-green-light text-brand-green-primary">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Melhor Mês do Ano</span>
            <strong className="text-lg font-bold text-slate-700 block mt-0.5 truncate">{bestMonthLabel}</strong>
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
                  <tr key={row.monthKey} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-800 font-semibold">{row.monthLabel}</td>
                    <td className="px-3 py-2.5 text-center text-brand-blue-primary">
                      {row['Entradas (Novos)'] > 0 ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                          {row['Entradas (Novos)']}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row['Saídas (Desistências)'] > 0 ? (
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">
                          {row['Saídas (Desistências)']}
                        </span>
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

    </div>
  );
};
