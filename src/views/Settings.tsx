import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Settings as SettingsIcon, Landmark, Trash2, Plus, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC<{ activeUserName: string }> = ({ activeUserName }) => {
  const [convenios, setConvenios] = useState<string[]>([]);
  const [newConvenio, setNewConvenio] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const list = await db.getConfig('convenios');
      if (list && Array.isArray(list)) {
        setConvenios(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleAddConvenio = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    const term = newConvenio.trim();
    if (!term) return;

    if (convenios.some(c => c.toLowerCase() === term.toLowerCase())) {
      setFeedback('Este convênio já está cadastrado.');
      return;
    }

    const updated = [...convenios, term];
    try {
      await db.setConfig('convenios', updated);
      await db.addLog(activeUserName, 'Configuração alterada', `Adicionado novo convênio: ${term}.`);
      setConvenios(updated);
      setNewConvenio('');
      setFeedback(`Convênio "${term}" adicionado com sucesso!`);
      setTimeout(() => setFeedback(''), 3000);
    } catch (e) {
      console.error(e);
      setFeedback('Erro ao salvar as configurações.');
    }
  };

  const handleDeleteConvenio = async (itemToDelete: string) => {
    setFeedback('');
    if (convenios.length <= 1) {
      setFeedback('A clínica deve possuir pelo menos 1 convênio/modalidade cadastrado.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o convênio "${itemToDelete}"? Os pacientes vinculados a ele continuarão listados, mas ele não aparecerá em novos cadastros.`)) {
      return;
    }

    const updated = convenios.filter(c => c !== itemToDelete);
    try {
      await db.setConfig('convenios', updated);
      await db.addLog(activeUserName, 'Configuração alterada', `Excluído convênio: ${itemToDelete}.`);
      setConvenios(updated);
      setFeedback(`Convênio "${itemToDelete}" removido com sucesso.`);
      setTimeout(() => setFeedback(''), 3000);
    } catch (e) {
      console.error(e);
      setFeedback('Erro ao salvar as configurações.');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up text-xs">
      
      {/* Intro Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
        <div className="p-3.5 bg-brand-blue-light text-brand-blue-primary rounded-2xl">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-blue-dark font-outfit font-black">Configurações do Sistema</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
            Gerencie os parâmetros globais da clínica, incluindo a tabela de convênios/modalidades aceitos para sessões e consultas de pacientes.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Convênios Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Manage list card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Convênios & Modalidades</h3>
            <p className="text-[10px] text-slate-400 font-light mt-0.5">Veja e gerencie a lista atual de opções para prontuários.</p>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="w-6 h-6 border-2 border-brand-blue-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1 scrollbar">
              {convenios.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Landmark className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold">{item}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteConvenio(item)}
                    className="p-1.5 rounded-lg border border-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                    title="Excluir convênio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-start space-y-4">
          <div>
            <h3 className="font-bold text-base text-brand-blue-dark font-outfit">Adicionar Novo Convênio</h3>
            <p className="text-[10px] text-slate-400 font-light mt-0.5">Insira uma nova operadora de plano de saúde ou modalidade.</p>
          </div>

          <form onSubmit={handleAddConvenio} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="new-insurance-name" className="font-bold text-slate-400 block uppercase tracking-wider">Nome do Convênio</label>
              <input
                id="new-insurance-name"
                type="text"
                required
                placeholder="Ex: Bradesco Saúde, Cassi, etc."
                value={newConvenio}
                onChange={(e) => setNewConvenio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-blue-primary focus:ring-1 focus:ring-brand-blue-primary/20 outline-none transition-all placeholder:text-slate-400 bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 bg-brand-blue-dark hover:bg-brand-blue-primary text-white font-bold rounded-xl transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Adicionar à Lista</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
