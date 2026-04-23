
import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';

import { Search, Plus, Link, User, DollarSign, X, Edit2, Smartphone, CreditCard, ToggleLeft, ToggleRight, CircleCheck, CircleX, Briefcase, Phone, TrendingUp, Award, Star, Filter, Calendar, AlertTriangle, ArrowRight, Sparkles, ChevronDown, History, ArrowUp, ArrowDown, Layers, Clock, FileText, Printer, Download } from 'lucide-react';

import { PROVIDERS } from '../constants';
import { Provider, Appointment, Customer, Service, CommissionHistoryItem } from '../types';
import { Avatar } from './Avatar';

interface ProfessionalsProps {
    providers: Provider[];
    setProviders: React.Dispatch<React.SetStateAction<Provider[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    customers: Customer[];
    services: Service[];
}

export const Professionals: React.FC<ProfessionalsProps> = ({ providers, setProviders, appointments, setAppointments, customers, services }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'equipe' | 'regulamento'>('equipe');
    const [selectedDocProviderId, setSelectedDocProviderId] = useState<string>('');

    // Get selected provider data for document
    const selectedDocProvider = providers.find(p => p.id === selectedDocProviderId);

    const handlePrintRegulation = () => {
        if (!selectedDocProvider) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Regulamento Interno - ${selectedDocProvider.name}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                        .page-break { page-break-after: always; }
                    }
                    body { font-family: 'Inter', sans-serif; }
                    .a4-container {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15mm 20mm;
                        margin: 0 auto;
                        background: white;
                        position: relative;
                        box-sizing: border-box;
                    }
                    section { page-break-inside: avoid; margin-bottom: 1.5rem; }
                </style>
            </head>
            <body class="bg-slate-50">
                ${['VIA DA PROFISSIONAL', 'VIA DA ESMALTERIA'].map((via, idx) => `
                    <div class="a4-container page-break">
                        <div class="text-center mb-8 pb-8 border-b border-slate-100">
                            <div class="flex justify-center mb-6">
                                <img src="/logo.png" alt="Aminna" style="height: 50px;">
                            </div>
                            <h1 class="text-2xl font-[900] uppercase tracking-tighter text-slate-900">Regulamento Interno Oficial</h1>
                            <p class="text-base font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Código de Conduta</p>
                            <span class="px-4 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">${via}</span>
                        </div>

                        <div class="p-4 bg-slate-50 border-l-4 border-slate-900 mb-8">
                            <p class="text-[11px] font-bold italic text-slate-800">
                                <span class="uppercase font-black not-italic mr-1">Importante:</span>
                                Este Regulamento Interno complementa o Contrato de Parceria Profissional homologado junto ao sindicato. Em caso de divergência, prevalecerão as cláusulas do contrato sindical assinado entre as partes.
                            </p>
                        </div>

                        <div class="space-y-6 text-slate-800">
                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">1. OBJETIVO</h3>
                                <p class="text-[11px] leading-relaxed">Estabelecer regras claras de conduta, operação, qualidade de atendimento, responsabilidades e procedimentos internos aplicáveis a todas as profissionais parceiras da <span class="font-black text-slate-950">AMINNA GEL E ESMALTERIA LTDA</span>.</p>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">2. DIREITOS DA PROFISSIONAL PARCEIRA</h3>
                                <ul class="text-[10px] space-y-1 font-bold text-slate-600 pl-4">
                                    <li>• utilização da estrutura física para atendimento;</li>
                                    <li>• uso dos equipamentos e mobiliários disponibilizados;</li>
                                    <li>• recebimento dos repasses conforme contrato;</li>
                                    <li>• ambiente limpo, seguro e organizado;</li>
                                    <li>• transparência financeira e de agenda;</li>
                                    <li>• tratamento ético e respeitoso.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">3. DEVERES DA PROFISSIONAL PARCEIRA</h3>
                                <ul class="text-[10px] space-y-1 font-bold text-slate-600 pl-4">
                                    <li>• cumprir horários agendados;</li>
                                    <li>• manter pontualidade;</li>
                                    <li>• preservar padrão técnico e de atendimento;</li>
                                    <li>• zelar pelos materiais e equipamentos;</li>
                                    <li>• seguir normas sanitárias e de biossegurança;</li>
                                    <li>• comunicar faltas e atrasos previamente;</li>
                                    <li>• manter postura profissional perante clientes e equipe.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">4. POLÍTICA DE ADVERTÊNCIAS</h3>
                                <p class="text-[10px] mb-2 font-bold">O descumprimento das normas poderá gerar medidas progressivas:</p>
                                <ul class="text-[10px] space-y-1 font-bold text-slate-600 pl-4">
                                    <li>• <span class="text-slate-900">1ª ocorrência:</span> advertência verbal;</li>
                                    <li>• <span class="text-slate-900">2ª ocorrência:</span> advertência por escrito;</li>
                                    <li>• <span class="text-slate-900">3ª ocorrência:</span> bloqueio temporário da agenda;</li>
                                    <li>• <span class="text-slate-900">4ª ocorrência:</span> rescisão da parceria.</li>
                                </ul>
                                <p class="text-[9px] mt-2 font-bold italic text-slate-500">Faltas graves poderão ensejar advertência escrita imediata ou rescisão direta.</p>
                            </section>
                        </div>
                        <div class="absolute bottom-8 left-0 right-0 text-center border-t border-slate-100 pt-4 mx-20">
                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">AMINNA GEL E ESMALTERIA | Página 1 / 3 | ${via}</p>
                        </div>
                    </div>

                    <div class="a4-container page-break">
                        <div class="space-y-6 text-slate-800">
                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">5. POLÍTICA DE FALTAS, ATRASOS E GESTÃO DE AGENDA</h3>
                                <p class="text-[10px] mb-2 font-bold">Em caso de ausência sem aviso mínimo de <span class="font-black text-slate-900">24 horas</span>, poderão ser adotadas as seguintes medidas:</p>
                                <ul class="text-[10px] space-y-1 font-bold text-slate-600 pl-4 mb-2">
                                    <li>• advertência formal;</li>
                                    <li>• remanejanento das clientes;</li>
                                    <li>• bloqueio preventivo da agenda;</li>
                                    <li>• suspensão temporária.</li>
                                </ul>
                                <p class="text-[10px] font-bold">Atrasos superiores a <span class="font-black text-slate-900">15 minutos</span> sem aviso poderão autorizar realocação do atendimento.</p>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">6. NÃO CONCORRÊNCIA E NÃO CAPTAÇÃO DE CLIENTES</h3>
                                <p class="text-[10px] mb-1 font-bold">É vedado:</p>
                                <ul class="text-[10px] space-y-1 font-bold text-slate-600 pl-4">
                                    <li>• levar clientes da casa para atendimento externo;</li>
                                    <li>• utilizar contatos ou dados cadastrais das clientes;</li>
                                    <li>• divulgar agenda particular às clientes captadas pela empresa;</li>
                                    <li>• oferecer atendimento externo sem autorização.</li>
                                </ul>
                                <p class="text-[10px] mt-2">O descumprimento poderá ensejar advertência, multa contratual, bloqueio de agenda e rescisão.</p>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">7. CONDUTA PROFISSIONAL</h3>
                                <p class="text-[10px] mb-1 font-bold">Não será permitido:</p>
                                <ul class="text-[10px] space-y-1 font-bold text-slate-600 pl-4">
                                    <li>• negociação direta de valores sem registro;</li>
                                    <li>• recebimento fora do sistema da esmalteria;</li>
                                    <li>• comportamento desrespeitoso;</li>
                                    <li>• exposição de conflitos internos às clientes.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">8. POLÍTICA FINANCEIRA</h3>
                                <div class="space-y-1">
                                    <p class="text-[10px] font-bold">Percentual da profissional: <span class="text-indigo-600 font-black">${(selectedDocProvider.commissionRate * 100).toFixed(0)}%</span></p>
                                    <p class="text-[10px] font-bold">Percentual da esmalteria: <span class="font-black">${(100 - selectedDocProvider.commissionRate * 100).toFixed(0)}%</span></p>
                                    <p class="text-[10px] font-bold">Fechamento: <span class="font-black uppercase">QUINZENAL</span></p>
                                    <p class="text-[10px] font-bold">Pagamento: <span class="font-black uppercase">DIA 05 E DIA 20</span></p>
                                </div>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">9. RESCISÃO DA PARCERIA</h3>
                                <p class="text-[10px] leading-relaxed">A rescisão voluntária deverá respeitar o aviso prévio de <span class="font-black">30 dias</span>, salvo hipóteses de falta grave previstas no contrato sindical.</p>
                            </section>
                        </div>
                        <div class="absolute bottom-8 left-0 right-0 text-center border-t border-slate-100 pt-4 mx-20">
                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">AMINNA GEL E ESMALTERIA | Página 2 / 3 | ${via}</p>
                        </div>
                    </div>

                    <div class="a4-container ${idx === 1 ? '' : 'page-break'}">
                        <div class="space-y-6 text-slate-800">
                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">10. ABANDONO DA PARCERIA</h3>
                                <p class="text-[10px] mb-2">Será considerado abandono a ausência superior a <span class="font-black">7 dias corridos</span>, sem justificativa formal e sem comunicação com a gestão.</p>
                                <p class="text-[10px] mb-1 font-bold">Entre o 3º e o 5º dia, a empresa poderá:</p>
                                <ul class="text-[10px] space-y-1 font-bold text-slate-600 pl-4">
                                    <li>• notificar formalmente a profissional;</li>
                                    <li>• bloquear preventivamente a agenda;</li>
                                    <li>• remanejar as clientes.</li>
                                </ul>
                                <p class="text-[10px] mt-2">Ultrapassado o 7º dia, poderá ocorrer rescisão imediata por abandono.</p>
                            </section>

                            <section>
                                <h3 class="text-xs font-black uppercase tracking-tight mb-2 border-b border-slate-100 pb-1">11. AFASTAMENTO TEMPORÁRIO POR GESTAÇÃO OU RECOMENDAÇÃO MÉDICA</h3>
                                <p class="text-[10px] mb-2 leading-relaxed">Em caso de gestação, gravidez de risco ou recomendação médica, a profissional poderá solicitar <span class="font-black">afastamento temporário da agenda</span>, sem rescisão da parceria.</p>
                                <p class="text-[10px] mb-2 leading-relaxed">Durante o período, a empresa poderá remanejar as clientes para outras profissionais.</p>
                                <p class="text-[10px] leading-relaxed">O retorno ocorrerá mediante comunicação formal e, quando necessário, liberação médica.</p>
                            </section>

                            <div class="pt-8 mt-4 border-t-2 border-slate-900">
                                <h3 class="text-xs font-black uppercase tracking-tight mb-4 text-center">12. TERMO DE CIÊNCIA E ACEITE</h3>
                                <p class="text-[10px] text-center mb-8">Declaro que li, compreendi e concordo com todas as disposições deste Regulamento Interno e do Contrato de Parceria.</p>
                                
                                <div class="space-y-6 max-w-md mx-auto">
                                    <div class="border-b border-slate-900 flex justify-between items-end">
                                        <span class="text-[9px] font-bold text-slate-500 uppercase">Nome:</span>
                                        <span class="text-[10px] font-black uppercase text-slate-900">${selectedDocProvider.name}</span>
                                    </div>
                                    <div class="border-b border-slate-900 flex justify-between items-end">
                                        <span class="text-[9px] font-bold text-slate-500 uppercase">CPF / CNPJ:</span>
                                        <span class="text-[10px] font-black uppercase text-slate-900">${selectedDocProvider.phone || '________________________'}</span>
                                    </div>
                                    <div class="border-b border-slate-900 flex justify-between items-end h-8">
                                        <span class="text-[9px] font-bold text-slate-500 uppercase">Assinatura:</span>
                                    </div>
                                    <div class="flex justify-between items-end">
                                        <div class="border-b border-slate-900 w-32 pb-1">
                                            <span class="text-[9px] font-bold text-slate-500 uppercase mr-2">Data:</span>
                                            <span class="text-[10px] font-black">${new Date().toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <p class="text-[10px] font-black uppercase tracking-widest text-slate-950">AMINNA GEL E ESMALTERIA LTDA</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="absolute bottom-8 left-0 right-0 text-center border-t border-slate-100 pt-4 mx-20">
                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">AMINNA GEL E ESMALTERIA | Página 3 / 3 | ${via}</p>
                        </div>
                    </div>
                `).join('')}
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            // window.close(); // Opcional: fechar após imprimir
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [serviceAddSearch, setServiceAddSearch] = useState(''); // New state for service search
    const [filterCategory, setFilterCategory] = useState('');

    // States for Edit/Add Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

    // State for Commission Change Justification
    const [commissionChangeReason, setCommissionChangeReason] = useState('');

    // States for Inactivation Conflict
    const [inactivationData, setInactivationData] = useState<{
        providerId: string;
        appointments: Appointment[];
    } | null>(null);

    // Alterado: Mapa de substituições individuais (ID Agendamento -> ID Novo Profissional)
    const [replacementMap, setReplacementMap] = useState<Record<string, string>>({});

    // Form State
    const [formData, setFormData] = useState<Partial<Provider> & {
        fiscalCnpj?: string;
        fiscalMunicipalRegistration?: string;
        fiscalSocialName?: string;
        fiscalFantasyName?: string;
        fiscalVerified?: boolean;
        fiscalDasAmount?: number;
        fiscalOtherDiscounts?: number;
        customDurations?: Record<string, number>;
    }>({
        name: '',
        nickname: '',
        phone: '',
        specialty: '', // Legacy/Main label
        specialties: [], // New multi-select list
        commissionRate: 0.4, // 40% profissional, 60% salão
        pixKey: '',
        birthDate: '',
        active: true,
        workDays: [1, 2, 3, 4, 5, 6], // Default Mon-Sat
        customDurations: {},
        // Fiscal data
        fiscalFantasyName: '',
        fiscalVerified: false,
        vacationStart: '',
        vacationEnd: '',
        daysOff: []
    });

    // ... (rest of code)

    // Extract unique required specialties from services - STRICTLY derived from services names
    const availableServices = useMemo(() => {
        return services.map(s => s.name).sort();
    }, [services]);

    const uniqueCategories = useMemo(() => {
        return Array.from(new Set(services.map(s => s.category).filter(Boolean))) as string[];
    }, [services]);

    // Helper for weekdays
    const weekDays = [
        { id: 0, label: 'D', full: 'Domingo' },
        { id: 1, label: 'S', full: 'Segunda' },
        { id: 2, label: 'T', full: 'Terça' },
        { id: 3, label: 'Q', full: 'Quarta' },
        { id: 4, label: 'Q', full: 'Quinta' },
        { id: 5, label: 'S', full: 'Sexta' },
        { id: 6, label: 'S', full: 'Sábado' }
    ];

    const toggleWorkDay = (dayId: number) => {
        const currentDays = formData.workDays || [];
        if (currentDays.includes(dayId)) {
            setFormData({ ...formData, workDays: currentDays.filter(d => d !== dayId) });
        } else {
            setFormData({ ...formData, workDays: [...currentDays, dayId].sort() });
        }
    };

    const addSpecialty = (spec: string) => {
        if (!spec) return;

        const currentSpecs = formData.specialties || [];
        if (!currentSpecs.includes(spec)) {
            const added = [...currentSpecs, spec];
            // Only set specialty (Title) if it's currently empty
            const newTitle = formData.specialty ? formData.specialty : spec;
            setFormData({ ...formData, specialties: added, specialty: newTitle });
        }
        setServiceAddSearch(''); // Reset search after adding
    };

    const removeSpecialty = (spec: string) => {
        const currentSpecs = formData.specialties || [];
        const filtered = currentSpecs.filter(s => s !== spec);

        // Also remove custom duration if it exists
        const newDurations = { ...(formData.customDurations || {}) };
        delete newDurations[spec];

        // Do NOT change the Title (specialty) when removing a service
        setFormData({ ...formData, specialties: filtered, customDurations: newDurations });
    };

    const handleAddGroup = (category: string) => {
        if (!category) return;
        const servicesInGroup = services
            .filter(s => s.category === category)
            .map(s => s.name);

        const currentSpecs = formData.specialties || [];
        // Add only ones not already present
        const newSpecs = [...new Set([...currentSpecs, ...servicesInGroup])];

        setFormData({ ...formData, specialties: newSpecs });
    };

    // Performance Calculations
    const stats = useMemo(() => {
        const activeCount = providers.filter(p => p.active).length;

        // Calculate performance per pro
        const performanceMap: Record<string, { count: number; rating: number; ratingCount: number }> = {};

        appointments.forEach(appt => {
            if (appt.status === 'Concluído') {
                if (!performanceMap[appt.providerId]) {
                    performanceMap[appt.providerId] = { count: 0, rating: 0, ratingCount: 0 };
                }
                performanceMap[appt.providerId].count++;
            }
        });

        const topProId = Object.entries(performanceMap).sort((a, b) => b[1].count - a[1].count)[0]?.[0];
        const topPro = providers.find(p => p.id === topProId)?.name || 'N/A';
        const totalCompleted = appointments.filter(a => a.status === 'Concluído').length;

        return {
            total: providers.length,
            active: activeCount,
            inactive: providers.length - activeCount,
            topPro,
            totalCompleted
        };
    }, [providers, appointments]);

    const filteredProviders = providers
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.specialty.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && p.active) ||
                (statusFilter === 'inactive' && !p.active);
            return matchesSearch && matchesStatus;
        });

    // Helper to ensure all providers have an order
    const normalizeOrders = async (currentList: Provider[]) => {
        const updates = currentList.map((p, index) => ({
            ...p,
            order: index
        }));

        setProviders(prev => {
            const map = new Map(updates.map(u => [u.id, u]));
            return prev.map(p => map.get(p.id) || p);
        });

        const dbUpdates = updates.map(p => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            specialty: p.specialty,
            specialties: p.specialties,
            commission_rate: p.commissionRate,
            commission_history: p.commissionHistory,
            pix_key: p.pixKey,
            birth_date: p.birthDate,
            active: p.active,
            work_days: p.workDays,
            avatar: p.avatar,
            order: p.order
        }));
        const { error } = await supabase.from('providers').upsert(dbUpdates);
        if (error) console.error('Error normalizing orders:', error);
        return updates;
    };

    const handleMoveUp = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (index === 0) return;

        const needsNormalization = filteredProviders.some(p => p.order === undefined || p.order === null);
        let workingList = [...filteredProviders];

        if (needsNormalization) {
            workingList = workingList.map((p, idx) => ({ ...p, order: idx }));
        }

        const currentParams = workingList[index];
        const prevParams = workingList[index - 1];

        const currentOrder = currentParams.order!;
        const prevOrder = prevParams.order!;

        const updatedCurrent = { ...currentParams, order: prevOrder };
        const updatedPrev = { ...prevParams, order: currentOrder };

        setProviders(prev => prev.map(p => {
            if (p.id === currentParams.id) return updatedCurrent;
            if (p.id === prevParams.id) return updatedPrev;
            if (needsNormalization) {
                const found = workingList.find(w => w.id === p.id);
                if (found) return found.id === currentParams.id ? updatedCurrent : found.id === prevParams.id ? updatedPrev : found;
            }
            return p;
        }));

        if (needsNormalization) {
            const finalList = workingList.map(p => {
                if (p.id === currentParams.id) return updatedCurrent;
                if (p.id === prevParams.id) return updatedPrev;
                return p;
            });

            const dbUpdates = finalList.map(p => ({
                id: p.id,
                name: p.name,
                phone: p.phone,
                specialty: p.specialty,
                specialties: p.specialties,
                commission_rate: p.commissionRate,
                commission_history: p.commissionHistory,
                pix_key: p.pixKey,
                birth_date: p.birthDate,
                active: p.active,
                work_days: p.workDays,
                avatar: p.avatar,
                order: p.order
            }));
            await supabase.from('providers').upsert(dbUpdates);
        } else {
            await supabase.from('providers').update({ order: prevOrder }).eq('id', currentParams.id);
            await supabase.from('providers').update({ order: currentOrder }).eq('id', prevParams.id);
        }
    };

    const handleMoveDown = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (index === filteredProviders.length - 1) return;

        const needsNormalization = filteredProviders.some(p => p.order === undefined || p.order === null);
        let workingList = [...filteredProviders];

        if (needsNormalization) {
            workingList = workingList.map((p, idx) => ({ ...p, order: idx }));
        }

        const currentParams = workingList[index];
        const nextParams = workingList[index + 1];

        const currentOrder = currentParams.order!;
        const nextOrder = nextParams.order!;

        const updatedCurrent = { ...currentParams, order: nextOrder };
        const updatedNext = { ...nextParams, order: currentOrder };

        setProviders(prev => prev.map(p => {
            if (p.id === currentParams.id) return updatedCurrent;
            if (p.id === nextParams.id) return updatedNext;
            if (needsNormalization) {
                const found = workingList.find(w => w.id === p.id);
                if (found) return found.id === currentParams.id ? updatedCurrent : found.id === nextParams.id ? updatedNext : found;
            }
            return p;
        }));

        if (needsNormalization) {
            const finalList = workingList.map(p => {
                if (p.id === currentParams.id) return updatedCurrent;
                if (p.id === nextParams.id) return updatedNext;
                return p;
            });
            const dbUpdates = finalList.map(p => ({
                id: p.id,
                name: p.name,
                phone: p.phone,
                specialty: p.specialty,
                specialties: p.specialties,
                commission_rate: p.commissionRate,
                commission_history: p.commissionHistory,
                pix_key: p.pixKey,
                birth_date: p.birthDate,
                active: p.active,
                work_days: p.workDays,
                avatar: p.avatar,
                order: p.order,
                custom_durations: p.customDurations || {}
            }));
            await supabase.from('providers').upsert(dbUpdates);
        } else {
            await supabase.from('providers').update({ order: nextOrder }).eq('id', currentParams.id);
            await supabase.from('providers').update({ order: currentOrder }).eq('id', nextParams.id);
        }
    };

    const handleAddNew = () => {
        setEditingProvider(null);
        setCommissionChangeReason(''); // Reset reason
        setServiceAddSearch(''); // Reset search
        setFormData({
            name: '',
            phone: '',
            specialty: '',
            specialties: [],
            commissionRate: 0.4,
            commissionHistory: [],
            pixKey: '',
            birthDate: '',
            active: true,
            avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
            workDays: [1, 2, 3, 4, 5, 6],
            fiscalCnpj: '',
            fiscalMunicipalRegistration: '',
            fiscalSocialName: '',
            fiscalFantasyName: '',
            customDurations: {},
            vacationStart: '',
            vacationEnd: '',
            daysOff: []
        });
        setIsModalOpen(true);
    };

    const handleToggleActive = () => {
        // If currently Active (true) and we are clicking to turn it OFF
        if (formData.active) {
            const pid = editingProvider?.id;

            // Only check if it's an existing provider (pid exists)
            if (pid) {
                const todayStr = new Date().toISOString().split('T')[0];
                const futureApps = appointments.filter(a =>
                    a.providerId === pid &&
                    a.status !== 'Cancelado' &&
                    a.status !== 'Concluído' &&
                    a.date >= todayStr
                );

                if (futureApps.length > 0) {
                    // Found conflicts: Show Modal immediately and DO NOT toggle yet
                    setInactivationData({
                        providerId: pid,
                        appointments: futureApps
                    });
                    setReplacementMap({}); // Reset map

                    return; // Stop here, wait for user to resolve in modal
                }
            }
        }

        // If no conflicts or we are activating, just toggle
        setFormData({ ...formData, active: !formData.active });
    };

    // Load fiscal data when editing
    const loadFiscalData = async (providerId: string) => {
        try {
            const { data, error } = await supabase
                .from('professional_fiscal_config')
                .select('*')
                .eq('provider_id', providerId)
                .single();

            if (data) {
                setFormData(prev => ({
                    ...prev,
                    fiscalCnpj: data.cnpj,
                    fiscalMunicipalRegistration: data.municipal_registration || '',
                    fiscalSocialName: data.social_name || '',
                    fiscalFantasyName: data.fantasy_name || '',
                    fiscalVerified: !!data.verified,
                    fiscalDasAmount: data.das_amount || 0,
                    fiscalOtherDiscounts: data.other_discounts || 0
                }));
            }
        } catch (error) {
            console.error('Error loading fiscal data:', error);
        }
    };

    // ...

    const handleEdit = (provider: Provider) => {
        setEditingProvider(provider);
        setCommissionChangeReason(''); // Reset reason
        setFormData({
            ...provider,
            nickname: provider.nickname || '',
            workDays: provider.workDays || [1, 2, 3, 4, 5, 6], // Fallback if legacy data missing
            specialties: provider.specialties || [provider.specialty], // Fallback
            fiscalFantasyName: '',
            customDurations: provider.customDurations || {},
            vacationStart: provider.vacationStart || '',
            vacationEnd: provider.vacationEnd || '',
            daysOff: provider.daysOff || []
        });

        // Fetch specific fiscal data
        loadFiscalData(provider.id);

        setIsModalOpen(true);
    };

    // ...

    // Save fiscal data to professional_fiscal_config table
    const saveFiscalData = async (providerId: string) => {
        try {
            // Convert commission rate (0.4) to percentage (40)
            const servicePercentage = (formData.commissionRate || 0.4) * 100;

            const fiscalData = {
                provider_id: providerId,
                cnpj: formData.fiscalCnpj,
                municipal_registration: formData.fiscalMunicipalRegistration || null,
                social_name: formData.fiscalSocialName || null,
                fantasy_name: formData.fiscalFantasyName || null,
                service_percentage: servicePercentage,
                active: true,
                verified: formData.fiscalVerified || false, // User can now verify
                das_amount: formData.fiscalDasAmount || 0,
                other_discounts: formData.fiscalOtherDiscounts || 0
            };

            // Check if fiscal config already exists for this provider
            const { data: existing } = await supabase
                .from('professional_fiscal_config')
                .select('id')
                .eq('provider_id', providerId)
                .single();

            if (existing) {
                // Update existing
                const { error } = await supabase
                    .from('professional_fiscal_config')
                    .update(fiscalData)
                    .eq('provider_id', providerId);

                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('professional_fiscal_config')
                    .insert([fiscalData]);

                if (error) throw error;
            }
        } catch (error) {
            console.error('Error saving fiscal data:', error);
            alert('Erro ao salvar dados fiscais. Verifique e tente novamente.');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const providerData = {
            name: formData.name?.trim(),
            nickname: formData.nickname?.trim() || (formData.name?.trim().split(' ')[0] || ''),
            phone: formData.phone,
            specialty: formData.specialty,
            specialties: formData.specialties || [],
            commission_rate: formData.commissionRate,
            pix_key: formData.pixKey,
            birth_date: formData.birthDate || null,
            active: formData.active,
            work_days: formData.workDays || [],
            avatar: formData.avatar,
            custom_durations: formData.customDurations || {},
            order: editingProvider ? undefined : providers.length, // Set last order for new items (undefined for updates to ignore)
            vacation_start: formData.vacationStart || null,
            vacation_end: formData.vacationEnd || null,
            days_off: formData.daysOff || []
        };

        try {
            if (editingProvider) {
                // Check for commission change
                let updatedCommissionHistory = editingProvider.commissionHistory || [];

                if (editingProvider.commissionRate !== formData.commissionRate) {
                    if (!commissionChangeReason.trim()) {
                        alert("Por favor, informe o motivo da alteração de comissão (promoção, reajuste, etc).");
                        return;
                    }

                    // Add OLD rate to history
                    const historyItem: CommissionHistoryItem = {
                        date: new Date().toISOString(),
                        rate: editingProvider.commissionRate,
                        note: commissionChangeReason
                    };
                    updatedCommissionHistory = [historyItem, ...updatedCommissionHistory];
                }

                const { error } = await supabase.from('providers').update({
                    ...providerData,
                    commission_history: updatedCommissionHistory
                }).eq('id', editingProvider.id);
                if (error) throw error;

                const updatedProvider = {
                    ...editingProvider,
                    ...formData,
                    commissionHistory: updatedCommissionHistory
                } as Provider;

                setProviders(prev => prev.map(p => p.id === editingProvider.id ? updatedProvider : p));

                // Save fiscal data if provided
                if (formData.fiscalCnpj) {
                    await saveFiscalData(editingProvider.id);
                }
            } else {
                const { data, error } = await supabase.from('providers').insert([providerData]).select();
                if (error) throw error;
                if (data && data[0]) {
                    const newProvider = { ...formData, id: data[0].id, commissionHistory: [], order: providers.length } as Provider;
                    setProviders(prev => [...prev, newProvider]);

                    // Save fiscal data if provided
                    if (formData.fiscalCnpj) {
                        await saveFiscalData(data[0].id);
                    }
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving provider:', error);
            alert('Erro ao salvar profissional.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja desativar este profissional? Os agendamentos históricos serão mantidos.')) {
            try {
                const { error } = await supabase
                    .from('providers')
                    .update({ active: false })
                    .eq('id', id);
                if (error) throw error;

                setProviders(prev => prev.map(p => p.id === id ? { ...p, active: false } : p));
            } catch (error) {
                console.error('Error deactivating provider:', error);
                alert('Erro ao desativar profissional.');
            }
        }
    };

    const confirmInactivation = () => {
        if (!inactivationData) return;

        // Validate if ALL appointments have a replacement selected
        const allSelected = inactivationData.appointments.every(app => replacementMap[app.id]);
        if (!allSelected) return;

        // 1. Transfer Appointments Individually
        setAppointments(prev => prev.map(a => {
            const newProviderId = replacementMap[a.id];
            // If this appointment is in the conflict list AND has a replacement selected
            if (newProviderId && inactivationData.appointments.some(ia => ia.id === a.id)) {
                return { ...a, providerId: newProviderId };
            }
            return a;
        }));

        // 2. Set the form state to Inactive (Visual Feedback)
        setFormData(prev => ({ ...prev, active: false }));

        // 3. Close Conflict Modal & Cleanup
        setInactivationData(null);
        setReplacementMap({});
    };

    // Helper to get available replacement providers (active and NOT the current one being inactivated)
    const availableReplacements = providers.filter(p => p.active && p.id !== inactivationData?.providerId);
    const isAllReplacementsSelected = inactivationData ? inactivationData.appointments.every(app => replacementMap[app.id]) : false;

    // Check if commission changed in form to show extra input
    const isCommissionChanged = editingProvider && formData.commissionRate !== editingProvider.commissionRate;

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-8">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight uppercase">Equipe Profissional</h2>
                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão de talentos e performance</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        <Plus size={18} /> Nova Profissional
                    </button>
                </div>
            </div>

            {activeTab === 'equipe' ? (
                <>

            {/* Indicators / Performance Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl w-fit mb-3"><Briefcase size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Total Equipe</p>
                    <p className="text-xl md:text-2xl font-black text-slate-950 dark:text-white">{stats.total}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl w-fit mb-3"><TrendingUp size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Taxa Atividade</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-800 dark:text-emerald-400">{((stats.active / stats.total) * 100).toFixed(0)}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl w-fit mb-3"><Award size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Destaque Produção</p>
                    <p className="text-sm md:text-base font-black text-slate-950 dark:text-white truncate leading-tight mt-1">{stats.topPro}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl w-fit mb-3"><Star size={20} /></div>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Atendimentos Mês</p>
                    <p className="text-xl md:text-2xl font-black text-purple-900 dark:text-purple-400">{stats.totalCompleted}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou especialidade..."
                        className="w-full pl-11 pr-4 py-3 outline-none text-sm font-black text-slate-950 dark:text-white placeholder-slate-500 bg-slate-50/50 dark:bg-zinc-800 rounded-2xl border-2 border-transparent focus:border-zinc-950 dark:focus:border-white transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === f ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Inativas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Table Layout (Hidden on Mobile) */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-[10px] text-slate-800 dark:text-slate-300 font-black uppercase bg-slate-50/80 dark:bg-zinc-800/80 border-b border-slate-100 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-5">Profissional</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Serviços Habilitados</th>
                                <th className="px-6 py-5 text-center">Celular</th>
                                <th className="px-6 py-5 text-center">Dias Ativos</th>
                                <th className="px-6 py-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-700">
                            {filteredProviders.map((provider) => {
                                // const proStats = appointments.filter(a => a.providerId === provider.id && a.status === 'Concluído').length;
                                return (
                                    <tr key={provider.id} className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors group ${!provider.active ? 'opacity-60 bg-slate-50/30 dark:bg-zinc-800/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={provider.avatar}
                                                    name={provider.name}
                                                    size="w-10 h-10"
                                                    className={`border-2 ${provider.active ? 'border-indigo-100 dark:border-indigo-900 shadow-sm' : 'border-slate-200 dark:border-zinc-700 grayscale'}`}
                                                />
                                                <span className={`font-black text-base ${!provider.active ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-950 dark:text-white'}`}>{provider.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${provider.active
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-zinc-600'
                                                }`}>
                                                {provider.active ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativa</> : 'Inativa'}
                                            </span>
                                            {provider.vacationStart && provider.vacationEnd && (
                                                <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                                    <Calendar size={10} /> Férias
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                {(provider.specialties || [provider.specialty]).slice(0, 3).map((spec, i) => (
                                                    <span key={i} className="bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-slate-300 dark:border-zinc-600">
                                                        {spec}
                                                    </span>
                                                ))}
                                                {(provider.specialties?.length || 0) > 3 && (
                                                    <span className="text-[9px] font-bold text-slate-400">+{provider.specialties.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-slate-800 dark:text-slate-300 text-xs">
                                            {provider.phone || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-0.5">
                                                {weekDays.map(day => (
                                                    <div
                                                        key={day.id}
                                                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${provider.workDays?.includes(day.id)
                                                            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-300 dark:text-zinc-600'
                                                            }`}
                                                    >
                                                        {day.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-xl overflow-hidden mr-2">
                                                    <button
                                                        onClick={(e) => handleMoveUp(filteredProviders.indexOf(provider), e)}
                                                        disabled={filteredProviders.indexOf(provider) === 0}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 dark:text-slate-400"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleMoveDown(filteredProviders.indexOf(provider), e)}
                                                        disabled={filteredProviders.indexOf(provider) === filteredProviders.length - 1}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 dark:text-slate-400"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedDocProviderId(provider.id);
                                                        setActiveTab('regulamento');
                                                    }}
                                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all active:scale-90"
                                                    title="Ver Regulamento"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(provider)}
                                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-900 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all active:scale-90"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
                {filteredProviders.map((provider) => {
                    const proStats = appointments.filter(a => a.providerId === provider.id && a.status === 'Concluído').length;
                    return (
                        <div
                            key={provider.id}
                            onClick={() => handleEdit(provider)}
                            className={`bg-white dark:bg-zinc-900 p-4 rounded-3xl border shadow-sm transition-all active:scale-[0.98] flex flex-col gap-4 ${provider.active ? 'border-slate-200 dark:border-zinc-800' : 'border-slate-100 dark:border-zinc-800 opacity-70 bg-slate-50/50 dark:bg-zinc-800/50'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        src={provider.avatar}
                                        name={provider.name}
                                        size="w-14 h-14"
                                        className={`rounded-2xl border-2 ${provider.active ? 'border-indigo-100 dark:border-indigo-900 shadow-md' : 'border-slate-200 dark:border-zinc-700 grayscale'}`}
                                    />
                                    <div className="min-w-0">
                                        <h4 className={`font-black text-base truncate ${!provider.active ? 'text-slate-600 dark:text-slate-500 line-through' : 'text-slate-950 dark:text-white'}`}>{provider.name}</h4>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {(provider.specialties || [provider.specialty]).slice(0, 2).map(spec => (
                                                <span key={spec} className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-slate-300 dark:border-zinc-600">{spec}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-300">{provider.phone || 'N/A'}</p>
                                    <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contato</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 dark:border-zinc-800">
                                <div className="bg-slate-50 dark:bg-zinc-800 p-2 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                    <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none">Produção Total</p>
                                    <p className="text-xs font-black text-slate-950 dark:text-white mt-1">{proStats} Atendimentos</p>
                                </div>
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-center relative">
                                    {provider.vacationStart && provider.vacationEnd && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-400 text-amber-950 text-[7px] font-black uppercase rounded-full shadow-sm border border-amber-200 z-10 flex items-center gap-1">
                                            <Calendar size={8} /> Férias
                                        </div>
                                    )}
                                    <div className="flex gap-1 bg-white dark:bg-zinc-900 rounded-lg">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDocProviderId(provider.id);
                                                setActiveTab('regulamento');
                                            }}
                                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 rounded-lg"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleMoveUp(filteredProviders.indexOf(provider), e)}
                                            disabled={filteredProviders.indexOf(provider) === 0}
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-slate-500 dark:text-slate-400"
                                        >
                                            <ArrowUp size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => handleMoveDown(filteredProviders.indexOf(provider), e)}
                                            disabled={filteredProviders.indexOf(provider) === filteredProviders.length - 1}
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-slate-500 dark:text-slate-400"
                                        >
                                            <ArrowDown size={12} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(provider)}
                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-900 dark:text-indigo-300"
                                    >
                                        <Edit2 size={14} /> Editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredProviders.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-zinc-800">
                        <Briefcase size={48} className="mx-auto text-slate-200 dark:text-zinc-700 mb-2" />
                        <p className="text-sm font-black text-slate-400 dark:text-zinc-600 uppercase">Nenhum talento encontrado</p>
                    </div>
                )}
            </div>
                </>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 no-print bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-xl">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setActiveTab('equipe')}
                                className="p-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                <ArrowUp size={20} className="-rotate-90" />
                            </button>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Regulamento Interno</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visualização e Impressão</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative hidden md:block">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={selectedDocProviderId}
                                    onChange={(e) => setSelectedDocProviderId(e.target.value)}
                                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl py-2 pl-9 pr-8 text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none focus:border-indigo-500 appearance-none"
                                >
                                    <option value="">Documento Geral</option>
                                    {providers.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handlePrintRegulation}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                            >
                                <Printer size={16} /> Imprimir (Nova Guia)
                            </button>
                        </div>
                    </div>
                    {/* CSS for A4 Print Fix */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            /* Reset global layout for print */
                            html, body {
                                height: auto !important;
                                overflow: visible !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                background: white !important;
                            }
                            
                            /* Hide everything else */
                            body > *:not(#root), 
                            #root > *:not(.print-root),
                            .no-print {
                                display: none !important;
                            }

                            /* Ensure the main container is visible */
                            .print-root {
                                display: block !important;
                                position: static !important;
                                overflow: visible !important;
                            }

                            /* Fix all ancestors of the print container */
                            div:has(> .print-container),
                            div:has(> div > .print-container) {
                                display: block !important;
                                position: static !important;
                                overflow: visible !important;
                                height: auto !important;
                            }

                            .print-container {
                                display: block !important;
                                width: 210mm !important;
                                min-height: 297mm !important;
                                padding: 15mm !important;
                                margin: 0 auto !important;
                                background: white !important;
                                color: black !important;
                                page-break-after: always !important;
                                overflow: visible !important;
                                position: relative !important;
                            }

                            @page {
                                size: A4;
                                margin: 0;
                            }
                        }
                    `}} />

                    <div className="space-y-12 print:space-y-0 print-root">
                        {/* Renderiza o documento duas vezes para as duas vias */}
                        {['VIA DA PROFISSIONAL', 'VIA DA ESMALTERIA'].map((via, idx) => (
                            <div key={idx} className="print-container bg-white dark:bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl print:shadow-none border border-slate-200 dark:border-zinc-800 print:border-none mx-auto w-full max-w-[210mm] min-h-[297mm]">
                                {/* Badge da Via */}
                                <div className="bg-zinc-950 text-white py-2 px-6 text-center text-[10px] font-black uppercase tracking-[0.3em] no-print print:block">
                                    {via}
                                </div>

                                {/* Header do Documento */}
                                <div className="p-12 md:p-20 text-center space-y-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-800/20">
                                    <div className="flex justify-center mb-6">
                                        <img src="/logo.png" alt="Aminna" className="h-16 md:h-20 dark:invert opacity-80" />
                                    </div>
                                    <div className="space-y-1">
                                        <h1 className="text-xl md:text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Regulamento Interno Oficial</h1>
                                        <p className="text-sm md:text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Código de Conduta</p>
                                    </div>
                                    <div className="pt-2 print:hidden">
                                        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{via}</span>
                                    </div>
                                </div>

                                {/* Conteúdo do Documento */}
                                <div className="p-8 md:p-16 space-y-10 text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-white dark:bg-zinc-900 shadow-sm print:shadow-none">
                                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border-l-4 border-slate-900 dark:border-white rounded-xl text-[10px]">
                                        <p className="font-bold text-slate-900 dark:text-slate-200 italic">
                                            <span className="uppercase font-black not-italic inline-block mr-1">Importante:</span>
                                            Este Regulamento Interno complementa o Contrato de Parceria Profissional homologado junto ao sindicato. Em caso de divergência, prevalecerão as cláusulas do contrato sindical assinado entre as partes.
                                        </p>
                                    </div>

                                    <div className="space-y-12">
                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                1. OBJETIVO
                                            </h3>
                                            <p className="text-[11px]">Estabelecer regras claras de conduta, operação, qualidade de atendimento, responsabilidades e procedimentos internos aplicáveis a todas as profissionais parceiras da <span className="font-black">AMINNA GEL E ESMALTERIA LTDA</span>.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                2. DIREITOS DA PROFISSIONAL PARCEIRA
                                            </h3>
                                            <p className="text-[11px] mb-3">A profissional parceira terá direito a:</p>
                                            <ul className="text-[10px] space-y-2 list-none pl-4 font-bold text-slate-600 dark:text-slate-400">
                                                <li className="flex gap-2"><span>•</span> utilização da estrutura física para atendimento;</li>
                                                <li className="flex gap-2"><span>•</span> uso dos equipamentos e mobiliários disponibilizados;</li>
                                                <li className="flex gap-2"><span>•</span> recebimento dos repasses conforme contrato;</li>
                                                <li className="flex gap-2"><span>•</span> ambiente limpo, seguro e organizado;</li>
                                                <li className="flex gap-2"><span>•</span> transparência financeira e de agenda;</li>
                                                <li className="flex gap-2"><span>•</span> tratamento ético e respeitoso.</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                3. DEVERES DA PROFISSIONAL PARCEIRA
                                            </h3>
                                            <p className="text-[11px] mb-3">São deveres da profissional:</p>
                                            <ul className="text-[10px] space-y-2 list-none pl-4 font-bold text-slate-600 dark:text-slate-400">
                                                <li className="flex gap-2"><span>•</span> cumprir horários agendados;</li>
                                                <li className="flex gap-2"><span>•</span> manter pontualidade;</li>
                                                <li className="flex gap-2"><span>•</span> preservar padrão técnico e de atendimento;</li>
                                                <li className="flex gap-2"><span>•</span> zelar pelos materiais e equipamentos;</li>
                                                <li className="flex gap-2"><span>•</span> seguir normas sanitárias e de biossegurança;</li>
                                                <li className="flex gap-2"><span>•</span> comunicar faltas e atrasos previamente;</li>
                                                <li className="flex gap-2"><span>•</span> manter postura profissional perante clientes e equipe.</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                4. POLÍTICA DE ADVERTÊNCIAS
                                            </h3>
                                            <p className="text-[11px] mb-3">O descumprimento das normas poderá gerar medidas progressivas:</p>
                                            <ul className="text-[10px] space-y-2 list-none pl-4 font-bold text-slate-600 dark:text-slate-400">
                                                <li className="flex gap-2"><span>•</span> <span className="text-slate-950 dark:text-white">1ª ocorrência:</span> advertência verbal;</li>
                                                <li className="flex gap-2"><span>•</span> <span className="text-slate-950 dark:text-white">2ª ocorrência:</span> advertência por escrito;</li>
                                                <li className="flex gap-2"><span>•</span> <span className="text-slate-950 dark:text-white">3ª ocorrência:</span> bloqueio temporário da agenda;</li>
                                                <li className="flex gap-2"><span>•</span> <span className="text-slate-950 dark:text-white">4ª ocorrência:</span> rescisão da parceria.</li>
                                            </ul>
                                            <p className="text-[10px] mt-4 font-bold italic text-slate-500">Faltas graves poderão ensejar advertência escrita imediata ou rescisão direta.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                5. POLÍTICA DE FALTAS, ATRASOS E GESTÃO DE AGENDA
                                            </h3>
                                            <p className="text-[11px] mb-3">Em caso de ausência sem aviso mínimo de <span className="font-black">24 horas</span>, poderão ser adotadas as seguintes medidas:</p>
                                            <ul className="text-[10px] space-y-2 list-none pl-4 font-bold text-slate-600 dark:text-slate-400">
                                                <li className="flex gap-2"><span>•</span> advertência formal;</li>
                                                <li className="flex gap-2"><span>•</span> remanejamento das clientes;</li>
                                                <li className="flex gap-2"><span>•</span> bloqueio preventivo da agenda;</li>
                                                <li className="flex gap-2"><span>•</span> suspensão temporária.</li>
                                            </ul>
                                            <p className="text-[10px] mt-4 text-slate-500 font-bold">Atrasos superiores a <span className="font-black">15 minutos</span> sem aviso poderão autorizar realocação do atendimento.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                6. NÃO CONCORRÊNCIA E NÃO CAPTAÇÃO DE CLIENTES
                                            </h3>
                                            <p className="text-[11px] mb-3">É vedado:</p>
                                            <ul className="text-[10px] space-y-2 list-none pl-4 font-bold text-slate-600 dark:text-slate-400">
                                                <li className="flex gap-2"><span>•</span> levar clientes da casa para atendimento externo;</li>
                                                <li className="flex gap-2"><span>•</span> utilizar contatos ou dados cadastrais das clientes;</li>
                                                <li className="flex gap-2"><span>•</span> divulgar agenda particular às clientes captadas pela empresa;</li>
                                                <li className="flex gap-2"><span>•</span> oferecer atendimento externo sem autorização.</li>
                                            </ul>
                                            <p className="text-[10px] mt-4 font-bold text-slate-500 italic">O descumprimento poderá ensejar advertência, multa contratual, bloqueio de agenda e rescisão.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                7. CONDUTA PROFISSIONAL
                                            </h3>
                                            <p className="text-[11px] mb-3">Não será permitido:</p>
                                            <ul className="text-[10px] space-y-2 list-none pl-4 font-bold text-slate-600 dark:text-slate-400">
                                                <li className="flex gap-2"><span>•</span> negociação direta de valores sem registro;</li>
                                                <li className="flex gap-2"><span>•</span> recebimento fora do sistema da esmalteria;</li>
                                                <li className="flex gap-2"><span>•</span> comportamento desrespeitoso;</li>
                                                <li className="flex gap-2"><span>•</span> exposição de conflitos internos às clientes.</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                8. POLÍTICA FINANCEIRA
                                            </h3>
                                            <div className="space-y-3 max-w-md">
                                                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-zinc-800 py-2">
                                                    <span className="font-bold text-slate-500 uppercase tracking-tight">Percentual da profissional:</span>
                                                    <span className="font-black text-indigo-600 dark:text-indigo-400">{selectedDocProvider ? `${(selectedDocProvider.commissionRate * 100).toFixed(0)}%` : '_______ %'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-zinc-800 py-2">
                                                    <span className="font-bold text-slate-500 uppercase tracking-tight">Percentual da esmalteria:</span>
                                                    <span className="font-black text-slate-400">{selectedDocProvider ? `${(100 - (selectedDocProvider.commissionRate * 100)).toFixed(0)}%` : '_______ %'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-zinc-800 py-2">
                                                    <span className="font-bold text-slate-500 uppercase tracking-tight">Fechamento:</span>
                                                    <span className="font-black text-slate-900 dark:text-white">QUINZENAL</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 dark:border-zinc-800 py-2">
                                                    <span className="font-bold text-slate-500 uppercase tracking-tight">Pagamento:</span>
                                                    <span className="font-black text-slate-900 dark:text-white">DIA 05 E DIA 20</span>
                                                </div>
                                            </div>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                9. RESCISÃO DA PARCERIA
                                            </h3>
                                            <p className="text-[11px]">A rescisão voluntária deverá respeitar o aviso prévio de <span className="font-black text-slate-950 dark:text-white">30 dias</span>, salvo hipóteses de falta grave previstas no contrato sindical.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                10. ABANDONO DA PARCERIA
                                            </h3>
                                            <p className="text-[11px] mb-4">Será considerado abandono a ausência superior a <span className="font-black">7 dias corridos</span>, sem justificativa formal e sem comunicação com a gestão.</p>
                                            <p className="text-[11px] mb-3">Entre o <span className="font-black">3º e o 5º dia</span>, a empresa poderá:</p>
                                            <ul className="text-[10px] space-y-2 list-none pl-4 font-bold text-slate-600 dark:text-slate-400">
                                                <li className="flex gap-2"><span>•</span> notificar formalmente a profissional;</li>
                                                <li className="flex gap-2"><span>•</span> bloquear preventivamente a agenda;</li>
                                                <li className="flex gap-2"><span>•</span> remanejar as clientes.</li>
                                            </ul>
                                            <p className="text-[10px] mt-4 font-bold text-slate-500 italic">Ultrapassado o 7º dia, poderá ocorrer rescisão imediata por abandono.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
                                                11. AFASTAMENTO TEMPORÁRIO POR GESTAÇÃO OU RECOMENDAÇÃO MÉDICA
                                            </h3>
                                            <p className="text-[11px] mb-4">Em caso de gestação, gravidez de risco ou recomendação médica, a profissional poderá solicitar <span className="font-black text-slate-950 dark:text-white">afastamento temporário da agenda</span>, sem rescisão da parceria.</p>
                                            <p className="text-[11px] mb-4">Durante o período, a empresa poderá remanejar as clientes para outras profissionais.</p>
                                            <p className="text-[11px] font-bold italic text-slate-500">O retorno ocorrerá mediante comunicação formal e, quando necessário, liberação médica.</p>
                                        </section>

                                        <section className="pt-12 border-t-2 border-slate-900 dark:border-white">
                                            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight mb-6 text-center">
                                                12. TERMO DE CIÊNCIA E ACEITE
                                            </h3>
                                            <p className="text-[11px] text-center mb-12">Declaro que li, compreendi e concordo com todas as disposições deste Regulamento Interno e do Contrato de Parceria.</p>
                                            
                                            <div className="space-y-10 max-w-xl mx-auto">
                                                <div className="border-b border-slate-900 dark:border-white pb-1 flex justify-between items-end">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500">Nome:</span>
                                                    <span className="text-xs font-black text-slate-950 dark:text-white uppercase">{selectedDocProvider?.name || '___________________________________________'}</span>
                                                </div>
                                                <div className="border-b border-slate-900 dark:border-white pb-1 flex justify-between items-end">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500">CPF / CNPJ:</span>
                                                    <span className="text-xs font-black text-slate-950 dark:text-white uppercase">{selectedDocProvider?.phone ? 'DOCUMENTO ANEXADO' : '_____________________________________'}</span>
                                                </div>
                                                <div className="border-b border-slate-900 dark:border-white pb-1 flex justify-between items-end h-12">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500">Assinatura:</span>
                                                    <span className="text-xs font-black text-slate-950 dark:text-white">______________________________________</span>
                                                </div>
                                                <div className="border-b border-slate-900 dark:border-white pb-1 flex justify-between items-end">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500">Data:</span>
                                                    <span className="text-xs font-black text-slate-950 dark:text-white uppercase">{new Date().toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>

                                            <p className="mt-20 text-center text-sm font-black uppercase tracking-[0.2em] text-slate-950 dark:text-white">
                                                AMINNA GEL E ESMALTERIA LTDA
                                            </p>
                                        </section>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-950 p-4 text-center">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Aminna Gel e Esmalteria LTDA</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit/Add Modal - Adapted for Mobile as Bottom Sheet */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col border-2 border-black dark:border-zinc-700 max-h-[95vh]">
                        <div className="px-6 py-4 md:py-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-950 dark:bg-black text-white flex-shrink-0">
                            <h3 className="font-black text-base md:text-lg uppercase tracking-tight flex items-center gap-2">
                                <User size={20} className="text-indigo-400" />
                                {editingProvider ? 'Editar Talentos' : 'Admitir Profissional'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900">
                            <div className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${formData.active ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 opacity-60'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${formData.active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                                        {formData.active ? <CircleCheck size={24} /> : <CircleX size={24} />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-black uppercase ${formData.active ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-950 dark:text-white'}`}>Status: {formData.active ? 'Ativa' : 'Inativa'}</p>
                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Impacta na visibilidade da agenda</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleActive}
                                    className={`p-1 transition-transform active:scale-90 ${formData.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    {formData.active ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                                </button>
                            </div>

                            {/* VACATION PERIOD SECTION */}
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-[2rem] border-2 border-amber-100 dark:border-amber-900/30 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={14} /> Período de Férias
                                    </h4>
                                    {(formData.vacationStart || formData.vacationEnd) && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vacationStart: '', vacationEnd: '' })}
                                            className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                                        >
                                            Limpar Datas
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[8px] font-black text-amber-700/60 dark:text-amber-500/60 uppercase ml-1">Início</label>
                                        <input
                                            type="date"
                                            value={formData.vacationStart || ''}
                                            onChange={e => setFormData({ ...formData, vacationStart: e.target.value })}
                                            className="w-full bg-white dark:bg-zinc-900 border-2 border-amber-100 dark:border-amber-900/30 rounded-xl px-4 py-2.5 text-xs font-black text-amber-950 dark:text-white outline-none focus:border-amber-400 transition-all font-sans"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[8px] font-black text-amber-700/60 dark:text-amber-500/60 uppercase ml-1">Término</label>
                                        <input
                                            type="date"
                                            value={formData.vacationEnd || ''}
                                            onChange={e => setFormData({ ...formData, vacationEnd: e.target.value })}
                                            className="w-full bg-white dark:bg-zinc-900 border-2 border-amber-100 dark:border-amber-900/30 rounded-xl px-4 py-2.5 text-xs font-black text-amber-950 dark:text-white outline-none focus:border-amber-400 transition-all font-sans"
                                        />
                                    </div>
                                </div>
                                <p className="text-[8px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tight text-center italic">
                                    A agenda ficará bloqueada para este talento durante este período.
                                </p>
                            </div>

                            {/* DIAS DE FOLGA AVULSOS SECTION */}
                            <div className="bg-slate-50/50 dark:bg-zinc-800/50 p-5 rounded-[2rem] border-2 border-slate-100 dark:border-zinc-700/50 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} /> Dias de Folga Específicos
                                </h4>

                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="block text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Adicionar Data</label>
                                        <input
                                            type="date"
                                            id="new_day_off_input"
                                            className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-sans"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = e.currentTarget.value;
                                                    if (val && !formData.daysOff?.includes(val)) {
                                                        setFormData({ ...formData, daysOff: [...(formData.daysOff || []), val].sort() });
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('new_day_off_input') as HTMLInputElement;
                                            if (input && input.value && !formData.daysOff?.includes(input.value)) {
                                                setFormData({ ...formData, daysOff: [...(formData.daysOff || []), input.value].sort() });
                                                input.value = '';
                                            }
                                        }}
                                        className="h-[38px] px-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                    >
                                        Adicionar
                                    </button>
                                </div>

                                {/* List of Days Off */}
                                {(formData.daysOff && formData.daysOff.length > 0) ? (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {formData.daysOff.map(dateStr => (
                                            <div key={dateStr} className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 shadow-sm">
                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                    {new Date(dateStr + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, daysOff: formData.daysOff!.filter(d => d !== dateStr) });
                                                    }}
                                                    className="p-0.5 text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-center text-slate-400 dark:text-zinc-500 italic">Nenhum dia de folga adicionado.</p>
                                )}
                            </div>

                            <div className="flex justify-center -mt-6 mb-4 relative z-10">
                                <div className="relative group">
                                    <Avatar
                                        src={formData.avatar}
                                        name={formData.name || '?'}
                                        size="w-24 h-24"
                                        className="border-4 border-white dark:border-zinc-900 shadow-2xl"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm" onClick={() => document.getElementById('avatar-url-input')?.focus()}>
                                        <Edit2 size={24} className="text-white drop-shadow-md" />
                                    </div>
                                </div>
                            </div>

                            {/* AVATAR PRESETS */}
                            <div className="mb-6 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Escolha um Avatar</label>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {[
                                        // Females (Micah style is very clean/modern)
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Annie',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Bella',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Caitlyn',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Donna',
                                        // Males
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Felix',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=George',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Jack',
                                        'https://api.dicebear.com/7.x/micah/svg?seed=Leo',
                                    ].map((presetUrl, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, avatar: presetUrl })}
                                            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95 ${formData.avatar === presetUrl ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 dark:border-zinc-600 hover:border-indigo-400'}`}
                                        >
                                            <img src={presetUrl} alt="Avatar Preset" className="w-full h-full object-cover bg-white" />
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const randomSeed = Math.random().toString(36).substring(7);
                                            setFormData({ ...formData, avatar: `https://api.dicebear.com/7.x/micah/svg?seed=${randomSeed}` });
                                        }}
                                        className="w-10 h-10 rounded-full border-2 border-dashed border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                                        title="Gerar Novo Avatar"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                </div>
                                
                                {/* Manual Photo URL Input */}
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-700">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Link size={14} className="text-indigo-600 dark:text-indigo-400" /> Link da Foto Customizada
                                    </label>
                                    <input
                                        type="url"
                                        id="avatar-url-input"
                                        value={(formData.avatar && !formData.avatar.includes('dicebear.com')) ? formData.avatar : ''}
                                        onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                                        className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="Cole aqui o link da foto (ex: instagram, google drive, etc)"
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 mt-1.5 ml-1 italic">
                                        Se preenchido, este link substituirá o avatar selecionado acima.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Nome Completo (Para Recibos)</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => {
                                                const newName = e.target.value;
                                                // If nickname is empty or matches the first name of the old name, update it
                                                const oldFirstName = formData.name?.split(' ')[0] || '';
                                                const currentNickname = formData.nickname || '';
                                                
                                                let updatedNickname = currentNickname;
                                                if (!currentNickname || currentNickname === oldFirstName) {
                                                    updatedNickname = newName.split(' ')[0];
                                                }

                                                setFormData({ ...formData, name: newName, nickname: updatedNickname });
                                            }}
                                            className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Ex: Maria Carolina Silva"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                            <Sparkles size={14} /> Apelido (Para a Agenda)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nickname}
                                            onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                            className="w-full bg-indigo-50/30 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Ex: Mari"
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 mt-1.5 ml-1">
                                            Este nome será usado para identificar o profissional na agenda e facilitar a leitura.
                                        </p>
                                    </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Função Principal / Especialidade</label>
                                    <div className="relative">
                                        <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="text"
                                            list="categories-list"
                                            required
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="Ex: Cabeleireira, Manicure, Esteticista..."
                                        />
                                        <datalist id="categories-list">
                                            {uniqueCategories.map(cat => (
                                                <option key={cat} value={cat} />
                                            ))}
                                        </datalist>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1.5 ml-1">
                                            💡 Dica: Use o nome da Categoria do serviço (ex: Cabeleireira) para agrupar melhor na agenda.
                                        </p>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-2 flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" /> Serviços Habilitados</span>
                                        {/* Original Dropdown removed in favor of integrated filter */}
                                    </label>

                                    <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-4">
                                        {/* Search & Select Interface */}
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                {/* Filter Dropdown */}
                                                <div className="relative min-w-[120px]">
                                                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <select
                                                        value={filterCategory}
                                                        onChange={e => setFilterCategory(e.target.value)}
                                                        className="w-full pl-9 pr-8 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 appearance-none cursor-pointer transition-all"
                                                    >
                                                        <option value="">Todas</option>
                                                        {uniqueCategories.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>

                                                {/* Search Input */}
                                                <div className="relative flex-1">
                                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar serviço..."
                                                        className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all placeholder:text-slate-400"
                                                        value={serviceAddSearch}
                                                        onChange={e => setServiceAddSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Bulk Add Button for Filtered Category */}
                                            {filterCategory && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddGroup(filterCategory)}
                                                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Layers size={12} /> Adicionar Todos de {filterCategory}
                                                </button>
                                            )}

                                            {/* Scrollable List of Available Services */}
                                            <div className="max-h-40 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl p-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {availableServices
                                                        .filter(s => !formData.specialties?.includes(s))
                                                        .filter(s => {
                                                            // Filter by Name
                                                            const nameMatch = s.toLowerCase().includes(serviceAddSearch.toLowerCase());
                                                            // Filter by Category
                                                            const serviceObj = services.find(serv => serv.name === s);
                                                            const categoryMatch = filterCategory ? serviceObj?.category === filterCategory : true;

                                                            return nameMatch && categoryMatch;
                                                        })
                                                        .map(spec => (
                                                            <button
                                                                key={spec}
                                                                type="button"
                                                                onClick={() => addSpecialty(spec)}
                                                                className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-zinc-700 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 group"
                                                            >
                                                                <Plus size={12} className="opacity-0 group-hover:opacity-100 -ml-1 transition-opacity" />
                                                                {spec}
                                                            </button>
                                                        ))}
                                                    {/* Empty State Logic Check */}
                                                    {availableServices.filter(s => !formData.specialties?.includes(s) &&
                                                        s.toLowerCase().includes(serviceAddSearch.toLowerCase()) &&
                                                        (filterCategory ? services.find(serv => serv.name === s)?.category === filterCategory : true)
                                                    ).length === 0 && (
                                                            <p className="w-full text-center text-[10px] text-slate-400 py-2 italic">
                                                                Nenhum serviço disponível com este filtro.
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Selecionados ({formData.specialties?.length || 0})</label>
                                            <div className="flex flex-col gap-2">
                                                {formData.specialties && formData.specialties.length > 0 ? formData.specialties.map(spec => {
                                                    const service = services.find(s => s.name === spec);
                                                    const defaultDur = service?.durationMinutes || 30;
                                                    const customDur = formData.customDurations?.[spec];

                                                    return (
                                                        <div key={spec} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2.5 rounded-xl animate-in zoom-in duration-200 shadow-sm">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeSpecialty(spec)}
                                                                    className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-1.5 rounded-lg hover:bg-rose-100 transition-colors flex-shrink-0"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{spec}</span>
                                                            </div>

                                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                                <div className="relative">
                                                                    <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                    <input
                                                                        type="number"
                                                                        placeholder={defaultDur.toString()}
                                                                        value={customDur || ''}
                                                                        onChange={e => {
                                                                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                                                                            const newDurs = { ...(formData.customDurations || {}) };
                                                                            if (val === undefined) delete newDurs[spec];
                                                                            else newDurs[spec] = val;
                                                                            setFormData({ ...formData, customDurations: newDurs });
                                                                        }}
                                                                        className="w-20 pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-lg text-[10px] font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all"
                                                                        title="Duração personalizada (minutos)"
                                                                    />
                                                                </div>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase">min</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }) : (
                                                    <span className="text-sm font-bold text-slate-400 italic py-2">Nenhum serviço vinculado.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1.5 ml-1">Selecione quais serviços esta profissional está apta a realizar.</p>
                                </div>

                                {/* New Birth Date Field */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Data de Nascimento</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="date"
                                            required
                                            value={formData.birthDate || ''}
                                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* WORK DAYS SELECTOR */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-2">Dias de Atendimento (Agenda Aberta)</label>
                                    <div className="flex gap-2">
                                        {weekDays.map(day => {
                                            const isSelected = formData.workDays?.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => toggleWorkDay(day.id)}
                                                    className={`flex-1 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 hover:border-slate-300 dark:hover:border-zinc-600'
                                                        }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">WhatsApp</label>
                                    <div className="relative">
                                        <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all"
                                            placeholder="(11) 9...."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1.5">
                                        % Profissional (Repasse + NFSe)
                                    </label>
                                    <div className="relative">
                                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" />
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="1"
                                            required
                                            value={formData.commissionRate}
                                            onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                                            className="w-full pl-11 pr-4 py-4 bg-indigo-50/50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl text-sm font-black text-indigo-950 dark:text-indigo-300 focus:border-indigo-600 focus:ring-0 outline-none transition-all"
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold text-indigo-600 dark:text-indigo-500 mt-1">
                                        Ex: 0.4 = 40% profissional / 60% salão.
                                    </p>
                                </div>

                                <div className="bg-slate-50 dark:bg-zinc-800 p-5 rounded-[2rem] border-2 border-slate-100 dark:border-zinc-700/50 flex flex-col justify-center">
                                    <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-500" /> Regra de Repasse
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-2 px-3 rounded-xl border border-slate-100 dark:border-zinc-700">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Fechamento</span>
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Quinzenal</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20 p-2 px-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Pagamentos</span>
                                            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-tighter">Dia 05 e Dia 20</span>
                                        </div>
                                    </div>
                                </div>

                                {/* COMMISSION CHANGE REASON (Visible only if rate changed) */}
                                {isCommissionChanged && (
                                    <div className="md:col-span-2 animate-in slide-in-from-top-2">
                                        <label className="block text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <History size={12} /> Motivo da Alteração de Comissão
                                        </label>
                                        <textarea
                                            className="w-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm font-black text-slate-950 dark:text-white focus:border-amber-500 outline-none transition-all placeholder:text-amber-300 resize-none h-20"
                                            placeholder="Ex: Promoção de cargo, reajuste anual..."
                                            value={commissionChangeReason}
                                            onChange={e => setCommissionChangeReason(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest mb-1.5">Chave Pix para Repasses</label>
                                    <div className="relative">
                                        <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                                        <input
                                            type="text"
                                            value={formData.pixKey}
                                            onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-950 dark:text-white focus:border-zinc-950 dark:focus:border-white focus:ring-0 outline-none transition-all placeholder:text-slate-400"
                                            placeholder="CPF, Celular ou E-mail"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FISCAL DATA SECTION - NFSe / Salão Parceiro */}
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5 rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 mt-6">
                                <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Briefcase size={14} /> Dados Fiscais - NFSe (Salão Parceiro SP)
                                </h4>
                                <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-500 mb-4">
                                    Obrigatório para emissão de Nota Fiscal com segregação de valores
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                            CNPJ da Profissional *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.fiscalCnpj || ''}
                                            onChange={e => setFormData({ ...formData, fiscalCnpj: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                            placeholder="XX.XXX.XXX/XXXX-XX"
                                            maxLength={18}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                            Inscrição Municipal
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.fiscalMunicipalRegistration || ''}
                                            onChange={e => setFormData({ ...formData, fiscalMunicipalRegistration: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                            placeholder="Ex: 12345678"
                                        />
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                                Razão Social (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.fiscalSocialName || ''}
                                                onChange={e => setFormData({ ...formData, fiscalSocialName: e.target.value })}
                                                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                                placeholder="Se vazio, usa o nome do perfil"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                                Nome Fantasia (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.fiscalFantasyName || ''}
                                                onChange={e => setFormData({ ...formData, fiscalFantasyName: e.target.value })}
                                                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                                placeholder="Nome comercial da profissional"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                                            💡 O percentual da profissional será o mesmo do campo "% Comissão" acima ({((formData.commissionRate || 0.4) * 100).toFixed(0)}%)
                                        </p>
                                    </div>
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                                DAS Padrão (Mensal)
                                            </label>
                                            <div className="relative group">
                                                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.fiscalDasAmount || ''}
                                                    onChange={e => setFormData({ ...formData, fiscalDasAmount: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                                                Outros Descontos Padrão
                                            </label>
                                            <div className="relative group">
                                                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.fiscalOtherDiscounts || ''}
                                                    onChange={e => setFormData({ ...formData, fiscalOtherDiscounts: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-slate-950 dark:text-white focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.fiscalVerified || false}
                                                    onChange={e => setFormData({ ...formData, fiscalVerified: e.target.checked })}
                                                    className="sr-only"
                                                />
                                                <div className={`w-10 h-6 rounded-full transition-colors ${formData.fiscalVerified ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
                                                <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.fiscalVerified ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest">
                                                    Dados Fiscais Verificados pelo Administrador
                                                </p>
                                                <p className="text-[9px] font-bold text-emerald-700/60 dark:text-emerald-500/60">
                                                    Marque para liberar a emissão de nota fiscal para esta profissional.
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {formData.fiscalCnpj && (
                                    <div className="mt-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                        <p className="text-[9px] font-black text-emerald-800 dark:text-emerald-400 uppercase mb-1">
                                            ✓ Dados fiscais serão salvos para emissão de NFSe
                                        </p>
                                        <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500">
                                            O CNPJ aparecerá na NFSe conforme legislação "Salão Parceiro" de São Paulo
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Display Commission History if available */}
                            {editingProvider && editingProvider.commissionHistory && editingProvider.commissionHistory.length > 0 && (
                                <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-zinc-700 mt-2">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <History size={12} /> Histórico de Comissões
                                    </h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-hide">
                                        {editingProvider.commissionHistory.map((hist, idx) => (
                                            <div key={idx} className="flex justify-between items-start text-xs bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-100 dark:border-zinc-700">
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white">{(hist.rate * 100).toFixed(0)}%</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">{hist.note}</p>
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-400">{new Date(hist.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 pb-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 text-slate-800 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <CircleCheck size={18} /> Salvar Cadastro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INACTIVATION CONFLICT MODAL */}
            {inactivationData && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-amber-400 text-amber-950 flex justify-between items-center flex-shrink-0 gap-4">
                            <h3 className="font-black text-[11px] md:text-sm uppercase tracking-widest flex items-center gap-2 min-w-0">
                                <AlertTriangle size={18} className="flex-shrink-0" />
                                <span className="truncate">Atenção: Agenda Pendente</span>
                            </h3>
                            <button onClick={() => setInactivationData(null)} className="flex-shrink-0"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto bg-white dark:bg-zinc-900">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                O profissional <span className="text-black dark:text-white font-black uppercase">{editingProvider?.name}</span> possui <span className="text-rose-600 dark:text-rose-400 font-black">{inactivationData.appointments.length} agendamentos futuros</span>.
                            </p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">Defina quem assumirá cada atendimento:</p>

                            <div className="space-y-3">
                                {inactivationData.appointments.map(app => (
                                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                                    {new Date(app.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                    <span className="text-slate-400 font-bold">•</span>
                                                    {app.time}
                                                </div>
                                                <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase mt-0.5">{customers.find(c => c.id === app.customerId)?.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate font-medium">{app.combinedServiceNames || 'Serviço'}</div>

                                        <div className="relative mt-1">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 rounded-xl py-2 pl-9 pr-4 text-[10px] font-black uppercase text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 appearance-none transition-all"
                                                value={replacementMap[app.id] || ''}
                                                onChange={e => setReplacementMap(prev => ({ ...prev, [app.id]: e.target.value }))}
                                            >
                                                <option value="">Selecione substituto...</option>
                                                {availableReplacements.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ArrowRight size={12} className="text-slate-300" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex-shrink-0">
                            <button
                                onClick={confirmInactivation}
                                disabled={!isAllReplacementsSelected}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            >
                                {isAllReplacementsSelected ? <CircleCheck size={16} /> : <AlertTriangle size={16} />}
                                Confirmar Substituição e Inativar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
