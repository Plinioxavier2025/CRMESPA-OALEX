import { supabase } from './supabase';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha?: string; // stored simple password
  perfil: 'admin';
  criado_em?: string;
}

export interface Paciente {
  id: string;
  nome: string;
  telefone: string;
  convenio: string;
  status: 'Novo Cliente' | 'Ativo' | 'Desistiu';
  motivo_desistencia?: string; // e.g. "Questão financeira", "Alta terapêutica", "Outro: Descrição..."
  data_cadastro: string; // YYYY-MM-DD
  hora_cadastro: string; // HH:MM:SS
  data_ultima_atualizacao: string; // YYYY-MM-DD
  hora_ultima_atualizacao: string; // HH:MM:SS
  usuario_cadastro: string; // user name/email
  import_id?: string;
  importado_em?: string;
}

export interface Log {
  id: string;
  usuario_nome: string;
  acao: string;
  detalhes?: string;
  created_at: string;
}

// ----------------------------------------------------
// SEED MOCK DATA FOR LOCAL STORAGE
// ----------------------------------------------------
const MOCK_USUARIOS: Usuario[] = [
  { id: 'u1', nome: 'Alex Silveira', email: 'alex@espacoalexsilveira.com.br', senha: 'admin', perfil: 'admin', criado_em: '2026-01-10T10:00:00Z' },
  { id: 'u2', nome: 'Administrador Espaço', email: 'silveira@espacoalexsilveira.com.br', senha: 'admin', perfil: 'admin', criado_em: '2026-01-11T14:30:00Z' }
];

const MOCK_PACIENTES: Paciente[] = [
  // Janeiro 2026
  { id: 'p1', nome: 'Mariana Santos Rodrigues', telefone: '(11) 98765-4321', convenio: 'SulAmérica', status: 'Ativo', data_cadastro: '2026-01-15', hora_cadastro: '09:30:00', data_ultima_atualizacao: '2026-06-18', hora_ultima_atualizacao: '16:00:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p2', nome: 'Carlos Eduardo Ramos', telefone: '(11) 97765-8822', convenio: 'Particular', status: 'Ativo', data_cadastro: '2026-01-20', hora_cadastro: '14:00:00', data_ultima_atualizacao: '2026-05-10', hora_ultima_atualizacao: '11:15:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p3', nome: 'Beatriz Vasconcelos', telefone: '(11) 95432-1098', convenio: 'Care Plus', status: 'Desistiu', motivo_desistencia: 'Questão financeira', data_cadastro: '2026-01-22', hora_cadastro: '16:45:00', data_ultima_atualizacao: '2026-03-15', hora_ultima_atualizacao: '14:20:00', usuario_cadastro: 'Alex Silveira' },

  // Fevereiro 2026
  { id: 'p4', nome: 'Juliana Paes de Oliveira', telefone: '(11) 96543-2109', convenio: 'Particular', status: 'Ativo', data_cadastro: '2026-02-05', hora_cadastro: '10:00:00', data_ultima_atualizacao: '2026-06-12', hora_ultima_atualizacao: '09:00:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p5', nome: 'Rodrigo Faro Nogueira', telefone: '(11) 91234-5678', convenio: 'SulAmérica', status: 'Ativo', data_cadastro: '2026-02-12', hora_cadastro: '11:30:00', data_ultima_atualizacao: '2026-05-02', hora_ultima_atualizacao: '15:30:00', usuario_cadastro: 'Administrador Espaço' },
  { id: 'p6', nome: 'Renata Lins Albuquerque', telefone: '(11) 92345-6789', convenio: 'Vivest', status: 'Desistiu', motivo_desistencia: 'Mudança de cidade', data_cadastro: '2026-02-18', hora_cadastro: '08:15:00', data_ultima_atualizacao: '2026-04-10', hora_ultima_atualizacao: '10:00:00', usuario_cadastro: 'Administrador Espaço' },

  // Março 2026
  { id: 'p7', nome: 'Lucas Medeiros Santos', telefone: '(11) 99887-7665', convenio: 'Care Plus', status: 'Ativo', data_cadastro: '2026-03-03', hora_cadastro: '15:00:00', data_ultima_atualizacao: '2026-06-05', hora_ultima_atualizacao: '14:00:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p8', nome: 'Aline de Souza Ferreira', telefone: '(11) 93456-7890', convenio: 'Particular', status: 'Ativo', data_cadastro: '2026-03-10', hora_cadastro: '17:30:00', data_ultima_atualizacao: '2026-03-10', hora_ultima_atualizacao: '17:30:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p9', nome: 'Gustavo Henrique Costa', telefone: '(11) 94567-8901', convenio: 'Vivest', status: 'Desistiu', motivo_desistencia: 'Alta terapêutica', data_cadastro: '2026-03-25', hora_cadastro: '14:15:00', data_ultima_atualizacao: '2026-06-01', hora_ultima_atualizacao: '16:30:00', usuario_cadastro: 'Administrador Espaço' },

  // Abril 2026
  { id: 'p10', nome: 'Patrícia Pillar Mendes', telefone: '(11) 95678-9012', convenio: 'SulAmérica', status: 'Ativo', data_cadastro: '2026-04-02', hora_cadastro: '10:30:00', data_ultima_atualizacao: '2026-04-02', hora_ultima_atualizacao: '10:30:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p11', nome: 'Felipe Camargo Rezende', telefone: '(11) 96789-0123', convenio: 'Care Plus', status: 'Ativo', data_cadastro: '2026-04-14', hora_cadastro: '09:00:00', data_ultima_atualizacao: '2026-04-14', hora_ultima_atualizacao: '09:00:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p12', nome: 'Letícia Spiller Lima', telefone: '(11) 97890-1234', convenio: 'Particular', status: 'Desistiu', motivo_desistencia: 'Falta de tempo', data_cadastro: '2026-04-20', hora_cadastro: '11:15:00', data_ultima_atualizacao: '2026-05-18', hora_ultima_atualizacao: '11:15:00', usuario_cadastro: 'Administrador Espaço' },

  // Maio 2026
  { id: 'p13', nome: 'Thiago Lacerda Santos', telefone: '(11) 98901-2345', convenio: 'Vivest', status: 'Ativo', data_cadastro: '2026-05-04', hora_cadastro: '16:00:00', data_ultima_atualizacao: '2026-05-04', hora_ultima_atualizacao: '16:00:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p14', nome: 'Fernanda Montenegro', telefone: '(11) 99012-3456', convenio: 'Particular', status: 'Novo Cliente', data_cadastro: '2026-05-18', hora_cadastro: '14:30:00', data_ultima_atualizacao: '2026-05-18', hora_ultima_atualizacao: '14:30:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p15', nome: 'Tony Ramos Fernandes', telefone: '(11) 90123-4567', convenio: 'SulAmérica', status: 'Desistiu', motivo_desistencia: 'Insatisfação', data_cadastro: '2026-05-22', hora_cadastro: '15:15:00', data_ultima_atualizacao: '2026-06-02', hora_ultima_atualizacao: '15:15:00', usuario_cadastro: 'Administrador Espaço' },

  // Junho 2026 (Mês atual na simulação)
  { id: 'p16', nome: 'Cláudia Abreu Fonseca', telefone: '(11) 91234-8765', convenio: 'Care Plus', status: 'Novo Cliente', data_cadastro: '2026-06-02', hora_cadastro: '10:00:00', data_ultima_atualizacao: '2026-06-02', hora_ultima_atualizacao: '10:00:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p17', nome: 'Fábio Assunção Becker', telefone: '(11) 92345-9876', convenio: 'Vivest', status: 'Ativo', data_cadastro: '2026-06-08', hora_cadastro: '09:15:00', data_ultima_atualizacao: '2026-06-08', hora_ultima_atualizacao: '09:15:00', usuario_cadastro: 'Alex Silveira' },
  { id: 'p18', nome: 'Glória Pires de Souza', telefone: '(11) 93456-0987', convenio: 'Particular', status: 'Desistiu', motivo_desistencia: 'Outro: Indicada a outro especialista em TDAH de crianças', data_cadastro: '2026-06-11', hora_cadastro: '14:00:00', data_ultima_atualizacao: '2026-06-19', hora_ultima_atualizacao: '16:45:00', usuario_cadastro: 'Administrador Espaço' },
  { id: 'p19', nome: 'Marcos Palmeira Neto', telefone: '(11) 94567-2109', convenio: 'SulAmérica', status: 'Novo Cliente', data_cadastro: '2026-06-15', hora_cadastro: '16:00:00', data_ultima_atualizacao: '2026-06-15', hora_ultima_atualizacao: '16:00:00', usuario_cadastro: 'Alex Silveira' }
];

const MOCK_LOGS: Log[] = [
  { id: 'l1', usuario_nome: 'Alex Silveira', acao: 'Login no sistema', detalhes: 'Autenticado com sucesso na clínica Espaço Alex Silveira.', created_at: '2026-06-20T08:00:00Z' },
  { id: 'l2', usuario_nome: 'Administrador Espaço', acao: 'Paciente alterado', detalhes: 'Paciente Glória Pires de Souza marcado como Desistiu. Motivo: Outro', created_at: '2026-06-19T16:45:00Z' },
  { id: 'l3', usuario_nome: 'Alex Silveira', acao: 'Novo paciente cadastrado', detalhes: 'Paciente Marcos Palmeira Neto cadastrado no convênio SulAmérica.', created_at: '2026-06-15T16:00:00Z' }
];

const DEFAULT_CONVENIOS = ["SulAmérica", "Particular", "Care Plus", "Vivest"];

// Helper functions for localStorage reading/writing
const getLocal = <T>(key: string, initial: T): T => {
  const data = localStorage.getItem(`crm_alex_${key}`);
  if (!data) {
    localStorage.setItem(`crm_alex_${key}`, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return initial;
  }
};

const setLocal = <T>(key: string, data: T) => {
  localStorage.setItem(`crm_alex_${key}`, JSON.stringify(data));
};

export const db = {
  // CONNECTION STATUS INDICATOR
  isSupabaseMode(): boolean {
    return supabase !== null;
  },

  // AUDIT LOGS
  async addLog(usuarioNome: string, acao: string, detalhes?: string): Promise<Log> {
    if (supabase) {
      const { data, error } = await supabase
        .from('logs')
        .insert([{ usuario_nome: usuarioNome, acao, detalhes }])
        .select()
        .single();
      if (!error && data) return data;
    }
    
    const logs = getLocal<Log[]>('logs', MOCK_LOGS);
    const newLog: Log = {
      id: 'l_' + Math.random().toString(36).substring(2, 11),
      usuario_nome: usuarioNome,
      acao,
      detalhes,
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    setLocal('logs', logs);
    return newLog;
  },

  async getLogs(): Promise<Log[]> {
    if (supabase) {
      const { data } = await supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    }
    return getLocal<Log[]>('logs', MOCK_LOGS);
  },

  // ADMINISTRATOR USERS
  async getUsuarios(): Promise<Usuario[]> {
    if (supabase) {
      const { data } = await supabase.from('usuarios').select('*').order('nome', { ascending: true });
      return data || [];
    }
    return getLocal<Usuario[]>('usuarios', MOCK_USUARIOS);
  },

  async saveUsuario(usuario: Omit<Usuario, 'id'> & { id?: string }): Promise<Usuario> {
    if (supabase) {
      if (usuario.id) {
        const { data } = await supabase.from('usuarios').update(usuario).eq('id', usuario.id).select().single();
        return data;
      } else {
        const { data } = await supabase.from('usuarios').insert([usuario]).select().single();
        return data;
      }
    }

    const usuarios = getLocal<Usuario[]>('usuarios', MOCK_USUARIOS);
    if (usuario.id) {
      const index = usuarios.findIndex(u => u.id === usuario.id);
      const updated = { ...usuarios[index], ...usuario } as Usuario;
      usuarios[index] = updated;
      setLocal('usuarios', usuarios);
      return updated;
    } else {
      const newU: Usuario = {
        ...usuario,
        id: 'u_' + Math.random().toString(36).substring(2, 11),
        criado_em: new Date().toISOString()
      };
      usuarios.push(newU);
      setLocal('usuarios', usuarios);
      return newU;
    }
  },

  // PATIENTS
  async getPacientes(): Promise<Paciente[]> {
    let data: Paciente[] = [];
    if (supabase) {
      const { data: sbData, error } = await supabase.from('pacientes').select('*').order('nome', { ascending: true });
      if (error) {
        console.error("Erro ao buscar pacientes no Supabase:", error);
        throw error;
      }
      data = sbData || [];
    } else {
      data = getLocal<Paciente[]>('pacientes', MOCK_PACIENTES);
    }

    // Deduplicar em tempo de execução
    const seen = new Set<string>();
    const deduplicated: Paciente[] = [];
    let modified = false;

    for (const p of data) {
      const nameNorm = (p.nome || '').toLowerCase().trim();
      const phoneNorm = (p.telefone || '').replace(/\D/g, '');
      const key = `${nameNorm}_${phoneNorm}`;

      if (seen.has(key)) {
        modified = true;
        if (supabase) {
          await supabase.from('pacientes').delete().eq('id', p.id);
        }
      } else {
        seen.add(key);
        deduplicated.push(p);
      }
    }

    if (modified) {
      if (!supabase) {
        localStorage.setItem('crm_alex_pacientes', JSON.stringify(deduplicated));
      }
      return deduplicated;
    }

    return data;
  },

  async savePaciente(paciente: Omit<Paciente, 'id' | 'data_cadastro' | 'hora_cadastro' | 'data_ultima_atualizacao' | 'hora_ultima_atualizacao'> & { 
    id?: string;
    data_cadastro?: string;
    hora_cadastro?: string;
    data_ultima_atualizacao?: string;
    hora_ultima_atualizacao?: string;
  }): Promise<Paciente> {
    const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
    
    if (supabase) {
      if (paciente.id) {
        // Update
        const updateObj = {
          ...paciente,
          data_ultima_atualizacao: paciente.data_ultima_atualizacao || todayStr,
          hora_ultima_atualizacao: paciente.hora_ultima_atualizacao || timeStr
        };
        const { data } = await supabase.from('pacientes').update(updateObj).eq('id', paciente.id).select().single();
        return data;
      } else {
        // Insert
        const insertObj = {
          ...paciente,
          data_cadastro: paciente.data_cadastro || todayStr,
          hora_cadastro: paciente.hora_cadastro || timeStr,
          data_ultima_atualizacao: paciente.data_ultima_atualizacao || todayStr,
          hora_ultima_atualizacao: paciente.hora_ultima_atualizacao || timeStr
        };
        const { data } = await supabase.from('pacientes').insert([insertObj]).select().single();
        return data;
      }
    }

    const pacientes = getLocal<Paciente[]>('pacientes', MOCK_PACIENTES);
    if (paciente.id) {
      const index = pacientes.findIndex(p => p.id === paciente.id);
      const updated = { 
        ...pacientes[index], 
        ...paciente,
        data_ultima_atualizacao: todayStr,
        hora_ultima_atualizacao: timeStr
      } as Paciente;
      pacientes[index] = updated;
      setLocal('pacientes', pacientes);
      return updated;
    } else {
      const newP: Paciente = {
        ...paciente,
        id: 'p_' + Math.random().toString(36).substring(2, 11),
        data_cadastro: paciente.data_cadastro || todayStr,
        hora_cadastro: paciente.hora_cadastro || timeStr,
        data_ultima_atualizacao: todayStr,
        hora_ultima_atualizacao: timeStr
      } as Paciente;
      pacientes.push(newP);
      setLocal('pacientes', pacientes);
      return newP;
    }
  },

  async deletePaciente(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('pacientes').delete().eq('id', id);
      return !error;
    }
    const pacientes = getLocal<Paciente[]>('pacientes', MOCK_PACIENTES);
    const filtered = pacientes.filter(p => p.id !== id);
    setLocal('pacientes', filtered);
    return true;
  },

  async deletePacientesByImportId(importId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('pacientes').delete().eq('import_id', importId);
      return !error;
    }
    const pacientes = getLocal<Paciente[]>('pacientes', MOCK_PACIENTES);
    const filtered = pacientes.filter(p => p.import_id !== importId);
    setLocal('pacientes', filtered);
    return true;
  },

  // CONFIGS (Health insurances lists)
  async getConfig(chave: string): Promise<any> {
    if (supabase) {
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', chave).single();
      return data ? data.valor : null;
    }
    const configs = getLocal<any[]>('configuracoes', [
      { chave: 'convenios', valor: DEFAULT_CONVENIOS }
    ]);
    const found = configs.find(c => c.chave === chave);
    return found ? found.valor : null;
  },

  async setConfig(chave: string, valor: any): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('configuracoes').upsert([{ chave, valor, updated_at: new Date().toISOString() }], { onConflict: 'chave' });
      return !error;
    }
    const configs = getLocal<any[]>('configuracoes', [
      { chave: 'convenios', valor: DEFAULT_CONVENIOS }
    ]);
    const index = configs.findIndex(c => c.chave === chave);
    if (index !== -1) {
      configs[index].valor = valor;
    } else {
      configs.push({ chave, valor });
    }
    setLocal('configuracoes', configs);
    return true;
  },

  async autoTransitionPatients(): Promise<void> {
    // CORREÇÃO DOS PACIENTES EXISTENTES:
    try {
      const allPatients = await this.getPacientes();
      let modified = false;
      
      const desistentesOriginais = [
        { nome: 'Beatriz Vasconcelos', telefone: '(11) 95432-1098', convenio: 'Care Plus', status: 'Desistiu' as const, motivo_desistencia: 'Questão financeira', data_cadastro: '2026-01-22', hora_cadastro: '16:45:00', data_ultima_atualizacao: '2026-03-15', hora_ultima_atualizacao: '14:20:00', usuario_cadastro: 'Alex Silveira' },
        { nome: 'Renata Lins Albuquerque', telefone: '(11) 92345-6789', convenio: 'Vivest', status: 'Desistiu' as const, motivo_desistencia: 'Mudança de cidade', data_cadastro: '2026-02-18', hora_cadastro: '08:15:00', data_ultima_atualizacao: '2026-04-10', hora_ultima_atualizacao: '10:00:00', usuario_cadastro: 'Administrador Espaço' },
        { nome: 'Gustavo Henrique Costa', telefone: '(11) 94567-8901', convenio: 'Vivest', status: 'Desistiu' as const, motivo_desistencia: 'Alta terapêutica', data_cadastro: '2026-03-25', hora_cadastro: '14:15:00', data_ultima_atualizacao: '2026-06-01', hora_ultima_atualizacao: '16:30:00', usuario_cadastro: 'Administrador Espaço' },
        { nome: 'Letícia Spiller Lima', telefone: '(11) 97890-1234', convenio: 'Particular', status: 'Desistiu' as const, motivo_desistencia: 'Falta de tempo', data_cadastro: '2026-04-20', hora_cadastro: '11:15:00', data_ultima_atualizacao: '2026-05-18', hora_ultima_atualizacao: '11:15:00', usuario_cadastro: 'Administrador Espaço' },
        { nome: 'Tony Ramos Fernandes', telefone: '(11) 90123-4567', convenio: 'SulAmérica', status: 'Desistiu' as const, motivo_desistencia: 'Insatisfação', data_cadastro: '2026-05-22', hora_cadastro: '15:15:00', data_ultima_atualizacao: '2026-06-02', hora_ultima_atualizacao: '15:15:00', usuario_cadastro: 'Administrador Espaço' },
        { nome: 'Glória Pires de Souza', telefone: '(11) 93456-0987', convenio: 'Particular', status: 'Desistiu' as const, motivo_desistencia: 'Outro: Indicada a outro especialista em TDAH de crianças', data_cadastro: '2026-06-11', hora_cadastro: '14:00:00', data_ultima_atualizacao: '2026-06-19', hora_ultima_atualizacao: '16:45:00', usuario_cadastro: 'Administrador Espaço' }
      ];

      const desistentesNomes = desistentesOriginais.map(d => d.nome);

      // 1. Deduplicar pacientes (mesmo nome e telefone)
      const seen = new Set<string>();
      const deduplicated: Paciente[] = [];
      for (const p of allPatients) {
        const nameNorm = p.nome.toLowerCase().trim();
        const phoneNorm = p.telefone.replace(/\D/g, '');
        const key = `${nameNorm}_${phoneNorm}`;
        if (seen.has(key)) {
          modified = true;
          if (supabase) {
            await supabase.from('pacientes').delete().eq('id', p.id);
          }
        } else {
          seen.add(key);
          deduplicated.push(p);
        }
      }

      // 2. Corrigir status e remover duplicados da planilha
      let toSave = deduplicated.filter((p, index, self) => {
        const nameNorm = p.nome.toLowerCase().trim();
        const userCad = p.usuario_cadastro || '';

        // Se veio de planilha e está como Novo Cliente, muda para Ativo
        if (userCad.includes('Planilha') && p.status === 'Novo Cliente') {
          p.status = 'Ativo';
          modified = true;
        }

        // Reverter desistentes originais que foram alterados ou duplicados
        if (desistentesNomes.some(n => n.toLowerCase() === nameNorm)) {
          if (userCad.includes('Planilha')) {
            // Se for duplicata da planilha, e o original existir, remove a duplicata
            const hasOriginal = self.some((x, idx) => idx !== index && x.nome.toLowerCase().trim() === nameNorm && !(x.usuario_cadastro || '').includes('Planilha'));
            if (hasOriginal) {
              modified = true;
              return false; // Remove duplicata da planilha
            } else {
              // Se não existir o original, garante que o status é Desistiu
              if (p.status !== 'Desistiu') {
                p.status = 'Desistiu';
                modified = true;
              }
            }
          } else {
            // Registro original: garante que o status é Desistiu
            if (p.status !== 'Desistiu') {
              p.status = 'Desistiu';
              modified = true;
            }
          }
        }
        return true;
      });

      // 3. Restaurar desistentes originais se estiverem faltando
      for (const d of desistentesOriginais) {
        const hasIt = toSave.some(p => p.nome.toLowerCase().trim() === d.nome.toLowerCase().trim());
        if (!hasIt) {
          modified = true;
          if (supabase) {
            const { data } = await supabase.from('pacientes').insert([d]).select().single();
            if (data) {
              toSave.push(data);
            }
          } else {
            const newP = {
              ...d,
              id: 'p_' + Math.random().toString(36).substring(2, 11)
            } as Paciente;
            toSave.push(newP);
          }
        }
      }

      if (modified) {
        if (supabase) {
          for (const p of allPatients) {
            const shouldDelete = !toSave.some(x => x.id === p.id);
            if (shouldDelete) {
              await supabase.from('pacientes').delete().eq('id', p.id);
            } else {
              const matchingSaved = toSave.find(x => x.id === p.id);
              if (matchingSaved && matchingSaved.status !== p.status) {
                await supabase.from('pacientes').update({ status: matchingSaved.status }).eq('id', p.id);
              }
            }
          }
        } else {
          localStorage.setItem('crm_alex_pacientes', JSON.stringify(toSave));
        }
      }
    } catch (err) {
      console.error("Erro na migração de correção dos pacientes:", err);
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const firstDayOfCurrentMonth = `${currentPrefix}-01`;
    
    const todayStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().split(' ')[0];

    const patients = await this.getPacientes();
    const toTransition = patients.filter(p => 
      p.status === 'Novo Cliente' && 
      p.data_cadastro < firstDayOfCurrentMonth &&
      !p.convenio.toLowerCase().includes('nutri') &&
      !p.convenio.toLowerCase().includes('medi')
    );

    if (toTransition.length === 0) return;

    for (const p of toTransition) {
      const updatedFields = {
        status: 'Ativo' as const,
        data_cadastro: p.data_cadastro, // Mantém a data de cadastro original intacta
        data_ultima_atualizacao: todayStr,
        hora_ultima_atualizacao: timeStr
      };

      if (supabase) {
        await supabase
          .from('pacientes')
          .update({
            status: updatedFields.status,
            data_ultima_atualizacao: updatedFields.data_ultima_atualizacao,
            hora_ultima_atualizacao: updatedFields.hora_ultima_atualizacao
          })
          .eq('id', p.id);
      } else {
        const allPatients = getLocal<Paciente[]>('pacientes', MOCK_PACIENTES);
        const idx = allPatients.findIndex(x => x.id === p.id);
        if (idx !== -1) {
          allPatients[idx] = { ...allPatients[idx], ...updatedFields };
          setLocal('pacientes', allPatients);
        }
      }

      await this.addLog(
        'Sistema', 
        'Transição Automática', 
        `Paciente ${p.nome} (Convênio: ${p.convenio}, Cadastrado em: ${p.data_cadastro}) foi movido automaticamente para "Ativo" devido à virada do mês.`
      );
    }
  }
};
