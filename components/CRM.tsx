
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
    MessageSquare, Search, Send, Image as ImageIcon, Paperclip, MoreVertical, 
    Check, CheckCheck, User, Phone, Mail, Clock, Calendar, Hash, Tag, 
    Filter, Layout, BarChart, Settings as SettingsIcon, Plus, Star, MapPin, 
    ChevronRight, ChevronLeft, Shield, Zap, Target, PieChart, 
    Lightbulb, Rocket, Bot, Terminal, Activity, 
    Eye, Trash2, Edit3, Save, X, Ban, ThumbsUp, TrendingUp,
    MoreHorizontal, ArrowRight, CornerDownRight, Smile, Mic,
    Briefcase, UserPlus, Layers, Info, Key, Monitor, RefreshCw
} from 'lucide-react';
import { 
    Customer, Lead, Provider, Appointment, Service,
    CRMConversation, CRMMessage, CRMFunnelStage, CRMTag, CRMAutomation
} from '../types';

interface CRMProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    providers: Provider[];
    appointments: Appointment[];
    services: Service[];
}

const WhatsAppIcon = ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.031 6.172c-2.32 0-4.591.956-6.41 2.691-1.817 1.735-2.83 4.034-2.855 6.473 0 2.441.979 4.756 2.758 6.517l.07.07-1.127 4.104 4.238-1.111.069.041c1.579.932 3.39 1.423 5.22 1.423 2.32 0 4.591-.956 6.41-2.692s2.83-4.034 2.855-6.471c.026-2.441-.979-4.756-2.758-6.517s-4.067-2.73-6.47-2.73zm1.144 11.902c-.145-.145-.333-.223-.538-.223-.205 0-.427.078-.572.223l-.903.903-1.423-.496c-.636-.222-.224-2.261-.224-2.261l.903-.903c.145-.145.223-.333.223-.538 0-.205-.078-.427-.223-.572l-1.805-1.805c-.145-.145-.333-.223-.538-.223-.205 0-.427.078-.572.223l-.532.532c-.378.378-.544.893-.454 1.411.089.518.397 1.05.908 1.56.511.511 1.583.924 2.1 1.013.518.089 1.033-.076 1.411-.454l.532-.532c.145-.145.223-.333.223-.538s-.078-.427-.223-.572l-1.805-1.805z" />
    </svg>
);

export const CRM: React.FC<CRMProps> = ({ 
    customers, setCustomers, leads, setLeads, providers, appointments, services 
}) => {
    const [view, setView] = useState<'CHATS' | 'FUNNEL' | 'AUTOMATIONS' | 'REPORTS' | 'SETTINGS'>('CHATS');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const [conversations, setConversations] = useState<CRMConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<CRMMessage[]>([]);
    const [funnelStages, setFunnelStages] = useState<CRMFunnelStage[]>([]);
    const [tags, setTags] = useState<CRMTag[]>([]);
    const [crmConfig, setCrmConfig] = useState<any>(null);

    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const mapConv = (c: any): CRMConversation => ({
        id: c.id,
        customerId: c.customer_id,
        leadId: c.lead_id,
        metaConversationId: c.meta_conversation_id,
        platform: c.platform,
        statusId: c.status_id,
        currentAttendantId: c.current_attendant_id,
        lastMessagePreview: c.last_message_preview,
        lastMessageAt: c.last_message_at,
        unreadCount: c.unread_count,
        metadata: c.metadata,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        customer: c.customer,
        status: c.status
    });

    const mapMsg = (m: any): CRMMessage => ({
        id: m.id,
        conversationId: m.conversation_id,
        metaMessageId: m.meta_message_id,
        senderType: m.sender_type,
        senderId: m.sender_id,
        content: m.content,
        messageType: m.message_type,
        mediaUrl: m.media_url,
        status: m.status,
        metadata: m.metadata,
        createdAt: m.created_at
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
                { data: convData },
                { data: stageData },
                { data: tagData },
                { data: configData }
            ] = await Promise.all([
                supabase.from('crm_conversations').select('*, customer:customers(*), status:crm_funnel_stages(*)').order('last_message_at', { ascending: false }),
                supabase.from('crm_funnel_stages').select('*').order('order', { ascending: true }),
                supabase.from('crm_tags').select('*'),
                supabase.from('crm_config').select('*').maybeSingle()
            ]);

            if (convData) setConversations(convData.map(mapConv));
            if (stageData) setFunnelStages(stageData);
            if (tagData) setTags(tagData);
            if (configData) setCrmConfig(configData);

        } catch (error) {
            console.error('Error fetching CRM data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('crm_messages')
                .select('*')
                .eq('conversation_id', activeConversationId)
                .order('created_at', { ascending: true });
            
            if (data) setMessages(data.map(mapMsg));
        };

        fetchMessages();

        const channel = supabase.channel(`messages-${activeConversationId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'crm_messages',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload) => {
                setMessages(prev => [...prev, mapMsg(payload.new)]);
                setTimeout(scrollToBottom, 100);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeConversationId]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeConversationId) return;

        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (!activeConv) return;

        const msgContent = newMessage;
        setNewMessage('');

        try {
            // Call the proxy function
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    to: activeConv.customer?.phone,
                    message: msgContent,
                    conversation_id: activeConversationId
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // Message will be inserted by the function and received via Realtime
            fetchData(); // Refresh to update preview

        } catch (error: any) {
            console.error('Error sending message:', error);
            alert(`Erro ao enviar: ${error.message}`);
        }
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            const name = c.customer?.name || c.lead?.name || 'Cliente';
            return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   c.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [conversations, searchQuery]);

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const updates = {
            meta_access_token: formData.get('meta_access_token'),
            meta_phone_number_id: formData.get('meta_phone_number_id'),
            meta_waba_id: formData.get('meta_waba_id'),
            meta_verify_token: formData.get('meta_verify_token'),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('crm_config').upsert({ id: crmConfig?.id, ...updates });
        if (error) alert('Erro ao salvar: ' + error.message);
        else {
            alert('Configuração salva!');
            fetchData();
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans">
            
            {/* === LEFT RAIL === */}
            <div className="w-16 md:w-20 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col items-center py-6 gap-8 z-20">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg mb-4">
                    <Rocket className="text-white w-6 h-6" />
                </div>
                
                <nav className="flex flex-col gap-4">
                    {[
                        { id: 'CHATS', icon: MessageSquare, label: 'Mensagens' },
                        { id: 'FUNNEL', icon: Layers, label: 'Funil' },
                        { id: 'REPORTS', icon: BarChart, label: 'Métricas' },
                        { id: 'AUTOMATIONS', icon: Bot, label: 'IA Tools' },
                        { id: 'SETTINGS', icon: SettingsIcon, label: 'Config' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id as any)}
                            className={`p-3.5 rounded-2xl transition-all relative group ${
                                view === item.id 
                                ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-white' 
                                : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <item.icon size={22} strokeWidth={2.5} />
                            {view === item.id && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-l-full" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* === CHATS VIEW === */}
            {view === 'CHATS' && (
                <div className="flex-1 flex overflow-hidden">
                    <div className={`w-80 md:w-96 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col z-10 transition-all ${!isSidebarOpen && 'hidden md:flex'}`}>
                        <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Conversas</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl text-sm"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                            {filteredConversations.map(conv => {
                                const isSelected = activeConversationId === conv.id;
                                const stage = funnelStages.find(s => s.id === conv.statusId);

                                return (
                                    <div 
                                        key={conv.id}
                                        onClick={() => setActiveConversationId(conv.id)}
                                        className={`mx-3 mb-1 p-4 rounded-[20px] cursor-pointer transition-all flex gap-4 ${
                                            isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-14 h-14 rounded-2xl bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xl font-bold ${isSelected ? 'text-indigo-600 bg-white' : 'text-slate-500'}`}>
                                                {(conv.customer?.name || 'C')[0]}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white dark:bg-zinc-900 p-1 shadow-sm flex items-center justify-center">
                                                {conv.platform === 'whatsapp' ? <WhatsAppIcon size={14} className="text-emerald-500" /> : <MessageSquare size={14} className="text-blue-500" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold truncate text-base">{conv.customer?.name || 'Cliente'}</h4>
                                                <span className="text-[10px] opacity-60">{new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-xs truncate mb-2">{conv.lastMessagePreview || 'Inicie a conversa...'}</p>
                                            <div className="flex items-center gap-2">
                                                {stage && (
                                                    <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider" style={{ backgroundColor: stage.color + '20', color: isSelected ? 'white' : stage.color }}>
                                                        {stage.name}
                                                    </span>
                                                )}
                                                {conv.unreadCount > 0 && !isSelected && <span className="ml-auto bg-indigo-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold">{conv.unreadCount}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-zinc-950 relative overflow-hidden">
                        {activeConversation ? (
                            <>
                                <div className="h-20 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-6 z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-zinc-800 flex items-center justify-center font-bold text-indigo-600 dark:text-white">
                                            {(activeConversation.customer?.name || 'C')[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{activeConversation.customer?.name || 'Cliente'}</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">WhatsApp Oficial • Ativo</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsDetailsOpen(!isDetailsOpen)} className={`p-2.5 rounded-xl transition-all ${isDetailsOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-white hover:bg-slate-200'}`}>
                                        <Info size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide z-0">
                                    {messages.map((msg) => {
                                        const isCustomer = msg.senderType === 'customer';
                                        return (
                                            <div key={msg.id} className={`flex w-full ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-[70%] p-4 shadow-sm ${isCustomer ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white rounded-2xl rounded-tl-none' : 'bg-indigo-600 text-white rounded-2xl rounded-tr-none'}`}>
                                                    <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                                                    <div className={`flex items-center gap-1.5 mt-2 justify-end ${isCustomer ? 'text-slate-400' : 'text-indigo-200'}`}>
                                                        <span className="text-[9px] font-bold">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {!isCustomer && (msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className="p-6 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 z-10">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-100 dark:bg-zinc-800 p-2 rounded-[24px]">
                                        <input 
                                            type="text" 
                                            placeholder="Digite sua mensagem..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-900 dark:text-white py-3 pl-4"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                                <div className="w-32 h-32 bg-indigo-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-8">
                                    <MessageSquare size={56} className="text-indigo-600" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4 uppercase tracking-tighter">Central de Relacionamento</h2>
                                <p className="text-slate-500 dark:text-zinc-500 max-w-sm">Selecione uma conversa para iniciar o atendimento.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === FUNNEL VIEW === */}
            {view === 'FUNNEL' && (
                <div className="flex-1 p-10 flex flex-col items-center justify-center text-center overflow-y-auto">
                    <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center mb-6">
                        <Layers size={40} className="text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Funil de Vendas Inteligente</h2>
                    <p className="text-slate-500 dark:text-zinc-500 max-w-sm mb-12">Gerencie leads e oportunidades de forma visual. Sincronização em andamento.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="aspect-[3/4] bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-zinc-800 flex flex-col p-6 animate-pulse">
                                <div className="h-4 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full mb-6" />
                                <div className="space-y-4">
                                    {[1, 2].map(j => (
                                        <div key={j} className="h-24 bg-slate-50 dark:bg-zinc-800/50 rounded-3xl p-4 flex flex-col gap-2">
                                            <div className="h-2 w-16 bg-slate-200 dark:bg-zinc-700 rounded-full" />
                                            <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === REPORTS VIEW === */}
            {view === 'REPORTS' && (
                <div className="flex-1 p-10 flex flex-col items-center justify-center text-center overflow-y-auto">
                    <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mb-6 text-emerald-600">
                        <BarChart size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Métricas de Atendimento</h2>
                    <p className="text-slate-500 dark:text-zinc-500 max-w-sm">Acompanhe taxas de resposta, horários de pico e conversão de WhatsApp.</p>
                    <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-2xl">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-40 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-zinc-800 p-8 flex flex-col justify-end gap-3 relative transform hover:scale-105 transition-all">
                                <div className="absolute top-0 right-0 w-full h-1.5 bg-emerald-500 opacity-20" />
                                <div className="h-2 w-16 bg-slate-200 dark:bg-zinc-700 rounded-full" />
                                <div className="h-8 w-32 bg-slate-100 dark:bg-zinc-800 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === AUTOMATIONS VIEW === */}
            {view === 'AUTOMATIONS' && (
                <div className="flex-1 p-10 flex flex-col items-center justify-center text-center overflow-y-auto">
                    <div className="w-24 h-24 bg-purple-50 dark:bg-purple-900/20 rounded-3xl flex items-center justify-center mb-6 text-purple-600">
                        <Bot size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Chatbot & IA Tools</h2>
                    <p className="text-slate-500 dark:text-zinc-500 max-w-md">Configure respostas automáticas e assistente virtual inteligente.</p>
                    <div className="mt-12 bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-slate-200 dark:border-zinc-800 max-w-md w-full shadow-2xl shadow-indigo-100 dark:shadow-none">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status do Módulo</span>
                        </div>
                        <div className="p-4 bg-indigo-600 rounded-2xl text-white font-bold flex items-center justify-center gap-3">
                            <Zap size={20} className="fill-white" />
                            <span>Em Fase Experimental</span>
                        </div>
                    </div>
                </div>
            )}

            {/* === SETTINGS VIEW === */}
            {view === 'SETTINGS' && (
                <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto scrollbar-hide">
                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configurações CRM</h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Integração Meta & WhatsApp Business</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                                    <Key size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">Credenciais da API</h3>
                            </div>

                            <form onSubmit={handleSaveConfig} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Access Token (Facebook Developer)</label>
                                    <textarea 
                                        name="meta_access_token"
                                        defaultValue={crmConfig?.meta_access_token || ''}
                                        className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-sm font-mono text-xs"
                                        rows={4}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number ID</label>
                                        <input 
                                            name="meta_phone_number_id"
                                            defaultValue={crmConfig?.meta_phone_number_id || ''}
                                            className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WABA ID</label>
                                        <input 
                                            name="meta_waba_id"
                                            defaultValue={crmConfig?.meta_waba_id || ''}
                                            className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Verify Token (Webhook)</label>
                                    <input 
                                        name="meta_verify_token"
                                        defaultValue={crmConfig?.meta_verify_token || 'aminna_crm_token'}
                                        className="w-full p-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-sm font-mono"
                                    />
                                </div>

                                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                    Salvar Alterações
                                </button>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                                    <Monitor size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">Status da Conexão</h3>
                            </div>

                            <div className="flex-1 space-y-8">
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-zinc-800 border-2 border-dashed border-slate-200 dark:border-zinc-700 flex flex-col items-center text-center">
                                    <div className={`p-4 rounded-full mb-4 ${crmConfig?.meta_access_token ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Activity size={32} />
                                    </div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 uppercase text-xs">Webhook URL</h4>
                                    <p className="text-[10px] font-mono select-all bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-zinc-800 text-slate-500 break-all">
                                        https://eedazqhgvvelcjurigla.supabase.co/functions/v1/meta-webhook
                                    </p>
                                    <p className="text-[9px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Utilize esta URL no portal Facebook for Developers</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta API Sync</span>
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg">Online</span>
                                    </div>
                                    <button className="w-full p-4 border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all">
                                        <SyncIcon className="animate-spin-slow" /> Testar Integração
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SyncIcon = ({ className = "" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
    </svg>
);
