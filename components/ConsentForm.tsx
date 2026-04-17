import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../services/supabase';
import { 
  X, Check, AlertTriangle, Sparkles,
  ClipboardCheck, Palette, Eye, Trash2, Loader2, Plus
} from 'lucide-react';
import { Customer, Appointment, Service, Provider, ConsentForm as IConsentForm } from '../types';

interface ConsentFormProps {
  customer: Customer;
  appointments: Appointment[];
  services: Service[];
  providers: Provider[];
  onClose: () => void;
  onSaved: (newTerm: IConsentForm) => void;
}

export const ConsentForm: React.FC<ConsentFormProps> = ({ 
  customer, 
  appointments, 
  services, 
  providers, 
  onClose,
  onSaved 
}) => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'error' | 'info' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const sigPad = useRef<SignatureCanvas>(null);
  
  // Selection state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Form state
  const [step, setStep] = useState<'SELECTION' | 'FORM'>('SELECTION');
  const [anamnese, setAnamnese] = useState({
    allergies: false,
    eyeSensitivity: false,
    contactLenses: false,
    nailSkinHealth: false,
    healthConditions: false,
    observations: ''
  });
  const [allowImageUse, setAllowImageUse] = useState(false);
  const [procedures, setProcedures] = useState('');
  const [professionals, setProfessionals] = useState('');

  // Find recent appointments for this customer
  const customerAppts = appointments
    .filter(a => a.customerId === customer.id)
    .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime())
    .slice(0, 5);

  const startForm = (appt: Appointment | null) => {
    setSelectedAppointment(appt);
    if (appt) {
      // Aggregate procedures
      let list = appt.combinedServiceNames || '';
      if (!list) {
        const main = services.find(s => s.id === appt.serviceId)?.name || 'Serviço';
        const extras = (appt.additionalServices || []).map(as => services.find(s => s.id === as.serviceId)?.name).filter(Boolean).join(' + ');
        list = extras ? `${main} + ${extras}` : main;
      }
      setProcedures(list);
      setProfessionals('PROFISSIONAIS SALÃO PARCEIRO (LEI 13.352/2016)');
    } else {
      setProcedures('TODOS OS PROCEDIMENTOS ESTÉTICOS');
      setProfessionals('PROFISSIONAIS SALÃO PARCEIRO (LEI 13.352/2016)');
    }
    setStep('FORM');
  };

  // Resize handler to fix iPad offset
  useEffect(() => {
    if (step === 'FORM') {
      const resizeCanvas = () => {
        if (sigPad.current) {
          const canvas = sigPad.current.getCanvas();
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          const { width, height } = canvas.getBoundingClientRect();
          canvas.width = width * ratio;
          canvas.height = height * ratio;
          canvas.getContext('2d')?.scale(ratio, ratio);
          sigPad.current.clear(); // Recalibrar exige limpar para manter precisão
        }
      };

      // Delay to ensure modal animation is finished
      const timer = setTimeout(resizeCanvas, 350);
      window.addEventListener('resize', resizeCanvas);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [step]);

  const clearSignature = () => sigPad.current?.clear();

  const handleFinish = async () => {
    if (sigPad.current?.isEmpty()) {
      showToast("Por favor, a assinatura é obrigatória.");
      return;
    }

    setLoading(true);
    try {
      const canvas = sigPad.current?.getTrimmedCanvas();
      const signatureData = canvas?.toDataURL('image/png') || '';
      
      const payload = {
        customer_id: customer.id,
        appointment_id: selectedAppointment?.id || null,
        date_time: new Date().toISOString(),
        procedures,
        professionals,
        anamnese_data: anamnese,
        has_allergies: anamnese.allergies,
        has_eye_sensitivity: anamnese.eyeSensitivity,
        has_contact_lenses: anamnese.contactLenses,
        has_nail_issues: anamnese.nailSkinHealth,
        has_health_conditions: anamnese.healthConditions,
        allow_image_use: allowImageUse,
        signature_data: signatureData
      };

      const { data, error } = await supabase
        .from('customer_consent_forms')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Sincronização automática com Alertas de Saúde da Cliente
      const alerts = [];
      if (anamnese.allergies) alerts.push("ALERGIAS");
      if (anamnese.eyeSensitivity) alerts.push("SENSIBILIDADE OCULAR");
      if (anamnese.contactLenses) alerts.push("USO DE LENTES");
      if (anamnese.nailSkinHealth) alerts.push("MICOSE/FUNGO/FERIMENTO");
      if (anamnese.healthConditions) alerts.push("RESTRIÇÕES/CONDIÇÕES DE SAÚDE");
      if (anamnese.observations) alerts.push(`OBS: ${anamnese.observations}`);

      if (alerts.length > 0) {
        const restrictionsText = alerts.join(' | ');
        
        // Buscar preferências atuais para não apagar outros campos (como serviços favoritos)
        const { data: currentCustomer } = await supabase
          .from('customers')
          .select('preferences')
          .eq('id', customer.id)
          .single();
        
        const newPrefs = {
          ...(currentCustomer?.preferences || {}),
          restrictions: restrictionsText
        };

        await supabase
          .from('customers')
          .update({ preferences: newPrefs })
          .eq('id', customer.id);
      }

      const newTerm: IConsentForm = {
        id: data.id,
        customerId: data.customer_id,
        appointmentId: data.appointment_id,
        dateTime: data.date_time,
        procedures: data.procedures,
        professionals: data.professionals,
        anamneseData: data.anamnese_data,
        allowImageUse: data.allow_image_use,
        signatureData: data.signature_data,
        createdAt: data.created_at
      };

      onSaved(newTerm);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar termo:", error);
      showToast("Erro ao salvar o termo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const renderToast = () => toast && (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 duration-300">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
        toast.type === 'error' 
          ? 'bg-rose-50/90 border-rose-200 text-rose-900' 
          : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
      }`}>
        <div className={`p-1.5 rounded-lg ${toast.type === 'error' ? 'bg-rose-200' : 'bg-emerald-200'}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
        </div>
        <p className="text-xs font-black uppercase tracking-tight">{toast.message}</p>
      </div>
    </div>
  );

  if (step === 'SELECTION') {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        {renderToast()}
        <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-6 md:p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ClipboardCheck size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Iniciar Novo Termo</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-widest text-[10px]">Escolha o atendimento para preencher os dados</p>
            </div>

            <div className="w-full space-y-3">
              {customerAppts.map(appt => (
                <button
                  key={appt.id}
                  onClick={() => startForm(appt)}
                  className="w-full p-4 bg-slate-50 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-slate-100 dark:border-zinc-700 rounded-2xl transition-all text-left flex justify-between items-center group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{appt.combinedServiceNames || 'Serviços'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {new Date(appt.date + 'T' + appt.time).toLocaleDateString()} às {appt.time}
                    </p>
                  </div>
                  <Plus size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </button>
              ))}
              <button
                onClick={() => startForm(null)}
                className="w-full p-4 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all text-xs font-black uppercase tracking-widest"
              >
                Continuar sem vincular atendimento
              </button>
            </div>

            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-black uppercase transition-colors pt-2">Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center p-0 md:p-8 animate-in fade-in duration-200 overflow-y-auto">
      {renderToast()}
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl min-h-screen md:min-h-0 rounded-none md:rounded-[3rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 overflow-hidden my-auto">

        {/* Header */}
        <div className="p-5 md:p-10 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Aminna" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
            <div className="h-12 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden md:block" />
            <div>
              <h2 className="text-xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tight leading-tight">Ficha de Avaliação</h2>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-indigo-400 font-black uppercase tracking-[0.3em] mt-1">Consentimento & Saúde</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-500 rounded-2xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all active:scale-95 shadow-sm"><X size={24} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-6 md:space-y-8 no-scrollbar scroll-smooth">
          
          {/* Declaration Section */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 p-6 md:p-8 rounded-[2rem] border-2 border-slate-200 dark:border-zinc-800">
            <p className="text-xs md:text-sm font-medium text-slate-900 dark:text-slate-300 leading-relaxed italic">
              "Eu, <span className="font-black text-black dark:text-white uppercase not-italic">{customer.name}</span>, declaro que as informações prestadas abaixo são verdadeiras e estou ciente das orientações, cuidados e responsabilidades referentes ao(s) procedimento(s) realizado(s)."
            </p>
          </div>

          {/* DADOS DO ATENDIMENTO */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-2">
              <Sparkles size={16} className="text-indigo-600" /> DADOS DO ATENDIMENTO
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800">
               <div className="space-y-1">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Procedimentos Realizados</span>
                 <p className="font-bold text-slate-900 dark:text-white uppercase py-1 leading-tight text-sm">
                   {procedures || 'TODOS OS PROCEDIMENTOS ESTÉTICOS'}
                 </p>
               </div>
               <div className="space-y-1">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Profissionais Responsáveis</span>
                 <p className="font-bold text-black dark:text-indigo-400 uppercase py-1 leading-tight text-sm">
                   {professionals || 'PROFISSIONAIS SALÃO PARCEIRO (LEI 13.352/2016)'}
                 </p>
               </div>
               <div className="space-y-1">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data e Hora do Registro</span>
                 <p className="font-bold text-slate-900 dark:text-white uppercase py-1 text-sm">{new Date().toLocaleString()}</p>
               </div>
            </div>
          </div>

          {/* I. AVALIAÇÃO DE SAÚDE (ANAMNESE) */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-2">
              <ClipboardCheck size={16} className="text-rose-600" /> I. AVALIAÇÃO DE SAÚDE (ANAMNESE)
            </h4>
            
            <div className="space-y-4">
              {[
                { label: 'Alergias', question: 'Possui alergia a esmaltes, colas, solventes ou produtos?', key: 'allergies' as const },
                { label: 'Saúde Ocular', question: 'Possui sensibilidade ocular, olho seco ou irritação frequente?', key: 'eyeSensitivity' as const },
                { label: 'Lente de Contato', question: 'Está fazendo uso de lentes de contato neste momento?', key: 'contactLenses' as const },
                { label: 'Unhas & Pele', question: 'Possui micose, fungos ou algum ferimento nas mãos ou pés?', key: 'nailSkinHealth' as const },
                { label: 'Geral', question: 'Gestante, diabética ou em tratamento médico que interfira?', key: 'healthConditions' as const },
              ].map(item => (
                <div key={item.key} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white dark:bg-zinc-800 rounded-3xl border border-slate-100 dark:border-zinc-700 hover:border-indigo-200 transition-all shadow-sm gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-950 dark:text-white uppercase">{item.label}</p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase mt-1">{item.question}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnamnese(prev => ({ ...prev, [item.key]: true }))}
                      className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${anamnese[item.key] ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-zinc-700 text-slate-400'}`}
                    >
                      SIM
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnamnese(prev => ({ ...prev, [item.key]: false }))}
                      className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!anamnese[item.key] ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-700 text-slate-400'}`}
                    >
                      NÃO
                    </button>
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações / Informações Complementares</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none uppercase placeholder:text-slate-300"
                  placeholder="DIGITE AQUI SE HOUVER ALGUMA OBSERVAÇÃO IMPORTANTE..."
                  value={anamnese.observations}
                  onChange={e => setAnamnese(prev => ({ ...prev, observations: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* II. TERMO DE RESPONSABILIDADE */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-2">
              <AlertTriangle size={16} className="text-amber-600" /> II. TERMO DE RESPONSABILIDADE E CIÊNCIA
            </h4>
            
            <div className="space-y-4 bg-slate-50 dark:bg-zinc-800/10 p-6 md:p-10 rounded-[2.5rem] border-2 border-slate-200 dark:border-zinc-800 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-200 leading-relaxed">
              <p>1. <span className="font-black text-black dark:text-white">Procedimento:</span> Declaro estar ciente de que procedimentos como banho de gel, alongamento e extensão de cílios exigem manutenção periódica para preservar a saúde das unhas e fios naturais.</p>
              <p>2. <span className="font-black text-black dark:text-white">Cuidados:</span> Comprometo-me a seguir todas as orientações, evitando remover o material de forma inadequada e seguindo as recomendações de pós-procedimento.</p>
              <p>3. <span className="font-black text-black dark:text-white">Riscos:</span> Estou ciente de que podem ocorrer reações alérgicas ou sensibilidades individuais, mesmo com técnicas e materiais adequados.</p>
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-zinc-800/20 rounded-[1.75rem] border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg text-slate-500 dark:text-indigo-400"><Eye size={18} /></div>
                <p className="text-xs md:text-sm font-black text-black dark:text-zinc-200 uppercase">Autorizo o uso de imagem para portfólio e marketing</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowImageUse(!allowImageUse)}
                className={`w-14 h-8 rounded-full transition-all relative ${allowImageUse ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${allowImageUse ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* III. ASSINATURA */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-end border-b border-slate-50 dark:border-zinc-800 pb-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Palette size={16} className="text-indigo-600" /> III. ASSINATURA DIGITAL NO TABLET
              </h4>
              <button type="button" onClick={clearSignature} className="text-[10px] font-black text-rose-600 uppercase flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"><Trash2 size={12} /> Limpar</button>
            </div>
            
            <div className="border-2 border-slate-200 dark:border-zinc-700 bg-white rounded-3xl overflow-hidden h-64 md:h-80 shadow-inner relative">
              <SignatureCanvas 
                ref={sigPad}
                penColor="black"
                velocityFilterWeight={0.1}
                minDistance={0}
                throttle={8}
                canvasProps={{ 
                  className: 'w-full h-full',
                  style: { touchAction: 'none' }
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase text-center tracking-widest">Assine dentro da área acima utilizando o dedo ou caneta stylus</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4">
          <p className="flex-1 text-[10px] text-slate-500 font-bold uppercase leading-relaxed text-center md:text-left">
            Ao clicar em finalizar, você confirma que leu e concorda com todos os termos e que os dados informados são verdadeiros.
          </p>
          <div className="flex gap-3">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 md:flex-none px-8 py-4 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
               disabled={loading}
             >
               Cancelar
             </button>
             <button
               type="button"
               onClick={handleFinish}
               disabled={loading}
               className="flex-1 md:flex-none px-12 py-4 bg-slate-950 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
               {loading ? 'SALVANDO...' : 'FINALIZAR ASSINATURA'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
