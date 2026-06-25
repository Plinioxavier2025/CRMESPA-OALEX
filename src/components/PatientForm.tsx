import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import type { Paciente } from '../services/db';
import { Save, X, Phone, User, Landmark, ShieldQuestion } from 'lucide-react';

interface PatientFormProps {
  patient?: Paciente;
  onCancel: () => void;
  onSubmit: () => void;
  activeUserName: string;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  onCancel,
  onSubmit,
  activeUserName
}) => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [convenio, setConvenio] = useState('');
  const [status, setStatus] = useState<'Novo Cliente' | 'Ativo' | 'Desistiu' | 'Inativo'>('Novo Cliente');
  const [motivoDesistencia, setMotivoDesistencia] = useState('');
  const [motivoCustomizado, setMotivoCustomizado] = useState('');
  const [conveniosList, setConveniosList] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isSubmitting = useRef(false);

  // Default dropout reasons
  const motivosList = [
    'Questão financeira',
    'Mudança de cidade',
    'Insatisfação',
    'Alta terapêutica',
    'Falta de tempo',
    'Outro'
  ];

  // Fetch dynamically dynamic convênios list
  useEffect(() => {
    const loadConfig = async () => {
      const list = await db.getConfig('convenios');
      if (list && Array.isArray(list)) {
        setConveniosList(list);
        if (!patient && list.length > 0) {
          setConvenio(list[0]);
        }
      }
    };
    loadConfig();
  }, [patient]);

  // Load existing patient info if editing
  useEffect(() => {
    if (patient) {
      setNome(patient.nome);
      setTelefone(patient.telefone);
      setConvenio(patient.convenio);
      setStatus(patient.status);
      
      if (patient.status === 'Desistiu' && patient.motivo_desistencia) {
        const matchingMotivo = motivosList.find(m => patient.motivo_desistencia?.startsWith(m));
        if (matchingMotivo) {
          setMotivoDesistencia(matchingMotivo);
          if (matchingMotivo === 'Outro') {
            setMotivoCustomizado(patient.motivo_desistencia.replace('Outro: ', ''));
          }
        } else {
          setMotivoDesistencia('Outro');
          setMotivoCustomizado(patient.motivo_desistencia);
        }
      }
    }
  }, [patient]);

  // Simple auto-formatting regex for Brazilian telephone numbers
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digits = rawVal.replace(/\D/g, '');
    let formatted = '';
    
    if (digits.length > 0) {
      if (digits.length <= 2) {
        formatted = `(${digits}`;
      } else if (digits.length <= 6) {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      } else if (digits.length <= 10) {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      } else {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
    }
    
    setTelefone(formatted);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setError('');

    if (!nome.trim()) {
      setError('O nome completo é obrigatório.');
      isSubmitting.current = false;
      return;
    }
    
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('O número de telefone deve possuir DDD e pelo menos 8 dígitos.');
      isSubmitting.current = false;
      return;
    }

    setSaving(true);
    try {
      // Build reason string
      let motivoFinal = '';
      if (status === 'Desistiu') {
        if (motivoDesistencia === 'Outro') {
          motivoFinal = motivoCustomizado.trim() ? `Outro: ${motivoCustomizado.trim()}` : 'Outro';
        } else {
          motivoFinal = motivoDesistencia;
        }
        
        if (!motivoFinal) {
          setError('Selecione ou preencha o motivo da desistência.');
          setSaving(false);
          isSubmitting.current = false;
          return;
        }
      }

      const payload = {
        ...(patient?.id ? { id: patient.id } : {}),
        nome: nome.trim(),
        telefone,
        convenio,
        status,
        motivo_desistencia: status === 'Desistiu' ? motivoFinal : undefined,
        usuario_cadastro: patient?.usuario_cadastro || activeUserName
      };

      await db.savePaciente(payload);
      
      // Register audit activity log
      const acao = patient?.id ? 'Paciente atualizado' : 'Paciente cadastrado';
      const detalhes = patient?.id
        ? `Atualizado registro de ${nome.trim()} (Status: ${status}).`
        : `Cadastrado novo paciente ${nome.trim()} no convênio ${convenio}.`;
      await db.addLog(activeUserName, acao, detalhes);

      onSubmit();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar os dados do paciente.');
    } finally {
      setSaving(false);
      isSubmitting.current = false;
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-brand-blue-dark font-outfit">
            {patient?.id ? 'Editar Cadastro de Paciente' : 'Cadastrar Novo Paciente'}
          </h2>
          <p className="text-xs text-slate-400 font-light mt-1">
            Preencha as informações para registro no prontuário da clínica.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nome Completo */}
        <div className="space-y-1.5">
          <label htmlFor="patient-name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Nome Completo</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              id="patient-name"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome completo do paciente"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 text-sm outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Telefone */}
        <div className="space-y-1.5">
          <label htmlFor="patient-phone" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Telefone</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Phone className="w-4 h-4" />
            </span>
            <input
              id="patient-phone"
              type="text"
              required
              value={telefone}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 text-sm outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Convênio / Sessão */}
        <div className="space-y-1.5">
          <label htmlFor="patient-convenio" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Convênio / Sessão</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Landmark className="w-4 h-4" />
            </span>
            <select
              id="patient-convenio"
              value={convenio}
              onChange={(e) => setConvenio(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 text-sm outline-none bg-white transition-all appearance-none"
            >
              {conveniosList.map((item, idx) => (
                <option key={idx} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label htmlFor="patient-status" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Status do Paciente</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <ShieldQuestion className="w-4 h-4" />
            </span>
            <select
              id="patient-status"
              value={status}
              onChange={(e) => {
                const newStatus = e.target.value as any;
                setStatus(newStatus);
                if (newStatus === 'Desistiu' && !motivoDesistencia) {
                  setMotivoDesistencia(motivosList[0]);
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 text-sm outline-none bg-white transition-all appearance-none"
            >
               <option value="Novo Cliente">Novo Cliente</option>
              <option value="Ativo">Ativo</option>
              <option value="Desistiu">Desistiu</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conditionally reveal Motivo da Desistência fields */}
      {status === 'Desistiu' && (
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/60 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="patient-dropout-reason" className="text-xs font-bold text-amber-800 uppercase tracking-wide block">Motivo da Desistência</label>
              <select
                id="patient-dropout-reason"
                value={motivoDesistencia}
                onChange={(e) => setMotivoDesistencia(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm outline-none bg-white transition-all appearance-none"
              >
                {motivosList.map((motivo, idx) => (
                  <option key={idx} value={motivo}>{motivo}</option>
                ))}
              </select>
            </div>

            {motivoDesistencia === 'Outro' && (
              <div className="space-y-1.5">
                <label htmlFor="patient-dropout-desc" className="text-xs font-bold text-amber-800 uppercase tracking-wide block">Descrição Livre</label>
                <input
                  id="patient-dropout-desc"
                  type="text"
                  required
                  value={motivoCustomizado}
                  onChange={(e) => setMotivoCustomizado(e.target.value)}
                  placeholder="Especifique o motivo da desistência"
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm outline-none transition-all placeholder:text-slate-400 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-blue-dark hover:bg-brand-blue-primary rounded-xl transition-all shadow-md shadow-slate-900/10 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4.5 h-4.5" />
          <span>{saving ? 'Salvando...' : 'Salvar Paciente'}</span>
        </button>
      </div>
    </form>
  );
};
