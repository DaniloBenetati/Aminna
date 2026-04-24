import React, { useState, useMemo, useRef } from 'react';

const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDuration = (start: string, end?: string, defaultDuration: number = 30) => {
    if (!end) return defaultDuration;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
};

const getEffectiveStatus = (a: Appointment, providerId?: string) => {
    // If the overall appointment is finished or canceled, that status should prevail for everyone
    if (a.status === 'Concluído' || a.status === 'Cancelado') return a.status;

    // If providerId is specified, we filter to only consider services belonging to that professional.
    const relevantServices = [
        ...(a.providerId === providerId || !providerId ? [{ 
            status: (a.status === 'Em Andamento' || a.status === 'Em atendimento') && !a.startTimeActual
                ? 'Aguardando' 
                : a.status 
        }] : []),
        ...(a.additionalServices || [])
            .filter(s => s.providerId === providerId || !providerId)
            .map(s => {
                let sStatus = s.status || 'Pendente';
                
                // Inherit arrival/confirmation from global status
                if (a.status === 'Aguardando' && (sStatus === 'Pendente' || sStatus === 'Confirmado')) {
                    sStatus = 'Aguardando';
                } else if (a.status === 'Confirmado' && sStatus === 'Pendente') {
                    sStatus = 'Confirmado';
                }
                
                // Independence logic for "In Progress":
                // If global appt is in progress, but this specific sub-service hasn't started (no startTimeActual),
                // show it as "Aguardando" (Beige/Amber) instead of Green.
                if ((a.status === 'Em Andamento' || a.status === 'Em atendimento') && 
                    (sStatus === 'Pendente' || sStatus === 'Confirmado' || sStatus === 'Aguardando') && 
                    !s.startTimeActual) {
                    sStatus = 'Aguardando';
                }
                
                return { status: sStatus };
            })
    ];
    
    const activeStatuses = relevantServices
        .map(s => s.status)
        .filter(s => s !== 'Cancelado' && s !== 'Concluído');

    // If no active services remain for this context, return the main status
    if (activeStatuses.length === 0) return a.status;

    const anyInProgress = activeStatuses.some(s => s === 'Em Andamento' || s === 'Em atendimento');
    
    // IF we are in a provider-specific context (individual box):
    // If anything for THIS provider is in progress, the box should be green.
    if (providerId && anyInProgress) return 'Em Andamento';

    // Global context or multiple services for same provider:
    // If anything is in progress but others are still waiting, keep it as "Aguardando" 
    // to signal the client is still at the reception/waiting for some part of the service.
    // However, the user explicitly asked for "independent" colors in the grid.
    if (anyInProgress) {
        const anyWaiting = activeStatuses.some(s => s === 'Aguardando' || s === 'Pendente' || s === 'Confirmado');
        return anyWaiting ? 'Aguardando' : 'Em Andamento';
    }

    // Default to the first active status (usually the main appointment status)
    return activeStatuses[0] || 'Pendente';
};
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Search,
    Clock, CircleCheck, AlertCircle, MessageSquare, MessageCircle, Filter, X,
    User, ZoomIn, ZoomOut, Check, Copy, CalendarRange, Loader2, Save, Ban, CircleX, MoreVertical, Trash2, PencilLine, ArrowLeft, ExternalLink, UserPlus, ShieldAlert,
    Wallet, Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ViewState, Appointment, Customer, Service, Campaign, Provider, Lead, PaymentSetting, StockItem, NFSeRecord, FiscalConfig, UserProfile, FinancialConfig } from '../types';
import { ServiceModal } from './ServiceModal';
import {
    DndContext,
    DragEndEvent,
    useDraggable,
    useDroppable,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    closestCorners
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { Avatar } from './Avatar';
import {
    toLocalDateStr,
    parseDateSafe,
    generateFinancialTransactions,
    calculateDailySummary,
    isFirstAppointment
} from '../services/financialService';
import { DailyCloseView } from './DailyCloseView';
import { normalizeSearch } from '../services/utils';
import { Sale, Expense, CommissionSetting } from '../types';

const DroppableCell = ({ id, isBlocked, zoomLevel, children }: { id: string, isBlocked: boolean, zoomLevel: number, children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
        id,
        disabled: isBlocked
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 border-r border-slate-50 dark:border-zinc-800 p-1 relative group transition-all duration-300 ${isBlocked
                ? 'bg-slate-200/80 dark:bg-zinc-900/60 cursor-not-allowed'
                : isOver
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/30'
                    : 'hover:bg-slate-50/50 dark:hover:bg-zinc-800/30'
                }`}
            style={{ width: `${160 * zoomLevel}px` }}
        >
            {children}
        </div>
    );
};

const DraggableAppointment = ({ id, disabled, children, style, className = '' }: { id: string, disabled: boolean, children: React.ReactNode, style?: React.CSSProperties, className?: string }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        disabled
    });

    const dndStyle = {
        ...style,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={dndStyle}
            className={`${className} ${isDragging ? 'z-[999]' : ''}`}
            {...listeners}
            {...attributes}
        >
            {children}
        </div>
    );
};

interface AgendaProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    services: Service[];
    campaigns: Campaign[];
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    paymentSettings: PaymentSetting[];
    commissionSettings?: CommissionSetting[];
    providers: Provider[];
    stock: StockItem[];
    sales: Sale[];
    expenses: Expense[];
    nfseRecords: NFSeRecord[];
    fiscalConfig?: FiscalConfig;
    userProfile?: UserProfile | null;
    financialConfigs: FinancialConfig[];
    setFinancialConfigs: React.Dispatch<React.SetStateAction<FinancialConfig[]>>;
    isLoadingData?: boolean;
    onNavigate?: (view: ViewState, payload?: any) => void;
    partners?: Partner[];
}

export const Agenda: React.FC<AgendaProps> = ({
    customers, setCustomers, appointments, setAppointments, services, campaigns, leads, setLeads, paymentSettings,
    commissionSettings, providers, stock, sales, expenses, nfseRecords, fiscalConfig, userProfile,
    financialConfigs, setFinancialConfigs, isLoadingData, onNavigate, partners = []
}) => {
    // Date & View States
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('day');
    // Helper to get local date object (midnight) to strictly avoid UTC shifts
    const getLocalMidnight = () => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const getLocalDateString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [dateRef, setDateRef] = useState<Date>(() => {
        const saved = localStorage.getItem('agenda_selected_date');
        if (saved) return parseDateSafe(saved);
        return getLocalMidnight();
    });

    const [isReloading, setIsReloading] = useState(false);

    const handleRefresh = (date?: Date) => {
        setIsReloading(true);
        if (date) {
            localStorage.setItem('agenda_selected_date', toLocalDateStr(date));
        } else {
            localStorage.setItem('agenda_selected_date', toLocalDateStr(dateRef));
        }
        // Brief delay to show the "Updating" state
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    // Save dateRef to persistence
    React.useEffect(() => {
        if (dateRef) {
            localStorage.setItem('agenda_selected_date', toLocalDateStr(dateRef));
        }
    }, [dateRef]);

    const [customRange, setCustomRange] = useState({
        start: getLocalDateString(),
        end: getLocalDateString()
    });

    const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
    const [visibleProviderIds, setVisibleProviderIds] = useState<string[]>([]);
    const [visibleServiceIds, setVisibleServiceIds] = useState<string[]>([]);
    const [serviceSidebarSearch, setServiceSidebarSearch] = useState('');
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [blockingData, setBlockingData] = useState<{
        providerId: string;
        name: string;
        reason: string;
        type: 'full' | 'partial';
        startTime: string;
        endTime: string;
    }>({
        providerId: '',
        name: '',
        reason: '',
        type: 'full',
        startTime: '09:00',
        endTime: '18:00'
    });

    const [restrictionAlert, setRestrictionAlert] = useState<{
        open: boolean;
        providerName: string;
        reason: string;
    }>({ open: false, providerName: '', reason: '' });
    const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

    const [sidebarSearch, setSidebarSearch] = useState('');
    // Financial Modal States
    const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
    const [physicalCash, setPhysicalCash] = useState('');
    const [closingObservation, setClosingObservation] = useState('');
    const [closerName, setCloserName] = useState('');

    const transactions = useMemo(() => {
        return generateFinancialTransactions(
            appointments,
            sales,
            expenses,
            services,
            customers,
            providers,
            [] as any, // suppliers
            [] as any, // employees
            commissionSettings || [],
            paymentSettings,
            financialConfigs
        );
    }, [appointments, sales, expenses, services, customers, providers, commissionSettings, paymentSettings, financialConfigs]);

    const dailyTransactions = useMemo(() => {
        const dateStr = toLocalDateStr(dateRef);
        return transactions.filter(t => (t.appointmentDate || t.date) === dateStr);
    }, [transactions, dateRef]);

    const isAlreadyClosed = useMemo(() => {
        const dateStr = toLocalDateStr(dateRef);
        const apps = appointments.filter(a => a.date === dateStr && (a.status === 'Concluído' || a.status === 'Em Andamento' || a.status === 'Em atendimento'));
        if (apps.length === 0) return false;
        return apps.every(a => a.isReconciled === true);
    }, [appointments, dateRef]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // DEBUG: Track selectedProviderId changes
    React.useEffect(() => {
        console.log('���� selectedProviderId changed to:', selectedProviderId, 'Type:', typeof selectedProviderId);
        if (selectedProviderId !== 'all' && !providers.some(p => p.id === selectedProviderId)) {
            console.error('��� INVALID selectedProviderId! Not "all" and not a valid provider ID');
        }
    }, [selectedProviderId, providers]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // Customer Selection State for New Appointments
    const [isCustomerSelectionOpen, setIsCustomerSelectionOpen] = useState(false);
    const [draftAppointment, setDraftAppointment] = useState<Partial<Appointment> | null>(null);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    // Quick Registration State
    const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
    const [quickRegisterData, setQuickRegisterData] = useState<{ name: string, phone: string, cpf?: string }>({ name: '', phone: '', cpf: '' });
    const [isRegisteringClient, setIsRegisteringClient] = useState(false);

    // UI States
    const [zoomLevel, setZoomLevel] = useState(() => Number(localStorage.getItem('agenda_zoom_level')) || 1);
    const [rowHeight, setRowHeight] = useState(() => Number(localStorage.getItem('agenda_row_height')) || 100);
    const [searchTerm, setSearchTerm] = useState('');
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

    // Scroll synchronization refs
    const headerScrollRef = React.useRef<HTMLDivElement>(null);
    const gridScrollRef = React.useRef<HTMLDivElement>(null);
    const bottomScrollRef = React.useRef<HTMLDivElement>(null);
    const isSyncingLeft = React.useRef(false);
    const isSyncingRight = React.useRef(false);
    const [gridScrollWidth, setGridScrollWidth] = useState(0);

    // Sync Bottom Scrollbar
    React.useEffect(() => {
        const gridEl = gridScrollRef.current;
        const bottomEl = bottomScrollRef.current;

        if (!gridEl || !bottomEl) return;

        const handleGridScroll = () => {
            if (!isSyncingLeft.current) {
                isSyncingRight.current = true;
                bottomEl.scrollLeft = gridEl.scrollLeft;
            }
            isSyncingLeft.current = false;
        };

        const handleBottomScroll = () => {
            if (!isSyncingRight.current) {
                isSyncingLeft.current = true;
                gridEl.scrollLeft = bottomEl.scrollLeft;
            }
            isSyncingRight.current = false;
        };

        gridEl.addEventListener('scroll', handleGridScroll);
        bottomEl.addEventListener('scroll', handleBottomScroll);

        // Resize Observer to sync width
        const resizeObserver = new ResizeObserver(() => {
            if (gridEl) setGridScrollWidth(gridEl.scrollWidth);
        });
        resizeObserver.observe(gridEl);
        // Also observe the child to be sure
        if (gridEl.firstElementChild) resizeObserver.observe(gridEl.firstElementChild);


        return () => {
            gridEl.removeEventListener('scroll', handleGridScroll);
            bottomEl.removeEventListener('scroll', handleBottomScroll);
            resizeObserver.disconnect();
        };
    }, []);

    // Persistence Effects
    React.useEffect(() => {
        localStorage.setItem('agenda_zoom_level', zoomLevel.toString());
    }, [zoomLevel]);

    React.useEffect(() => {
        localStorage.setItem('agenda_row_height', rowHeight.toString());
    }, [rowHeight]);

    // Persist View Mode (Day/Month/etc)
    const [isInitialized, setIsInitialized] = useState(false);
    React.useEffect(() => {
        const savedView = localStorage.getItem('agenda_time_view') as 'day' | 'month' | 'year' | 'custom';
        if (savedView) setTimeView(savedView);
        setIsInitialized(true);
    }, []);

    React.useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('agenda_time_view', timeView);
        }
    }, [timeView, isInitialized]);


    const scrollGrid = (direction: 'left' | 'right') => {
        const gridEl = gridScrollRef.current;
        if (!gridEl) return;
        const scrollAmount = 300 * zoomLevel;
        gridEl.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // Helpers
    const formatDate = (date: Date) => formatLocalDate(date);

    const navigateDate = (direction: 'prev' | 'next') => {
        if (timeView === 'custom') return;
        const newDate = new Date(dateRef);
        const modifier = direction === 'next' ? 1 : -1;

        if (timeView === 'day') newDate.setDate(dateRef.getDate() + modifier);
        else if (timeView === 'month') newDate.setMonth(dateRef.getMonth() + modifier);
        else if (timeView === 'year') newDate.setFullYear(dateRef.getFullYear() + modifier);

        setDateRef(newDate);
    };

    const getDateLabel = () => {
        if (timeView === 'custom') return "Per�odo Personalizado";
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return dateRef.getFullYear().toString();
    };

    // Calculate Range for Confirmations & filtering
    const { rangeStart, rangeEnd } = useMemo(() => {
        let start = new Date();
        let end = new Date();

        if (timeView === 'day') {
            start = new Date(dateRef);
            end = new Date(dateRef);
        } else if (timeView === 'month') {
            start = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
            end = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0);
        } else if (timeView === 'year') {
            start = new Date(dateRef.getFullYear(), 0, 1);
            end = new Date(dateRef.getFullYear(), 11, 31);
        } else if (timeView === 'custom') {
            return { rangeStart: customRange.start, rangeEnd: customRange.end };
        }

        return {
            rangeStart: start.toISOString().split('T')[0],
            rangeEnd: end.toISOString().split('T')[0]
        };
    }, [timeView, dateRef, customRange]);

    const activeProviders = useMemo(() => providers.filter(p => p.active), [providers]);

    // Filter Appointments for the GRID (Always shows dateRef day or start of custom range)
    const gridDateStr = timeView === 'custom' ? customRange.start : formatDate(dateRef);

    const gridAppointments = useMemo(() => {
        return appointments.filter(a => {
            const isDate = a.date === gridDateStr;

            // Provider filter: if visibleProviderIds is empty, show ALL providers
            let isProvider: boolean = true;
            if (selectedProviderId !== 'all') {
                // Specific provider selected
                isProvider = String(a.providerId).trim().toLowerCase() === String(selectedProviderId).trim().toLowerCase() ||
                    !!(a.additionalServices?.some(s => String(s.providerId).trim().toLowerCase() === String(selectedProviderId).trim().toLowerCase()));
            } else if (visibleProviderIds.length > 0) {
                // "All" selected but specific providers checked in sidebar
                const normalizedVisibleIds = visibleProviderIds.map(vid => String(vid).trim().toLowerCase());
                isProvider = normalizedVisibleIds.includes(String(a.providerId).trim().toLowerCase()) ||
                    !!(a.additionalServices?.some(s => normalizedVisibleIds.includes(String(s.providerId).trim().toLowerCase())));
            }
            // else: "All" selected and no providers checked = show all (isProvider stays true)

            const isNotCancelled = a.status !== 'Cancelado';
            let isSearchMatch = true;
            if (searchTerm) {
                const customer = customers.find(c => String(c.id).trim().toLowerCase() === String(a.customerId).trim().toLowerCase());
                const search = normalizeSearch(searchTerm);
                isSearchMatch = customer ? normalizeSearch(customer.name).includes(search) : false;
            }

            // Service filter: if visibleServiceIds is empty, show ALL services
            let isService: boolean = true;
            if (visibleServiceIds.length > 0) {
                isService = visibleServiceIds.includes(a.serviceId) ||
                    !!(a.additionalServices?.some(s => visibleServiceIds.includes(s.serviceId)));
            }

            return isDate && isProvider && isNotCancelled && isSearchMatch && isService;
        });
    }, [appointments, gridDateStr, selectedProviderId, visibleProviderIds, searchTerm, customers, visibleServiceIds]);

    const activeVisibileProviders = useMemo(() => {
        const filtered = selectedProviderId === 'all'
            ? activeProviders.filter(p => visibleProviderIds.length === 0 || visibleProviderIds.some(vid => String(vid).trim().toLowerCase() === String(p.id).trim().toLowerCase()))
            : activeProviders.filter(p => String(p.id).trim().toLowerCase() === String(selectedProviderId).trim().toLowerCase());

        return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [activeProviders, selectedProviderId, visibleProviderIds]);

    // Confirmation Logic (Uses Range)
    // Confirmation Logic (Uses Range)
    const generateConfirmationMessage = (customer: Customer, apps: Appointment[]) => {
        const validApps = apps.filter(a => a.status !== 'Concluído' && a.status !== 'Cancelado');
        if (validApps.length === 0) return '';

        const sortedApps = [...validApps].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        const firstName = (customer.name || '').trim().split(' ')[0];

        // Dynamic greeting based on current time
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Olá';
        if (hour >= 5 && hour < 12) greeting = 'Bom dia';
        else if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
        else greeting = 'Boa noite';

        let message = `${greeting}, ${firstName}! 👋\n\n`;
        message += `Sua visita está agendada para:\n\n`;
        message += `*${customer.name}*\n`;

        sortedApps.forEach(a => {
            const dateObj = new Date(a.date + 'T12:00:00');
            const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
            
            message += `${dayOfWeek} ${day} ${month}\n`;

            const prefIds = (customer.assignedProviderIds || (customer.assignedProviderId ? [customer.assignedProviderId] : [])).map(id => String(id).trim().toLowerCase());
            
            const getPrefLabel = (providerId: string) => {
                const pid = String(providerId).trim().toLowerCase();
                const prof = providers.find(p => String(p.id).trim().toLowerCase() === pid);
                const nameToUse = prof ? (prof.nickname || prof.name.split(' ')[0]) : 'Equipe';
                
                if (prefIds.includes(pid)) {
                    return nameToUse;
                }
                return nameToUse; // Return name anyway, but the caller handles the label
            };

            // Lista de todos os serviços (Principal + Adicionais)
            const mainSrv = services.find(s => s.id === a.serviceId);
            const allServices = [
                { 
                    name: mainSrv?.name || 'Serviço', 
                    time: a.time, 
                    providerId: a.providerId 
                },
                ...(a.additionalServices || []).map(extra => ({
                    name: services.find(s => s.id === extra.serviceId)?.name || 'Serviço',
                    time: extra.startTime || a.time,
                    providerId: extra.providerId
                }))
            ];

            allServices.forEach(srvItem => {
                const [h, m] = srvItem.time.split(':');
                const displayTime = m === '00' ? `${h}H` : `${h}H${m}h`;
                
                const pid = String(srvItem.providerId).trim().toLowerCase();
                const prof = providers.find(p => String(p.id).trim().toLowerCase() === pid);
                const isPref = prefIds.includes(pid);
                const nameToUse = (isPref && prof) ? (prof.nickname || prof.name.split(' ')[0]) : 'Equipe';
                
                message += `${displayTime} | ${srvItem.name}\n`;
                if (isPref) {
                    message += `*Agendamento com preferência | ${nameToUse}*\n\n`;
                } else {
                    message += `*Agendamento confirmado | Equipe*\n\n`;
                }
            });
        });

        message += `Confirma ?\n\n`;
        message += `Estamos ansiosos para atendê-la. Se um meteoro cair e não puder vir, fique tranquila e reagendamos`;

        return message;
    };

    const handleSendWhatsApp = (e: React.MouseEvent, appt: Appointment) => {
        e.stopPropagation();
        const customer = customers.find(c => String(c.id).trim().toLowerCase() === String(appt.customerId).trim().toLowerCase());
        if (!customer) return;

        // Message for ONLY this specific appointment
        const msg = generateConfirmationMessage(customer, [appt]);
        if (msg) {
            const phone = customer.phone.replace(/\D/g, '');
            window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
        }
    };

    const whatsappList = useMemo(() => {
        // Filter by RANGE for the list
        const rangeApps = appointments.filter(a =>
            a.date >= rangeStart &&
            a.date <= rangeEnd &&
            a.status !== 'Cancelado' &&
            a.status !== 'Concluído' &&
            (selectedProviderId === 'all' || a.providerId === selectedProviderId)
        );

        const grouped: Record<string, Appointment[]> = {};
        rangeApps.forEach(a => {
            if (!grouped[a.customerId]) grouped[a.customerId] = [];
            grouped[a.customerId].push(a);
        });

        return grouped;
    }, [appointments, rangeStart, rangeEnd, selectedProviderId]);

    const toggleAppointmentStatus = (apptId: string) => {
        setAppointments(prev => prev.map(a => {
            if (a.id === apptId) {
                return { ...a, status: a.status === 'Confirmado' ? 'Pendente' : 'Confirmado' };
            }
            return a;
        }));
    };

    const hours = Array.from({ length: 25 }, (_, i) => {
        const h = Math.floor(i / 2) + 8;
        const m = i % 2 === 0 ? '00' : '30';
        return `${String(h).padStart(2, '0')}:${m}`;
    }); // 08:00 to 20:00 in 30min slots

    const getCellAppointments = (providerId: string, timeSlot: string) => {
        // Parse slot time to get hour and minute
        const [slotHour, slotMin] = timeSlot.split(':').map(Number);
        const slotStartMinutes = slotHour * 60 + slotMin;
        const slotEndMinutes = slotStartMinutes + 30; // Each slot is 30 minutes

        const normalizedProviderId = String(providerId).trim().toLowerCase();

        return gridAppointments.filter(a => {
            // Check main provider
            const [apptHour, apptMin] = a.time.split(':').map(Number);
            const apptMinutes = apptHour * 60 + apptMin;
            const isMainProvider = String(a.providerId).trim().toLowerCase() === normalizedProviderId &&
                apptMinutes >= slotStartMinutes &&
                apptMinutes < slotEndMinutes;

            // Check additional services
            const isExtraProvider = a.additionalServices?.some(s => {
                const extraTime = s.startTime || a.time;
                const [extraHour, extraMin] = extraTime.split(':').map(Number);
                const extraMinutes = extraHour * 60 + extraMin;
                return String(s.providerId).trim().toLowerCase() === normalizedProviderId &&
                    extraMinutes >= slotStartMinutes &&
                    extraMinutes < slotEndMinutes;
            });

            return isMainProvider || isExtraProvider;
        });
    };

    const handleAppointmentClick = (appt: Appointment) => {
        setSelectedAppointment(appt);
        setIsServiceModalOpen(true);
    };

    // QUICK REGISTER NEW CUSTOMER
    const handleQuickRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegisteringClient) return;
        if (!quickRegisterData.name || !quickRegisterData.phone) return;
        setIsRegisteringClient(true);

        // Check for existing customer locally first
        const normalizedPhone = quickRegisterData.phone.replace(/\D/g, '');
        const existingCustomer = customers.find(c => {
            const cPhone = (c.phone || '').replace(/\D/g, '');
            return (normalizedPhone && cPhone === normalizedPhone) || (c.name.toLowerCase() === quickRegisterData.name.toLowerCase());
        });

        if (existingCustomer) {
            if (window.confirm(`⚠️ CLIENTE JÁ CADASTRADA\n\nEncontramos "${existingCustomer.name}" com o mesmo telefone/nome.\n\nDeseja usar o cadastro existente em vez de criar um novo?`)) {
                handleSelectCustomerForAppointment(existingCustomer);
                setIsQuickRegisterOpen(false);
                setQuickRegisterData({ name: '', phone: '', cpf: '' });
                return;
            }
        } else {
            // Secondary check: query DB directly in case local state is out of sync
            const { data: dbCustomer } = await supabase
                .from('customers')
                .select('*')
                .or(`phone.eq.${normalizedPhone},name.eq.${quickRegisterData.name}`)
                .maybeSingle();

            if (dbCustomer) {
                const mappedCustomer: Customer = {
                    id: dbCustomer.id,
                    name: dbCustomer.name,
                    phone: dbCustomer.phone,
                    email: dbCustomer.email,
                    registrationDate: dbCustomer.registration_date,
                    lastVisit: '',
                    totalSpent: 0,
                    status: dbCustomer.status,
                    history: [],
                    preferences: { favoriteServices: [], preferredDays: [], notes: '', restrictions: '' }
                };
                
                if (window.confirm(`⚠️ CLIENTE ENCONTRADA NO BANCO\n\nEncontramos "${dbCustomer.name}" diretamente no banco de dados.\n\nDeseja usar o cadastro existente?`)) {
                    setCustomers(prev => [...prev, mappedCustomer]);
                    handleSelectCustomerForAppointment(mappedCustomer);
                    setIsQuickRegisterOpen(false);
                    setQuickRegisterData({ name: '', phone: '', cpf: '' });
                    return;
                }
            }
        }


        try {
            // 1. Insert into Supabase
            // Note: Assuming 'customers' table auto-generates IDs or we generate one.
            // Using a timestamp-based ID to match local pattern if DB doesn't return one immediately,
            // but ideally we rely on DB return. For now, we'll try to insert and use returned data.

            const newCustomerPayload = {
                name: quickRegisterData.name,
                phone: normalizedPhone,
                cpf: quickRegisterData.cpf,
                registration_date: new Date().toISOString().split('T')[0],
                status: 'Novo',
                total_spent: 0,
                acquisition_channel: 'Agendamento Rápido'
            };

            const { data, error } = await supabase
                .from('customers')
                .insert([newCustomerPayload])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // 2. Update Local State
                const newCustomer: Customer = {
                    id: data.id, // Use ID from Supabase
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    registrationDate: data.registration_date,
                    lastVisit: '',
                    totalSpent: 0,
                    status: 'Novo',
                    history: [],
                    preferences: { favoriteServices: [], preferredDays: [], notes: '', restrictions: '' },
                    acquisitionChannel: 'Agendamento Rápido'
                };

                setCustomers(prev => [...prev, newCustomer]);

                // 3. Select and Proceed
                handleSelectCustomerForAppointment(newCustomer);

                // 4. Reset Form
                setIsQuickRegisterOpen(false);
                setQuickRegisterData({ name: '', phone: '', cpf: '' });
            }

        } catch (error) {
            console.error("Error registering client:", error);
            alert("Erro ao registrar cliente. Tente novamente.");
        } finally {
            setIsRegisteringClient(false);
        }
    };

    // INITIATE NEW APPOINTMENT (Stage 1: Select Customer)
    const handleNewAppointment = (context?: Partial<Appointment>) => {
        // Set draft details based on context (from grid click) or defaults (from header button)
        setDraftAppointment({
            providerId: context?.providerId || (selectedProviderId !== 'all' ? selectedProviderId : activeProviders[0]?.id),
            serviceId: '',
            date: context?.date || gridDateStr,
            time: context?.time || '09:00',
            status: 'Pendente'
        });
        setCustomerSearchTerm('');
        setIsCustomerSelectionOpen(true);
    };

    const normalizeString = (str: any) => {
        if (!str) return '';
        return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    };

    // FINALIZE NEW APPOINTMENT (Stage 2: Create Appointment with Selected Customer)
    const handleSelectCustomerForAppointment = (customer: Customer) => {
        if (!draftAppointment) return;

        if (customer.isBlocked) {
            alert(`⛔ CLIENTE BLOQUEADA\n\nMotivo: ${customer.blockReason || 'Não informado'}\n\nNão é possível realizar agendamentos para clientes bloqueadas.`);
            return;
        }

        // --- DUPLICITY WARNING ---
        const existingToday = appointments.filter(a => {
            if (a.date !== draftAppointment.date || a.status === 'Cancelado') return false;

            // Strict ID Check
            if (String(a.customerId).trim() === String(customer.id).trim()) return true;

            // Deeper Name/Phone Check (to catch duplicate customer records)
            const otherCust = customers.find(c => String(c.id) === String(a.customerId));
            if (otherCust) {
                const sameName = normalizeString(otherCust.name) === normalizeString(customer.name);
                const p1 = (otherCust.phone || '').replace(/\D/g, '');
                const p2 = (customer.phone || '').replace(/\D/g, '');
                const samePhone = (p1 && p2 && p1 === p2);
                if (sameName || samePhone) return true;
            }
            return false;
        });

        if (existingToday.length > 0) {
            const exactMatch = existingToday.find(a => 
                a.time.slice(0, 5) === draftAppointment.time?.slice(0, 5)
            );

            if (exactMatch) {
                alert(`⚠️ OPS! ${customer.name} JÁ POSSUI AGENDAMENTO ÀS ${exactMatch.time}.\n\nPara evitar duplicidade, vamos abrir o registro já existente para que você possa ADICIONAR o novo serviço lá.`);
                setSelectedAppointment(exactMatch);
                setIsCustomerSelectionOpen(false);
                setIsServiceModalOpen(true);
                return;
            }

            const list = existingToday.map(a => `- ${a.time} (${a.status})`).join('\n');
            const confirmMerge = window.confirm(`⚠️ CLIENTE JÁ POSSUI AGENDAMENTO(S) NESTA DATA:\n\n${list}\n\nDeseja abrir o agendamento existente para ADICIONAR este novo serviço? (Recomendado)\n\nClique em CANCELAR se desejar criar outro registro (não recomendado).`);
            
            if (confirmMerge) {
                setSelectedAppointment(existingToday[0]);
                setIsCustomerSelectionOpen(false);
                setIsServiceModalOpen(true);
                return;
            }
        }
        // -------------------------

        // --- LEAD CONVERSION LOGIC ---
        // Check if this customer corresponds to an existing Lead based on Phone
        const canIssueNFSe = !!(fiscalConfig?.autoIssueNfse);
        const salaoParceiroEnabled = !!(fiscalConfig?.salaoParceiroEnabled);
        const matchedLead = leads.find(l => {
            const leadPhone = l.phone.replace(/\D/g, '');
            const customerPhone = customer.phone.replace(/\D/g, '');
            // Check for exact match or suffix match (e.g. 5511999999999 vs 11999999999)
            // Ensure at least 8 digits to avoid matching short substrings
            const isMatch = (leadPhone === customerPhone) ||
                (leadPhone.length >= 8 && customerPhone.length >= 8 && (leadPhone.endsWith(customerPhone) || customerPhone.endsWith(leadPhone)));

            return isMatch && l.status !== 'CONVERTIDO' && l.status !== 'PERDIDO';
        });

        if (matchedLead) {
            const confirmConversion = window.confirm(`⭐ ESTE CLIENTE É UM LEAD ATIVO DO CRM!\n\nEste agendamento irá converter o lead "${matchedLead.name}" e movê-lo para o status "CONVERTIDO".\n\nDeseja confirmar o agendamento e a conversão?`);

            if (!confirmConversion) return;

            // Automatically convert the lead
            setLeads(prev => prev.map(l =>
                l.id === matchedLead.id
                    ? { ...l, status: 'CONVERTIDO', updatedAt: new Date().toISOString() }
                    : l
            ));
        }
        // -----------------------------

        let effectiveProviderId = draftAppointment.providerId!;

        // VALIDATION: Check if provider is restricted
        if (draftAppointment.providerId && customer.restrictedProviderIds?.includes(draftAppointment.providerId)) {
            const restrictedProvider = providers.find(p => p.id === draftAppointment.providerId);
            const providerName = restrictedProvider?.name || 'Profissional';

            // Find reason in history (most recent restriction for this provider)
            const restrictionEntry = customer.history
                .filter(h => h.type === 'RESTRICTION' && h.providerId === draftAppointment.providerId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            const reason = restrictionEntry?.details || "Motivo não registrado.";

            // ALERT THE USER, BUT DO NOT BLOCK
            setRestrictionAlert({ open: true, providerName, reason });

            // Auto-switch to a valid provider (First active provider not in restriction list)
            const fallbackProvider = activeProviders.find(p =>
                p.id !== draftAppointment.providerId &&
                !(customer.restrictedProviderIds || []).includes(p.id)
            );

            if (fallbackProvider) {
                effectiveProviderId = fallbackProvider.id;
            }
        }

        const newAppt: Appointment = {
            id: Date.now().toString(),
            customerId: customer.id,
            providerId: effectiveProviderId,
            serviceId: draftAppointment.serviceId!,
            date: draftAppointment.date!,
            time: draftAppointment.time!,
            status: 'Pendente',
            amount: 0
        };

        setSelectedAppointment(newAppt);
        setIsCustomerSelectionOpen(false);
        setIsServiceModalOpen(true);
    };

    const filteredCustomersForSelection = customers.filter(c => {
        const search = normalizeSearch(customerSearchTerm);
        return normalizeSearch(c.name).includes(search) ||
               c.phone.includes(search);
    });

    const handleBlockProfessional = async (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        const name = provider?.name || 'Profissional';
        const dateLabel = getDateLabel();

        // Check if already blocked (locally or in DB)
        const block = appointments.find(a =>
            a.providerId === providerId &&
            a.date === gridDateStr &&
            a.combinedServiceNames === 'BLOQUEIO_INTERNO'
        );

        if (block) {
            if (window.confirm(`Deseja DESBLOQUEAR a agenda de ${name} para o dia ${dateLabel}?`)) {
                // Optimistic update
                setAppointments(prev => prev.filter(a => a.id !== block.id));

                // Persistence: Delete from DB if it has a real ID
                if (!block.id.startsWith('BLOCK-')) {
                    try {
                        const { error } = await supabase.from('appointments').delete().eq('id', block.id);
                        if (error) throw error;
                    } catch (error) {
                        console.error('Error unblocking provider:', error);
                        alert('Erro ao desbloquear no banco de dados.');
                    }
                }
            }
            return;
        }

        // Open custom block modal instead of prompts
        setBlockingData({
            providerId,
            name,
            reason: 'Motivo pessoal',
            type: 'full',
            startTime: '09:00',
            endTime: '18:00'
        });
        setIsBlockModalOpen(true);
    };

    const handleConfirmBlock = async () => {
        const { providerId, name, reason, type, startTime, endTime } = blockingData;
        const dateLabel = getDateLabel();
        
        setIsSubmittingBlock(true);
        try {
            const actualStartTime = type === 'full' ? '00:00' : startTime;
            const actualEndTime = type === 'full' ? '23:59' : endTime;
            const timeLabel = type === 'full' ? 'o dia todo' : `das ${actualStartTime} às ${actualEndTime}`;

            const tempId = `BLOCK-${providerId}-${gridDateStr}-${actualStartTime.replace(':', '')}`;

            // Local draft for immediate feedback
            const blockAppt: Appointment = {
                id: tempId,
                customerId: 'INTERNAL_BLOCK',
                providerId: providerId,
                serviceId: 'INTERNAL_BLOCK',
                date: gridDateStr,
                time: actualStartTime,
                endTime: actualEndTime,
                status: 'Cancelado',
                combinedServiceNames: 'BLOQUEIO_INTERNO',
                observation: reason,
                amount: 0
            };
            setAppointments(prev => [...prev, blockAppt]);

            const { data, error } = await supabase.from('appointments').insert([{
                customer_id: null,
                provider_id: providerId,
                service_id: null,
                date: gridDateStr,
                time: actualStartTime,
                end_time: actualEndTime,
                status: 'Cancelado',
                combined_service_names: 'BLOQUEIO_INTERNO',
                observation: reason
            }]).select().single();

            if (error) throw error;

            // Sync local state with DB ID
            setAppointments(prev => prev.map(a => a.id === tempId ? {
                ...a,
                id: data.id,
                customerId: data.customer_id || 'INTERNAL_BLOCK'
            } : a));

            setIsBlockModalOpen(false);
        } catch (error) {
            console.error('Error blocking provider:', error);
            alert('Erro ao bloquear no banco de dados.');
        } finally {
            setIsSubmittingBlock(false);
        }
    };

    // DND-KIT HANDLERS
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) return;

        const appointmentId = active.id as string;
        const [targetProviderId, targetTime] = (over.id as string).split('|');

        if (!appointmentId || !targetProviderId || !targetTime) return;

        const appt = appointments.find(a => a.id === appointmentId);
        if (!appt) return;

        if (appt.providerId === targetProviderId && appt.time === targetTime) return;

        const targetProvider = providers.find(p => p.id === targetProviderId);
        const isVacationPeriod = targetProvider?.vacationStart && targetProvider?.vacationEnd &&
            gridDateStr >= targetProvider.vacationStart && gridDateStr <= targetProvider.vacationEnd;
        const isDayOff = targetProvider?.daysOff?.includes(gridDateStr);
        const isOnVacation = isVacationPeriod || isDayOff;

        if (isOnVacation) {
            alert(`⛔ PROFISSIONAL EM FÉRIAS\n\n${targetProvider?.name} está em período de férias nesta data e não pode receber novos agendamentos.`);
            return;
        }

        // Optimistic UI
        const originalAppointments = [...appointments];
        setAppointments(prev => prev.map(a =>
            a.id === appointmentId ? { ...a, providerId: targetProviderId, time: targetTime } : a
        ));

        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    provider_id: targetProviderId,
                    time: targetTime
                })
                .eq('id', appointmentId);

            if (error) {
                if (error.code === '23505') {
                    alert("⚠️ OPS! JÁ EXISTE UM AGENDAMENTO IDÊNTICO.\n\nEste atendimento para a mesma cliente, hora e profissional já existe. Vamos redirecionar você para o agendamento existente para que possa ADICIONAR os serviços lá.");
                    setAppointments(originalAppointments);
                    return;
                }
                throw error;
            }
        } catch (error) {
            console.error("Error moving appointment:", error);
            setAppointments(originalAppointments);
            alert("Erro ao mover atendimento. Revertendo...");
        }
    };

    const MiniCalendar = () => {
        const [viewDate, setViewDate] = useState(new Date(dateRef));
        const month = viewDate.getMonth();
        const year = viewDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            const current = new Date(year, month, d);
            const isSelected = formatDate(current) === formatDate(dateRef);
            days.push(
                <button
                    key={d}
                    onClick={(e) => {
                        // Manual double-click detection to avoid collision with view changes
                        if (e.detail === 2) {
                            handleRefresh(current);
                        } else {
                            setDateRef(current);
                            setTimeView('day');
                        }
                    }}
                    className={`w-6 h-6 flex items-center justify-center text-[8px] font-black rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300'}`}
                >
                    {d}
                </button>
            );
        }

        const navigateMonth = (direction: 'prev' | 'next') => {
            const newView = new Date(viewDate);
            newView.setDate(1); // Reset to 1st to prevent month skipping logic error (e.g. Jan 31 -> Feb)
            newView.setMonth(viewDate.getMonth() + (direction === 'next' ? 1 : -1));
            setViewDate(newView);
        };

        return (
            <div className="p-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{monthName}</span>
                    <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={`${d}-${i}`} className="text-[8px] font-black text-slate-400 uppercase">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };

    const ProviderFilter = () => {
        const filteredProvidersBySearch = activeProviders.filter(p =>
            p.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
            p.specialty.toLowerCase().includes(sidebarSearch.toLowerCase())
        );

        const toggleProvider = (id: string) => {
            console.log('✅ toggleProvider called with ID:', id, 'Type:', typeof id);
            setVisibleProviderIds(prev => {
                const newValue = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
                console.log('✅ visibleProviderIds updated:', prev, '->', newValue);
                return newValue;
            });
        };

        return (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden mt-2 animate-in slide-in-from-bottom-4 duration-500">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-zinc-800">
                    <h3 className="text-[9px] font-black uppercase tracking-widest mb-2 text-slate-900 dark:text-white">Profissionais</h3>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            value={sidebarSearch}
                            onChange={e => setSidebarSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3 scrollbar-hide space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={visibleProviderIds.length > 0 && visibleProviderIds.length === activeProviders.length}
                            onChange={() => setVisibleProviderIds(visibleProviderIds.length === activeProviders.length ? [] : activeProviders.map(p => p.id))}
                            className="w-4 h-4 rounded border-2 border-slate-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Todos</span>
                    </label>

                    <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-zinc-800">
                        {filteredProvidersBySearch.map(p => (
                            <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={visibleProviderIds.includes(p.id)}
                                    onChange={() => toggleProvider(p.id)}
                                    className="w-3.5 h-3.5 rounded border-2 border-slate-200 dark:border-zinc-700 text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors uppercase flex items-center gap-1.5">
                                    {p.name}
                                    {p.vacationStart && p.vacationEnd && gridDateStr >= p.vacationStart && gridDateStr <= p.vacationEnd && (
                                        <span className="bg-amber-400 text-amber-950 text-[7px] font-black px-1 rounded-sm">FÉRIAS</span>
                                    )}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // --- Daily Close Handlers ---
    const handlePrintDailyClose = () => {
        window.print();
    };

    const handleCloseRegister = async () => {
        const dateStr = toLocalDateStr(dateRef);
        
        try {
            // Update appointments for the day to isReconciled = true
            const { error: apptError } = await supabase
                .from('appointments')
                .update({ is_reconciled: true })
                .eq('date', dateStr)
                .in('status', ['Concluído', 'Em Andamento', 'Em atendimento']);

            if (apptError) throw apptError;

            // Update local state immediately for visual feedback
            setAppointments(prev => prev.map(a => 
                a.date === dateStr && (a.status === 'Concluído' || a.status === 'Em Andamento' || a.status === 'Em atendimento')
                    ? { ...a, isReconciled: true }
                    : a
            ));

            setIsFinanceModalOpen(false);
        } catch (error) {
            console.error('Error closing register:', error);
            alert('Erro ao fechar o caixa no servidor. Por favor, tente novamente.');
        }
    };

    const handleReopenRegister = async () => {
        const dateStr = toLocalDateStr(dateRef);
        
        try {
            // Update appointments for the day to isReconciled = false
            const { error: apptError } = await supabase
                .from('appointments')
                .update({ is_reconciled: false })
                .eq('date', dateStr);

            if (apptError) throw apptError;

            // Update local state immediately for visual feedback
            setAppointments(prev => prev.map(a => 
                a.date === dateStr
                    ? { ...a, isReconciled: false }
                    : a
            ));
        } catch (error) {
            console.error('Error reopening register:', error);
            alert('Erro ao reabrir o caixa no servidor. Por favor, tente novamente.');
        }
    };

    const handleShareWhatsappDailyClose = (previewMessage?: string) => {
        if (previewMessage && typeof previewMessage === 'string') {
            const encodedMessage = encodeURIComponent(previewMessage);
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
            return;
        }

        const { totalRevenue, totalServices, totalProducts, totalTips, totalAjustes } = calculateDailySummary(dailyTransactions);
        const dateStr = dateRef.toLocaleDateString('pt-BR');

        // Detailed Breakdown Logic (Same as Print)
        const paymentMethods = dailyTransactions.reduce((acc: any, t) => {
            const method = t.paymentMethod || 'Outros';
            if (!acc[method]) acc[method] = { count: 0, total: 0 };
            acc[method].count += 1;
            acc[method].total += (t.type === 'RECEITA' ? t.amount : -t.amount);
            return acc;
        }, {});

        const groupedProv = dailyTransactions.reduce((acc: Record<string, any>, t) => {
            const pName = t.providerName || 'Não atribuído';
            if (!acc[pName]) acc[pName] = { amount: 0 };
            acc[pName].amount += (t.type === 'RECEITA' ? t.amount : -t.amount);
            return acc;
        }, {});

        // Construct Message using Unicode escapes for safety
        let message = `*AMINNA HOME NAIL GEL*\n`;
        message += `*FECHAMENTO DE CAIXA - ${dateStr}* \uD83D\uDCB0\n\n`;

        message += `*RESUMO GERAL:*\n`;
        message += `\uD83D\uDCC5 Serviços: R$ ${(totalServices + totalTips).toFixed(2)}\n`;
        message += `\uD83D\uDECD️ Produtos: R$ ${totalProducts.toFixed(2)}\n`;
        message += `\uD83D\uDCA0 *FATURAMENTO BRUTO: R$ ${totalRevenue.toFixed(2)}*\n\n`;

        message += `*DETALHAMENTO POR MÉTODO:*\n`;
        Object.entries(paymentMethods).forEach(([method, data]: [string, any]) => {
            message += `\uD83D\uDCB3 ${method} (${data.count}x): R$ ${data.total.toFixed(2)}\n`;
        });
        message += `\n`;

        message += `*EXTRATO POR PROFISSIONAL:*\n`;
        Object.entries(groupedProv).forEach(([pName, pData]: [string, any]) => {
            message += `\uD83D\uDC69\u200D\uD83D\uDCBC ${pName}: R$ ${pData.amount.toFixed(2)}\n`;
        });
        message += `\n`;

        message += `*CONFERÊNCIA:*\n`;
        const systemCash = dailyTransactions.filter(t => t.paymentMethod === 'Dinheiro').reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : -t.amount), 0);
        const phyCash = parseFloat(physicalCash || '0');
        const diff = phyCash - systemCash;

        message += `\uD83D\uDCB5 Sistema (Dinheiro): R$ ${systemCash.toFixed(2)}\n`;
        message += `\uD83D\uDDC4\uFE0F Físico (Gaveta): R$ ${phyCash.toFixed(2)}\n`;
        message += `\uD83D\uDCCA Diferença: R$ ${diff.toFixed(2)} ${diff === 0 ? '(OK)' : ''}\n\n`;

        message += `*Observações:* ${closingObservation || 'Nenhuma'}\n`;
        message += `*Caixa por:* ${closerName || '---'}`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    const ServiceFilter = () => {
        const filteredServicesBySearch = services.filter(s =>
            s.name.toLowerCase().includes(serviceSidebarSearch.toLowerCase()) ||
            s.category?.toLowerCase().includes(serviceSidebarSearch.toLowerCase())
        );

        const toggleService = (id: string) => {
            setVisibleServiceIds(prev =>
                prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
            );
        };

        return (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden mt-2 animate-in slide-in-from-bottom-4 duration-500">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-zinc-800">
                    <h3 className="text-[9px] font-black uppercase tracking-widest mb-2 text-slate-900 dark:text-white">Serviços</h3>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            value={serviceSidebarSearch}
                            onChange={e => setServiceSidebarSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3 scrollbar-hide space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={visibleServiceIds.length > 0 && visibleServiceIds.length === services.length}
                            onChange={() => setVisibleServiceIds(visibleServiceIds.length === services.length ? [] : services.map(s => s.id))}
                            className="w-4 h-4 rounded border-2 border-slate-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Todos</span>
                    </label>

                    <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-zinc-800">
                        {filteredServicesBySearch.map(s => (
                            <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={visibleServiceIds.includes(s.id)}
                                    onChange={() => toggleService(s.id)}
                                    className="w-3.5 h-3.5 rounded border-2 border-slate-200 dark:border-zinc-700 text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors uppercase">{s.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full gap-4 p-4 pb-20 md:pb-0 font-sans">
            {isReloading && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 px-8 py-6 rounded-[2.5rem] shadow-2xl border-2 border-indigo-500 flex flex-col items-center gap-4">
                        <Loader2 size={40} className="text-indigo-600 animate-spin" />
                        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">Atualizando...</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Sincronizando com o banco de dados</p>
                    </div>
                </div>
            )}
            {/* Sidebar (Left) */}
            <div className={`hidden lg:flex flex-col w-52 transition-all duration-300 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-[-110%] opacity-0 absolute left-0'}`}>
                <MiniCalendar />
                <ProviderFilter />
                <ServiceFilter />
            </div>

            <div className="flex-1 flex flex-col space-y-4 min-w-0">
                {/* Header Controls (Date & New) */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => {
                                // On large screens >= 1024px toggle sidebar; on smaller screens (including iPad portrait) open drawer
                                if (window.innerWidth >= 1024) {
                                    setIsSidebarOpen(!isSidebarOpen);
                                } else {
                                    setIsMobileDrawerOpen(true);
                                }
                            }}
                            className={`flex p-3 rounded-full transition-all border shadow-sm ${(isSidebarOpen || isMobileDrawerOpen) ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-900'} ${isSidebarOpen ? 'lg:flex' : ''}`}
                            title="Alternar Filtros"
                        >
                            <Filter size={18} />
                        </button>

                        {/* Date Filters */}
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                            <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                                {(['day', 'month', 'year', 'custom'] as const).map(v => (
                                    <button
                                        key={v}
                                        onClick={(e) => { 
                                            if (e.detail === 2) {
                                                handleRefresh();
                                            } else {
                                                setTimeView(v); 
                                                if (v !== 'custom') setDateRef(new Date()); 
                                            }
                                        }}
                                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        {v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}
                                    </button>
                                ))}
                            </div>

                            {timeView === 'custom' ? (
                                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl w-full md:w-auto">
                                    <CalendarRange size={16} className="text-slate-400" />
                                    <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                                    <span className="text-slate-300">-</span>
                                    <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between md:justify-start">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsMobileDrawerOpen(true)}
                                            className="md:hidden p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 text-slate-500 active:scale-95 transition-all"
                                        >
                                            <Filter size={16} />
                                        </button>
                                        <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                                    </div>
                                    <div 
                                        className="flex flex-col items-center min-w-[140px] cursor-pointer"
                                        onClick={(e) => {
                                            if (e.detail === 2) {
                                                handleRefresh();
                                            }
                                        }}
                                        title="Clique duplo para atualizar"
                                    >
                                        <span className="text-[10px] sm:text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest leading-tight">{getDateLabel()}</span>
                                    </div>
                                    <button onClick={() => navigateDate('next')} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
                                </div>
                            )}
                        </div>

                        {/* Zoom Controls (Available on large screens only) */}
                        <div className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
                            <button
                                onClick={() => setRowHeight(prev => Math.max(40, prev - 10))}
                                className="p-2 hover:bg-white dark:hover:bg-zinc-900 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                title="Diminuir Altura"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <button
                                onClick={() => setRowHeight(prev => Math.min(200, prev + 10))}
                                className="p-2 hover:bg-white dark:hover:bg-zinc-900 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                title="Aumentar Altura"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <div className="h-4 w-px bg-slate-300 dark:bg-zinc-600 mx-1"></div>
                            <button
                                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                                className="p-2 hover:bg-white dark:hover:bg-zinc-900 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                title="Estreitar Colunas"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
                                className="p-2 hover:bg-white dark:hover:bg-zinc-900 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                title="Alargar Colunas"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <div className="h-4 w-px bg-slate-300 dark:bg-zinc-600 mx-1"></div>
                            <button
                                onClick={() => setIsFinanceModalOpen(true)}
                                className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all group"
                                title="Resumo Financeiro do Dia"
                            >
                                <Wallet size={16} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
                        <div className="relative flex-1 md:min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrar cliente..."
                                className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setIsFinanceModalOpen(true)}
                            className="md:hidden flex items-center justify-center bg-white dark:bg-zinc-900 text-emerald-600 p-3 rounded-2xl border-2 border-slate-100 dark:border-zinc-700 shadow-lg active:scale-95 transition-all"
                        >
                            <Wallet size={18} />
                        </button>

                        <button
                            onClick={() => setIsWhatsAppModalOpen(true)}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 sm:px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            <MessageCircle size={16} /> <span className="hidden sm:inline">Confirmações</span>
                        </button>

                        <button
                            onClick={() => handleNewAppointment()}
                            className="flex items-center gap-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-3 sm:px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Novo</span>
                        </button>
                    </div>
                </div>

                {/* Agenda Grid */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col relative transition-colors">

                    {/* Mobile Day List — visible only on < lg (including iPad Portrait) */}
                    {timeView === 'day' && (
                        <div className="lg:hidden flex-1 overflow-y-auto p-3 space-y-4">
                            {activeVisibileProviders.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <CalendarIcon size={40} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-xs font-black uppercase">Nenhum profissional visível</p>
                                </div>
                            ) : activeVisibileProviders.map(p => {
                                const provAppts = gridAppointments
                                    .filter(a => {
                                        const isMain = String(a.providerId).trim().toLowerCase() === String(p.id).trim().toLowerCase();
                                        const isExtra = (a.additionalServices || []).some((s: any) => String(s.providerId).trim().toLowerCase() === String(p.id).trim().toLowerCase());
                                        return isMain || isExtra;
                                    })
                                    .filter(a => a.customerId !== 'INTERNAL_BLOCK')
                                    .sort((a, b) => a.time.localeCompare(b.time));

                                const isVacationPeriod = p.vacationStart && p.vacationEnd && gridDateStr >= p.vacationStart && gridDateStr <= p.vacationEnd;
                                const isDayOff = p.daysOff?.includes(gridDateStr);
                                const isOnVacation = isVacationPeriod || isDayOff;

                                return (
                                    <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                                        {/* Provider header */}
                                        <div className={`flex items-center gap-3 px-4 py-3 ${isOnVacation ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-zinc-800'}`}>
                                            <Avatar src={p.avatar} name={p.name} size="w-8 h-8" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{p.name}</p>
                                                {isOnVacation && (
                                                    <span className="text-[9px] font-black text-amber-600 uppercase">{isDayOff ? 'Em Folga' : 'Em Férias'}</span>
                                                )}
                                            </div>
                                            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black px-2 py-0.5 rounded-full">{provAppts.length}</span>
                                            <button
                                                onClick={() => handleNewAppointment({ providerId: p.id, date: gridDateStr })}
                                                className="p-1.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-lg shadow active:scale-95 transition-all"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        {/* Appointment cards */}
                                        {isOnVacation ? (
                                            <div className="px-4 py-8 text-center bg-amber-50/30 dark:bg-amber-900/5">
                                                <p className="text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest">
                                                    {isDayOff ? 'Folga neste dia' : 'Profissional em férias'}
                                                </p>
                                            </div>
                                        ) : provAppts.length === 0 ? (
                                            <div className="px-4 py-8 text-center bg-slate-50/30 dark:bg-zinc-900/5">
                                                <p className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest text-center">Sem agendamentos</p>
                                            </div>
                                        ) : (
                                            <div className="p-2 space-y-2 bg-slate-50/50 dark:bg-zinc-950/20">
                                                {provAppts.map(appt => {
                                                    const customer = customers.find(c => String(c.id).trim().toLowerCase() === String(appt.customerId).trim().toLowerCase());
                                                    const serviceName = appt.combinedServiceNames || services.find(s => s.id === appt.serviceId)?.name || 'Serviço';
                                                    let localStatus = getEffectiveStatus(appt, p.id);
                                                    const statusColor = (appt.isRemake || appt.paymentMethod === 'Refazer') ? 'bg-fuchsia-500' :
                                                        localStatus === 'Concluído' ? 'bg-[#E66A6E]' :
                                                            (localStatus === 'Em Andamento' || localStatus === 'Em atendimento') ? 'bg-[#22c55e]' :
                                                                localStatus === 'Confirmado' ? 'bg-[#01A4C6]' :
                                                                    localStatus === 'Aguardando' ? 'bg-[#F7E8C9]' :
                                                                        'bg-[#008877]';

                                                    return (
                                                        <button
                                                            key={appt.id}
                                                            onClick={() => handleAppointmentClick(appt)}
                                                            className="w-full text-left p-3.5 flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all"
                                                        >
                                                            <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${statusColor} shadow-lg shadow-${statusColor.split('[')[1]?.split(']')[0] || 'indigo'}/20`} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[12px] font-black text-slate-900 dark:text-white uppercase truncate">{customer?.name || 'Cliente'}</p>
                                                                    {customer?.id && isFirstAppointment(customer.id, gridDateStr, appointments) && (
                                                                        <span className="bg-emerald-600 text-white text-[7px] font-black px-1 rounded-sm uppercase">Novo</span>
                                                                    )}
                                                                    {customer?.isVip && <Sparkles size={10} className="text-amber-500 flex-shrink-0" />}
                                                                </div>
                                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate mt-0.5">{serviceName}</p>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                                <span className="text-[12px] font-black text-slate-900 dark:text-white">{appt.time}</span>
                                                                <span className={`text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter ${statusColor} ${localStatus === 'Aguardando' ? '!text-amber-950' : ''}`}>
                                                                    {(appt.isRemake || appt.paymentMethod === 'Refazer') ? 'REFAZER' : (localStatus === 'Aguardando' ? 'Aguardando Recepção' : localStatus)}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Agenda Content Container — hidden on < lg when in day view (uses list above) */}
                    <div ref={gridScrollRef} className={`flex-1 overflow-auto scrollbar-hide relative ${timeView === 'day' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
                        {/* Day View Grid */}
                        {timeView === 'day' && (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCorners}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="w-fit relative shadow-sm">
                                    {/* Sticky Header Row */}
                                    <div className="flex sticky top-0 z-50 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 transition-colors">
                                        {/* Time Corner (Sticky Top + Sticky Left) */}
                                        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-zinc-800 flex items-center justify-center sticky left-0 z-50 bg-slate-50 dark:bg-zinc-900">
                                            <Clock size={14} className="text-slate-400" />
                                        </div>

                                        {/* Providers Row */}
                                        <div className="flex">
                                            {activeVisibileProviders.map(p => {
                                                const isInternalBlocked = appointments.some(a =>
                                                    a.providerId === p.id &&
                                                    a.date === gridDateStr &&
                                                    a.combinedServiceNames === 'BLOQUEIO_INTERNO'
                                                );
                                                const isVacationPeriod = p.vacationStart && p.vacationEnd &&
                                                    gridDateStr >= p.vacationStart && gridDateStr <= p.vacationEnd;
                                                const isDayOff = p.daysOff?.includes(gridDateStr);
                                                const isOnVacation = isVacationPeriod || isDayOff;

                                                const isBlocked = isInternalBlocked || isOnVacation;

                                                return (
                                                    <div
                                                        key={p.id}
                                                        className={`flex-shrink-0 border-r border-slate-100 dark:border-zinc-800 p-3 text-center transition-all relative group ${isBlocked ? 'bg-slate-200 dark:bg-zinc-800/80 border-slate-300 dark:border-zinc-700' : ''}`}
                                                        style={{ width: `${160 * zoomLevel}px` }}
                                                    >
                                                        <div className="flex justify-center mb-1">
                                                            <Avatar src={p.avatar} name={p.name} size="w-8 h-8" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate flex items-center justify-center gap-1.5">
                                                                {p.nickname || p.name.split(' ')[0]}
                                                                {((p.vacationStart && p.vacationEnd && gridDateStr >= p.vacationStart && gridDateStr <= p.vacationEnd) || p.daysOff?.includes(gridDateStr)) && (
                                                                    <span className="bg-amber-400 text-amber-950 text-[6px] font-black px-1 rounded-sm">
                                                                        {p.daysOff?.includes(gridDateStr) ? 'FOLGA' : 'FÉRIAS'}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>

                                                        {isOnVacation ? (
                                                            <div className="mt-1 flex items-center gap-1 mx-auto px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter bg-amber-400 text-amber-950 shadow-sm">
                                                                <CalendarIcon size={8} /> Em Férias
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleBlockProfessional(p.id); }}
                                                                className={`mt-1 flex items-center gap-1 mx-auto px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter transition-all shadow-sm ${isBlocked
                                                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400'
                                                                    }`}
                                                            >
                                                                {isBlocked ? <Check size={8} /> : <Ban size={8} />}
                                                                {isBlocked ? 'Desbloquear' : 'Bloquear'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Grid Rows */}
                                    <div className="relative">
                                        {hours.map(hour => (
                                            <div
                                                key={hour}
                                                className="flex border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/30 dark:hover:bg-zinc-800/10 transition-colors group/row"
                                                style={{ minHeight: `${rowHeight}px` }}
                                            >
                                                {/* Time Column (Sticky Left) */}
                                                <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 transition-all flex items-center justify-center text-[10px] font-black text-slate-400 sticky left-0 z-40 group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 group-hover/row:bg-white dark:group-hover/row:bg-zinc-900 shadow-sm">
                                                    {hour}
                                                </div>

                                                {/* Provider Columns */}
                                                <div className="flex">
                                                    {activeVisibileProviders.map(p => {
                                                        const isVacationPeriod = p.vacationStart && p.vacationEnd &&
                                                            gridDateStr >= p.vacationStart && gridDateStr <= p.vacationEnd;
                                                        const isDayOff = p.daysOff?.includes(gridDateStr);
                                                        const isOnVacation = isVacationPeriod || isDayOff;
                                                        
                                                        const internalBlocks = appointments.filter(a =>
                                                            a.providerId === p.id &&
                                                            a.date === gridDateStr &&
                                                            a.combinedServiceNames === 'BLOQUEIO_INTERNO'
                                                        );

                                                        const isBlocked = isOnVacation || internalBlocks.some(a => {
                                                            if (!a.endTime || (a.time === '00:00' && a.endTime === '23:59')) return true;
                                                            return hour >= a.time && hour < a.endTime;
                                                        });
                                                        
                                                        const isFullDayBlock = isOnVacation || internalBlocks.some(a => 
                                                            !a.endTime || (a.time === '00:00' && a.endTime === '23:59')
                                                        );

                                                        const slotAppointments = getCellAppointments(p.id, hour).filter(a => a.combinedServiceNames !== 'BLOQUEIO_INTERNO');
                                                        
                                                        return (
                                                            <DroppableCell
                                                                key={`${p.id}-${hour}`}
                                                                id={`${p.id}|${hour}`}
                                                                isBlocked={isBlocked}
                                                                zoomLevel={zoomLevel}
                                                            >
                                                                {isFullDayBlock && hour === '12:00' && (
                                                                    <div className="absolute inset-x-0 top-0 bottom-[-1000px] flex items-start justify-center pt-20 pointer-events-none z-20">
                                                                        <div className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-2 ${isOnVacation ? 'border-amber-400' : 'border-slate-300 dark:border-zinc-700'} px-3 py-1.5 rounded-xl shadow-xl transform -rotate-12 border-dashed`}>
                                                                            <p className={`text-[8px] font-black ${isOnVacation ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400'} uppercase tracking-[0.2em]`}>
                                                                                {isOnVacation ? (isDayOff ? 'Em Folga' : 'Em Férias') : 'Agenda Bloqueada'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Add Button on Hover */}
                                                                {!isBlocked && (
                                                                    <button
                                                                        onClick={() => handleNewAppointment({
                                                                            providerId: p.id,
                                                                            date: gridDateStr,
                                                                            time: hour
                                                                        })}
                                                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center z-0"
                                                                    >
                                                                        <div className="bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 p-1.5 px-3 rounded-full shadow-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2 transform transition-transform hover:scale-110 active:scale-95">
                                                                            <Plus size={14} className="stroke-[3]" />
                                                                            <span className="text-[11px] font-black tracking-tight">{hour}</span>
                                                                        </div>
                                                                    </button>
                                                                )}

                                                                {slotAppointments.map((appt, idx) => {
                                                                    const customer = customers.find(c => String(c.id).trim().toLowerCase() === String(appt.customerId).trim().toLowerCase());
                                                                    const service = services.find(s => s.id === appt.serviceId);

                                                                    let displayServiceName: string = '';
                                                                    let displayTime: string = '';
                                                                    let cardHeight: number = 0;

                                                                    const myServices = [
                                                                        ...(String(appt.providerId).trim().toLowerCase() === String(p.id).trim().toLowerCase() ? [{ srvId: appt.serviceId, time: appt.time, endTime: appt.endTime, status: appt.status }] : []),
                                                                        ...(appt.additionalServices || [])
                                                                            .filter((s: any) => String(s.providerId).trim().toLowerCase() === String(p.id).trim().toLowerCase())
                                                                            .map((s: any) => ({ srvId: s.serviceId, time: s.startTime || appt.time, endTime: s.endTime, status: s.status }))
                                                                    ];

                                                                    if (myServices.length > 0) {
                                                                        const names = myServices.map(ms => services.find(s => s.id === ms.srvId)?.name || 'Serviço').join(' + ');
                                                                        displayServiceName = names;
                                                                        displayTime = myServices[0].time;

                                                                        // Calculate height based on total duration of MY services in this appointment
                                                                        const totalDuration = myServices.reduce((acc, ms) => {
                                                                            const srv = services.find(s => s.id === ms.srvId);
                                                                            return acc + getDuration(ms.time, ms.endTime, srv?.durationMinutes);
                                                                        }, 0);

                                                                        const factor = totalDuration / 30;
                                                                        cardHeight = (rowHeight * factor) - 8;
                                                                    } else {
                                                                        // Should not happen as slotAppointments is already filtered, but for safety:
                                                                        return null;
                                                                    }

                                                                    const [apptHour, apptMin] = displayTime.split(':').map(Number);
                                                                    const [slotHour, slotMin] = hour.split(':').map(Number);
                                                                    const minutesIntoSlot = (apptHour * 60 + apptMin) - (slotHour * 60 + slotMin);
                                                                    const topOffset = (minutesIntoSlot / 30) * rowHeight + 4;

                                                                    // Overlap handling
                                                                    const width = 100 / slotAppointments.length;
                                                                    const left = idx * width;
                                                                    let localStatus = getEffectiveStatus(appt, p.id);
                                                                    const statusColor = (appt.isRemake || appt.paymentMethod === 'Refazer') ? 'bg-fuchsia-500' :
                                                                        localStatus === 'Concluído' ? 'bg-[#E66A6E]' :
                                                                            (localStatus === 'Em Andamento' || localStatus === 'Em atendimento') ? 'bg-[#22c55e]' :
                                                                                localStatus === 'Confirmado' ? 'bg-[#01A4C6]' :
                                                                                    localStatus === 'Aguardando' ? 'bg-[#F7E8C9]' :
                                                                                        'bg-[#008877]';

                                                                    return (
                                                                        <DraggableAppointment
                                                                            key={appt.id}
                                                                            id={appt.id}
                                                                            disabled={appt.status === 'Concluído' || appt.status === 'Cancelado' || appt.customerId === 'INTERNAL_BLOCK'}
                                                                            className="absolute z-10 hover:z-[50] transition-all"
                                                                            style={{
                                                                                height: `${cardHeight}px`,
                                                                                top: `${topOffset}px`,
                                                                                width: `${width}%`,
                                                                                left: `${left}%`,
                                                                                padding: '0 2px'
                                                                            }}
                                                                        >
                                                                            <div
                                                                                onClick={() => handleAppointmentClick(appt)}
                                                                                className={`h-full w-full group p-1.5 rounded-xl border text-left cursor-pointer transition-all active:scale-95 shadow-sm 
                                                                    ${appt.whatsappResponseNeeded ? 'bg-amber-400 border-amber-500 text-amber-950' :
                                                                                    (appt.isRemake || appt.paymentMethod === 'Refazer') ? 'bg-fuchsia-600 border-fuchsia-600 text-white' :
                                                                                        localStatus === 'Concluído' ? 'bg-[#E66A6E] border-[#E66A6E] text-white' :
                                                                                            (localStatus === 'Em Andamento' || localStatus === 'Em atendimento') ? 'bg-[#22c55e] border-[#22c55e] text-white' :
                                                                                                localStatus === 'Confirmado' ? 'bg-[#01A4C6] border-[#01A4C6] text-white' :
                                                                                                    localStatus === 'Aguardando' ? 'bg-[#F7E8C9] border-amber-200 text-amber-950 shadow-amber-100/50' :
                                                                                                        'bg-[#008877] border-[#008877] text-white'
                                                                                    }`}
                                                                            >
                                                                                <div className="flex justify-between items-start">
                                                                                    <div className="flex items-center flex-wrap gap-0.5 max-w-[85%]">
                                                                                        <p className={`text-[10px] font-black uppercase leading-none truncate ${appt.whatsappResponseNeeded || localStatus === 'Aguardando' ? 'text-amber-950' : 'text-white'}`}>
                                                                                            {customer?.name || 'Cliente'}
                                                                                        </p>
                                                                                        {customer?.id && isFirstAppointment(customer.id, gridDateStr, appointments) && (
                                                                                            <span className="bg-white text-indigo-600 text-[7px] font-black px-1 rounded-sm uppercase shadow-sm">Novo</span>
                                                                                        )}
                                                                                        {(customer?.assignedProviderIds && customer.assignedProviderIds.length > 0) && (
                                                                                            <span className="bg-pink-600 text-white text-[7px] font-black px-1 rounded-sm uppercase ml-1">Preferida</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <span className={`text-[8px] font-mono ${appt.whatsappResponseNeeded ? 'text-amber-800' : 'text-white/70'}`}>{displayTime.split(':')[1]}</span>
                                                                                </div>
                                                                                 <div className={`text-[8.5px] font-bold truncate mt-0.5 ${appt.whatsappResponseNeeded || localStatus === 'Aguardando' ? 'text-amber-900/80' : 'text-white/90'}`}>{displayServiceName}</div>

                                                                                {cardHeight > 40 && (
                                                                                    <div className="flex justify-between items-center mt-1.5">
                                                                                        <div className="flex items-center gap-1">
                                                                                             <span className={`w-2 h-2 rounded-full ${appt.whatsappResponseNeeded ? 'bg-amber-950' : (appt.isRemake || appt.paymentMethod === 'Refazer') ? 'bg-white' :
                                                                                                localStatus === 'Confirmado' ? 'bg-[#01A4C6]' :
                                                                                                    (localStatus === 'Em Andamento' || localStatus === 'Em atendimento') ? 'bg-[#22c55e]' :
                                                                                                        localStatus === 'Aguardando' ? 'bg-amber-400' :
                                                                                                            localStatus === 'Concluído' ? 'bg-slate-400' :
                                                                                                                'bg-amber-400'
                                                                                                }`}></span>
                                                                                             <span className={`text-[7.5px] font-black uppercase ${appt.whatsappResponseNeeded || localStatus === 'Aguardando' ? 'text-amber-950/80' : 'text-white/80'}`}>{(appt.isRemake || appt.paymentMethod === 'Refazer') ? 'REFAZER' : (localStatus === 'Aguardando' ? 'Aguardando Recepção' : localStatus)}</span>
                                                                                        </div>
                                                                                        {appt.status === 'Concluído' && (
                                                                                            (() => {
                                                                                                const record = nfseRecords.find(r => r.appointmentId === appt.id);
                                                                                                if (record?.status === 'issued') return <CircleCheck size={10} className="text-emerald-500" />;
                                                                                                return null;
                                                                                            })()
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {/* HOVER TOOLTIP */}
                                                                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none z-[999] top-4 left-full ml-2 w-[420px] bg-white dark:bg-zinc-900 border-2 border-slate-900 dark:border-zinc-700 rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-left-2 duration-200 hidden md:block">
                                                                                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                                                                                        <div className="w-1.5 h-10 rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]"></div>
                                                                                        <div className="flex flex-col">
                                                                                            {customer?.id && isFirstAppointment(customer.id, gridDateStr, appointments) && (
                                                                                                <div className="mb-2">
                                                                                                    <span className="bg-indigo-600 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase shadow-sm">1º Agendamento</span>
                                                                                                </div>
                                                                                            )}
                                                                                            <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">{customer?.name || 'Cliente Desconhecida'}</p>
                                                                                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 uppercase mt-1">
                                                                                                <CalendarIcon size={12} /> {gridDateStr.split('-').reverse().join('/')}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="space-y-4">
                                                                                        {(() => {
                                                                                            const columnProvId = p.id;
                                                                                            const customerApps = gridAppointments
                                                                                                .filter(a => String(a.customerId).trim().toLowerCase() === String(appt.customerId).trim().toLowerCase())
                                                                                                .sort((a, b) => a.time.localeCompare(b.time));

                                                                                            const allItems = customerApps.flatMap(ca => {
                                                                                                const mainSrv = services.find(s => s.id === ca.serviceId);
                                                                                                return [
                                                                                                    {
                                                                                                        ca,
                                                                                                        srvId: ca.serviceId,
                                                                                                        provId: ca.providerId,
                                                                                                        time: ca.time,
                                                                                                        duration: mainSrv?.durationMinutes || 30,
                                                                                                        price: ca.bookedPrice || mainSrv?.price || 0,
                                                                                                        status: ca.status
                                                                                                    },
                                                                                                    ...(ca.additionalServices || []).map((extra: any) => ({
                                                                                                        ca,
                                                                                                        srvId: extra.serviceId,
                                                                                                        provId: extra.providerId,
                                                                                                        time: extra.startTime || ca.time,
                                                                                                        duration: extra.durationMinutes || services.find(s => s.id === extra.serviceId)?.durationMinutes || 30,
                                                                                                        price: extra.price || services.find(s => s.id === extra.serviceId)?.price || 0,
                                                                                                        status: ca.status
                                                                                                    }))
                                                                                                ];
                                                                                            }).filter(item => {
                                                                                                if (!item.provId || !columnProvId) return false;
                                                                                                return String(item.provId).trim().toLowerCase() === String(columnProvId).trim().toLowerCase();
                                                                                            });

                                                                                            return allItems.map((item, idx) => {
                                                                                                const srv = services.find(s => s.id === item.srvId);
                                                                                                const prov = providers.find(p => String(p.id).trim().toLowerCase() === String(item.provId).trim().toLowerCase());
                                                                                                return (
                                                                                                    <div key={`${item.ca.id}-${idx}`} className={`${idx > 0 ? 'pt-4 border-t border-slate-100 dark:border-zinc-800' : ''}`}>
                                                                                                        <div className="flex justify-between items-start mb-1">
                                                                                                            <div className="flex-1">
                                                                                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-tight">{srv?.name || 'Serviço Desconhecido'}</p>
                                                                                                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                                                                                                                    {(typeof item.time === 'string' ? item.time.slice(0, 5) : item.time)} • {item.duration} min
                                                                                                                </p>
                                                                                                            </div>
                                                                                                            <div className="text-right">
                                                                                                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{prov?.name || 'Profissional'}</p>
                                                                                                                <p className="text-[11px] font-black text-slate-900 dark:text-white">R$ {item.price.toFixed(0)}</p>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <div className="flex justify-between items-center mt-1">
                                                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                                                item.ca.whatsappResponseNeeded ? 'bg-amber-400 text-amber-950 border border-amber-500' :
                                                                                (item.ca.isRemake || item.ca.paymentMethod === 'Refazer') ? 'bg-fuchsia-600 text-white' :
                                                                                item.status === 'Confirmado' ? 'bg-[#01A4C6] text-white' :
                                                                                (item.status === 'Em Andamento' || item.status === 'Em atendimento') ? (getEffectiveStatus(item.ca) === 'Em Andamento' ? 'bg-[#22c55e] text-white' : 'bg-[#F7E8C9] text-amber-950 border border-amber-200') :
                                                                                item.status === 'Aguardando' ? 'bg-[#F7E8C9] text-amber-950 border border-amber-200' :
                                                                                item.status === 'Concluído' ? 'bg-[#E66A6E] text-white' :
                                                                                'bg-[#008877] text-white'
                                                                            }`}>
                                                                                                                {(item.ca.isRemake || item.ca.paymentMethod === 'Refazer') ? 'REFAZER' : (item.status === 'Aguardando' ? 'Aguardando Recepção' : item.status)}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            {item.ca.observation && (
                                                                                                                <div className="mt-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700">
                                                                                                                    <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Justificativa:</p>
                                                                                                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight whitespace-pre-wrap">
                                                                                                                        {item.ca.observation}
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            )}
                                                                                                    </div>
                                                                                                );
                                                                                            });
                                                                                        })()}
                                                                                    </div>

                                                                                    <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                                                                                        <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-tighter">Total no dia</p>
                                                                                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">
                                                                                            R$ {gridAppointments
                                                                                                .filter(a => String(a.customerId).trim().toLowerCase() === String(appt.customerId).trim().toLowerCase())
                                                                                                .reduce((acc, a) => {
                                                                                                    let totalForApp = 0;
                                                                                                    if (a.providerId && String(a.providerId).trim().toLowerCase() === String(p.id).trim().toLowerCase()) {
                                                                                                        totalForApp += a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0;
                                                                                                    }
                                                                                                    totalForApp += (a.additionalServices || [])
                                                                                                        .filter((e: any) => e.providerId && String(e.providerId).trim().toLowerCase() === String(p.id).trim().toLowerCase())
                                                                                                        .reduce((eAcc: number, e: any) => eAcc + (e.price || services.find(s => s.id === e.serviceId)?.price || 0), 0);
                                                                                                    return acc + totalForApp;
                                                                                                }, 0)
                                                                                                .toFixed(0)}
                                                                                        </p>
                                                                                    </div>

                                                                                    <div className="mt-1 flex justify-between items-center opacity-60">
                                                                                        <p className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-tighter">Total Cliente (Geral)</p>
                                                                                        <p className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-tighter">
                                                                                            R$ {gridAppointments
                                                                                                .filter(a => String(a.customerId).trim().toLowerCase() === String(appt.customerId).trim().toLowerCase())
                                                                                                .reduce((acc, a) => {
                                                                                                    const mainPrice = a.bookedPrice || services.find(s => s.id === a.serviceId)?.price || 0;
                                                                                                    const extrasPrice = (a.additionalServices || []).reduce((eAcc: number, e: any) =>
                                                                                                        eAcc + (e.price || services.find(s => s.id === e.serviceId)?.price || 0), 0
                                                                                                    );
                                                                                                    return acc + mainPrice + extrasPrice;
                                                                                                }, 0)
                                                                                                .toFixed(0)}
                                                                                        </p>
                                                                                    </div>

                                                                                    {(customer?.assignedProviderIds && customer.assignedProviderIds.length > 0) && (
                                                                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                                                                                            <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-tighter mb-2">Profissionais Preferidos</p>
                                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                                {customer.assignedProviderIds.map(pid => {
                                                                                                    const p = providers.find(pr => pr.id === pid);
                                                                                                    if (!p) return null;
                                                                                                    return (
                                                                                                        <div key={pid} className="px-3 py-1 bg-pink-600 rounded-full shadow-sm" title={p.name}>
                                                                                                            <span className="text-[9px] font-black uppercase text-white">{p.name.split(' ')[0]}</span>
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </DraggableAppointment>
                                                                    );
                                                                })}
                                                            </DroppableCell>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <DragOverlay modifiers={[restrictToWindowEdges]}>
                                        {activeDragId ? (
                                            <div className="w-40 h-20 bg-indigo-600/20 border-2 border-indigo-600 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Movendo...</p>
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </div>
                            </DndContext>
                        )}

                        {/* Month View Grid */}
                        {timeView === 'month' && (
                            <div className="flex-1 p-2 md:p-6 overflow-y-auto scrollbar-hide">
                                <div className="grid grid-cols-7 gap-0.5 md:gap-4 h-full min-h-[500px]">
                                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                                        <div key={i} className="text-center font-black text-slate-400 uppercase text-[9px] md:text-xs mb-1 md:mb-2">
                                            <span className="hidden md:inline">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i]}</span>
                                            <span className="md:hidden">{day}</span>
                                        </div>
                                    ))}
                                    {(() => {
                                        const year = dateRef.getFullYear();
                                        const month = dateRef.getMonth();
                                        const firstDay = new Date(year, month, 1).getDay();
                                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                                        const days = [];

                                        // Empty slots for previous month
                                        for (let i = 0; i < firstDay; i++) {
                                            days.push(<div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-zinc-800/30 rounded-2xl border border-transparent"></div>);
                                        }

                                        // Days of month
                                        for (let day = 1; day <= daysInMonth; day++) {
                                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const dayApps = appointments.filter(a =>
                                                a.date === dateStr &&
                                                a.status !== 'Cancelado' &&
                                                (selectedProviderId === 'all' || a.providerId === selectedProviderId)
                                            );

                                            const isToday = formatLocalDate(new Date()) === dateStr;

                                            days.push(
                                                <div
                                                    key={day}
                                                    onClick={(e) => {
                                                        if (e.detail === 2) {
                                                            handleRefresh(new Date(year, month, day));
                                                        } else {
                                                            setDateRef(new Date(year, month, day));
                                                            setTimeView('day');
                                                        }
                                                    }}
                                                    className={`relative group bg-white dark:bg-zinc-900 border ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'} rounded-lg md:rounded-2xl p-1 md:p-2 transition-all cursor-pointer hover:shadow-md flex flex-col gap-0.5 md:gap-1 min-h-[50px] md:min-h-[80px]`}
                                                >
                                                    <span className={`text-[9px] md:text-xs font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>

                                                    <div className="flex-1 flex flex-col gap-0.5">
                                                        {dayApps.slice(0, 3).map(app => (
                                                            <div key={app.id} className={`w-full h-1 md:h-1.5 rounded-full ${app.status === 'Confirmado' ? 'bg-[#01A4C6]' : app.status === 'Aguardando' ? 'bg-[#F7E8C9]' : app.status === 'Concluído' ? 'bg-slate-400' : 'bg-amber-400'}`} title={`${app.time} - ${services.find(s => s.id === app.serviceId)?.name}`}></div>
                                                        ))}
                                                        {dayApps.length > 3 && (
                                                            <span className="text-[8px] md:text-[9px] font-bold text-slate-400 text-center">+{dayApps.length - 3}</span>
                                                        )}
                                                    </div>

                                                    {dayApps.length > 0 && (
                                                        <div className="absolute top-2 right-2 text-[9px] font-black text-slate-400">
                                                            {dayApps.length}
                                                        </div>
                                                    )}

                                                    {/* Hover Details Overlay */}
                                                    {dayApps.length > 0 && (
                                                        <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-[150] bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900/95 dark:bg-black/95 backdrop-blur-md border border-slate-700 rounded-3xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200 hidden md:block">
                                                            <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                                                                <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{dayApps.length} Atendimentos</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                <span className="bg-amber-400 text-amber-950 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">{dayApps.filter(a => a.status === 'Pendente').length} Pendentes</span>
                                                                <span className="bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">{dayApps.filter(a => a.status === 'Concluído').length} Feitos</span>
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-3">
                                                                {dayApps.sort((a, b) => a.time.localeCompare(b.time)).map(app => {
                                                                    const cust = customers.find(c => c.id === app.customerId);
                                                                    const mainSrv = services.find(s => s.id === app.serviceId);
                                                                    const price = app.bookedPrice || mainSrv?.price || 0;
                                                                    const items = [
                                                                        { srvId: app.serviceId, provId: app.providerId, srvName: mainSrv?.name },
                                                                        ...(app.additionalServices || []).map((extra: any) => ({
                                                                            srvId: extra.serviceId,
                                                                            provId: extra.providerId,
                                                                            srvName: services.find(s => s.id === extra.serviceId)?.name
                                                                        }))
                                                                    ];

                                                                    return (
                                                                        <div key={app.id} className="flex flex-col gap-0.5 border-l-2 border-indigo-500 pl-3 py-0.5">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{app.time}</span>
                                                                                <span className="text-[9px] font-black text-emerald-400">R$ {price.toFixed(0)}</span>
                                                                                <span className={`w-2 h-2 rounded-full ${app.status === 'Confirmado' ? 'bg-[#01A4C6]' : app.status === 'Aguardando' ? 'bg-[#F7E8C9]' : app.status === 'Concluído' ? 'bg-slate-500' : 'bg-amber-400'}`}></span>
                                                                            </div>
                                                                            <p className="text-[11px] font-black text-white uppercase truncate">{cust?.name.split(' ')[0]}</p>
                                                                            <div className="space-y-0.5">
                                                                                {items.map((item, itemIdx) => (
                                                                                    <div key={itemIdx} className="flex items-center gap-1.5">
                                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase truncate flex-1">{item.srvName}</p>
                                                                                        <span className="text-[8px] font-black text-indigo-300 uppercase truncate">[{providers.find(p => p.id === item.provId)?.name.split(' ')[0]}]</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return days;
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Annual View Grid */}
                        {timeView === 'year' && (
                            <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-slate-50/30 dark:bg-zinc-950/20">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const year = dateRef.getFullYear();
                                        const monthDate = new Date(year, i, 1);
                                        const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'long' });

                                        const monthApps = appointments.filter(a => {
                                            const appDate = a.date.split('-');
                                            return parseInt(appDate[0]) === year && parseInt(appDate[1]) === (i + 1) && a.status !== 'Cancelado' && (selectedProviderId === 'all' || a.providerId === selectedProviderId);
                                        });

                                        const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === year;

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    const newDate = new Date(dateRef);
                                                    newDate.setMonth(i);
                                                    setDateRef(newDate);
                                                    setTimeView('month');
                                                }}
                                                className={`bg-white dark:bg-zinc-900 border ${isCurrentMonth ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-zinc-800'} rounded-3xl p-5 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all group flex flex-col justify-between min-h-[160px]`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">{year}</h4>
                                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{monthName}</h3>
                                                    </div>
                                                    {isCurrentMonth && (
                                                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">Atual</span>
                                                    )}
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-end justify-between">
                                                        <div className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter">{monthApps.length}</div>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Atendimentos</div>
                                                    </div>

                                                    <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                            style={{ width: `${Math.min(100, (monthApps.length / 50) * 100)}%` }}
                                                        ></div>
                                                    </div>

                                                    <div className="flex justify-between items-center text-[8px] font-bold uppercase text-slate-400">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                            <span>{monthApps.filter(a => a.status === 'Concluído').length} Feitos</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                                            <span>{monthApps.filter(a => a.status === 'Confirmado' || a.status === 'Pendente').length} Agendados</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Synchronized Bottom Scrollbar */}
                    <div
                        ref={bottomScrollRef}
                        className="absolute bottom-0 left-0 right-0 h-3 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 overflow-x-auto z-[40]"
                    >
                        <div style={{ width: `${gridScrollWidth}px`, height: '1px' }}></div>
                    </div>
                </div>
            </div>

            {/* ============================================================
                MOBILE SIDEBAR BOTTOM DRAWER
                Shown only on < lg when isMobileDrawerOpen is true.
            ============================================================ */}
            {isMobileDrawerOpen && (
                <div className="lg:hidden fixed inset-0 z-[200] flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsMobileDrawerOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="relative bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
                        </div>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-800">
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                <Filter size={14} className="text-indigo-600" /> Filtros
                            </h2>
                            <button
                                onClick={() => setIsMobileDrawerOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {/* Content — reuse the same sidebar sub-components */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <MiniCalendar />
                            <ProviderFilter />
                            <ServiceFilter />
                        </div>
                        {/* Apply button */}
                        <div className="p-4 border-t border-slate-100 dark:border-zinc-800">
                            <button
                                onClick={() => setIsMobileDrawerOpen(false)}
                                className="w-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOMER SELECTION MODAL */}
            {
                isCustomerSelectionOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col max-h-[80vh]">
                            <div className="px-6 py-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center flex-shrink-0">
                                <h3 className="font-black text-base uppercase tracking-widest flex items-center gap-2">
                                    <User size={18} /> Selecione a Cliente
                                </h3>
                                <button onClick={() => setIsCustomerSelectionOpen(false)} className="text-white hover:text-slate-300"><X size={24} /></button>
                            </div>

                            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Buscar por nome ou telefone..."
                                        className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 bg-white dark:bg-zinc-900 uppercase placeholder:text-slate-400"
                                        value={customerSearchTerm}
                                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Quick Register Toggle / Form */}
                            {isQuickRegisterOpen ? (
                                <div className="p-4 bg-indigo-50 dark:bg-zinc-900 border-b border-indigo-100 dark:border-zinc-800 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-black text-xs uppercase text-indigo-900 dark:text-indigo-400">Novo Cadastro R�pido</h4>
                                        <button onClick={() => setIsQuickRegisterOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-bold uppercase">Cancelar</button>
                                    </div>
                                    <form onSubmit={handleQuickRegister} className="flex flex-col gap-3">
                                        <input
                                            type="text"
                                            placeholder="Nome Completo"
                                            className="w-full px-3 py-2 rounded-xl border border-indigo-100 dark:border-zinc-700 text-xs font-bold focus:outline-none focus:border-indigo-500 uppercase text-slate-900 dark:text-white bg-white dark:bg-zinc-800"
                                            value={quickRegisterData.name}
                                            onChange={e => setQuickRegisterData({ ...quickRegisterData, name: e.target.value })}
                                            autoFocus
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Telefone / WhatsApp"
                                            className="w-full px-3 py-2 rounded-xl border border-indigo-100 dark:border-zinc-700 text-xs font-bold focus:outline-none focus:border-indigo-500 uppercase text-slate-900 dark:text-white bg-white dark:bg-zinc-800"
                                            value={quickRegisterData.phone}
                                            onChange={e => setQuickRegisterData({ ...quickRegisterData, phone: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="CPF (Opcional)"
                                            className="w-full px-3 py-2 rounded-xl border border-indigo-100 dark:border-zinc-700 text-xs font-bold focus:outline-none focus:border-indigo-500 uppercase text-slate-900 dark:text-white bg-white dark:bg-zinc-800"
                                            value={quickRegisterData.cpf || ''}
                                            onChange={e => setQuickRegisterData({ ...quickRegisterData, cpf: e.target.value })}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!quickRegisterData.name || !quickRegisterData.phone || isRegisteringClient}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isRegisteringClient ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isRegisteringClient ? 'Salvando...' : 'Salvar e Agendar'}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="p-2 bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setIsQuickRegisterOpen(true);
                                            if (customerSearchTerm && isNaN(Number(customerSearchTerm))) {
                                                setQuickRegisterData(prev => ({ ...prev, name: customerSearchTerm }));
                                            }
                                        }}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus size={12} /> Cadastrar Nova Cliente
                                    </button>
                                </div>
                            )}

                            <div className={`flex-1 overflow-y-auto p-2 scrollbar-hide bg-white dark:bg-zinc-900 ${isQuickRegisterOpen ? 'opacity-50 pointer-events-none' : ''}`}>
                                {filteredCustomersForSelection.length > 0 ? (
                                    filteredCustomersForSelection.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleSelectCustomerForAppointment(c)}
                                            className="w-full text-left p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all border-b border-slate-50 dark:border-zinc-800 last:border-none flex items-center justify-between group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-black uppercase text-sm truncate ${c.isBlocked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{c.name}</p>
                                                    {c.isBlocked && <Ban size={14} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />}
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{c.phone}</p>
                                                {c.isBlocked && <p className="text-[9px] font-black text-rose-500 uppercase mt-0.5">BLOQUEADA: {c.blockReason || 'SEM MOTIVO'}</p>}
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${c.isBlocked ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-300' : 'bg-slate-100 dark:bg-zinc-800 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 text-slate-400 dark:text-slate-500 group-hover:text-indigo-700 dark:group-hover:text-white'}`}>
                                                {c.isBlocked ? <CircleX size={16} /> : <Plus size={16} />}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-400 dark:text-slate-600">
                                        <User size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-black uppercase">Nenhuma cliente encontrada</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* WhatsApp Confirmations Modal with Copy Option */}
            {
                isWhatsAppModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-slate-100 dark:bg-zinc-900 rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 flex flex-col max-h-[85vh]">
                            <div className="px-6 py-4 bg-slate-950 dark:bg-black text-white flex justify-between items-center flex-shrink-0">
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                        <MessageCircle size={18} className="text-emerald-400" /> Confirma��es
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">
                                        {new Date(rangeStart + 'T12:00:00').toLocaleDateString('pt-BR')} at� {new Date(rangeEnd + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <button onClick={() => setIsWhatsAppModalOpen(false)} className="text-white hover:text-slate-300"><X size={24} /></button>
                            </div>

                            <div className="p-4 overflow-y-auto space-y-4 flex-1">
                                {Object.keys(whatsappList).length > 0 ? Object.entries(whatsappList).map(([customerId, custApps]) => {
                                    const customer = customers.find(c => c.id === customerId);
                                    if (!customer) return null;
                                    const sortedApps = (custApps as Appointment[]).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

                                    return (
                                        <div key={customerId} className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-700">
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs mb-2">{customer.name}</h4>
                                            <div className="space-y-2 mb-4">
                                                {sortedApps.map(app => (
                                                    <div key={app.id} className="flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-xl border border-slate-100 dark:border-zinc-700">
                                                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase flex items-center gap-1.5">
                                                            <span className="text-slate-900 dark:text-white font-black">{new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {app.time}</span>
                                                            - {app.combinedServiceNames || services.find(s => s.id === app.serviceId)?.name}
                                                        </div>
                                                        <button
                                                            onClick={() => toggleAppointmentStatus(app.id)}
                                                            className={`w-1.5 h-6 rounded-full transition-all ${app.status === 'Confirmado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-400 hover:bg-emerald-400'}`}
                                                            title={app.status === 'Confirmado' ? 'Confirmado' : 'Pendente'}
                                                        ></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const msg = generateConfirmationMessage(customer, sortedApps);
                                                        navigator.clipboard.writeText(msg).then(() => alert('Mensagem copiada!'));
                                                    }}
                                                    className="flex-1 py-2 bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-zinc-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                >
                                                    <Copy size={14} /> Copiar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const msg = generateConfirmationMessage(customer, sortedApps);
                                                        const phone = customer.phone.replace(/\D/g, '');
                                                        window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                                    }}
                                                    className="flex-[2] py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                                                >
                                                    <MessageCircle size={14} /> Enviar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-10 text-slate-400 dark:text-slate-600">
                                        <CircleCheck size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-black uppercase">Nenhum agendamento pendente/confirmado no per�odo</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal */}
            {
                isServiceModalOpen && selectedAppointment && (
                    <ServiceModal
                        appointment={selectedAppointment}
                        allAppointments={appointments}
                        customer={customers.find(c => c.id === selectedAppointment.customerId) || customers[0]}
                        onClose={() => { setIsServiceModalOpen(false); setSelectedAppointment(null); }}
                        onUpdateAppointments={setAppointments}
                        onUpdateCustomers={setCustomers}
                        onSelectAppointment={(app) => setSelectedAppointment(app)}
                        services={services}
                        campaigns={campaigns}
                        source="AGENDA"
                        paymentSettings={paymentSettings}
                        providers={providers}
                        stock={stock}
                        customers={customers}
                        onNavigate={onNavigate}
                        allSales={sales}
                        partners={partners}
                    />
                )
            }
            {/* Finance Modal */}
            {
                isFinanceModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700 modal-print-content">
                            <div className="px-6 py-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center">
                                <div className="flex items-center gap-6">
                                    <h3 className="font-black text-base uppercase tracking-widest flex items-center gap-2">
                                        <Wallet size={18} className="text-emerald-400" /> Resumo Financeiro - {dateRef.toLocaleDateString('pt-BR')}
                                    </h3>

                                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 ml-4">
                                        <button
                                            onClick={() => {
                                                const newDate = new Date(dateRef);
                                                newDate.setDate(dateRef.getDate() - 1);
                                                setDateRef(newDate);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-xl transition-all active:scale-90 text-white/70 hover:text-white"
                                            title="Dia Anterior"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="w-px h-4 bg-white/10 mx-1" />
                                        <button
                                            onClick={() => {
                                                const newDate = new Date(dateRef);
                                                newDate.setDate(dateRef.getDate() + 1);
                                                setDateRef(newDate);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-xl transition-all active:scale-90 text-white/70 hover:text-white"
                                            title="Próximo Dia"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => setIsFinanceModalOpen(false)} className="text-white hover:text-slate-300 transition-colors"><X size={24} /></button>
                            </div>
                            <div className="p-0 max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
                                <DailyCloseView
                                    transactions={dailyTransactions}
                                    physicalCash={physicalCash}
                                    setPhysicalCash={setPhysicalCash}
                                    closingObservation={closingObservation}
                                    setClosingObservation={setClosingObservation}
                                    closerName={closerName}
                                    setCloserName={setCloserName}
                                    date={dateRef}
                                    appointments={appointments}
                                    services={services}
                                    onPrint={handlePrintDailyClose}
                                    onCloseRegister={handleCloseRegister}
                                    onShareWhatsapp={handleShareWhatsappDailyClose}
                                    isAlreadyClosed={isAlreadyClosed}
                                    canReopen={userProfile?.role === 'admin'}
                                    onReopenRegister={handleReopenRegister}
                                />
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Block Provider Modal */}
            {isBlockModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border-2 border-slate-900 dark:border-zinc-700">
                        <div className="px-6 py-5 bg-slate-900 dark:bg-black text-white flex justify-between items-center">
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                <Ban size={18} className="text-rose-500" /> Bloquear Agenda
                            </h3>
                            <button onClick={() => setIsBlockModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Profissional</label>
                                <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-slate-100 dark:border-zinc-800 text-sm font-black text-slate-900 dark:text-white uppercase">
                                    {blockingData.name}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Motivo do Bloqueio</label>
                                <select
                                    value={blockingData.reason}
                                    onChange={(e) => setBlockingData({ ...blockingData, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-[11px] font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 uppercase transition-all"
                                >
                                    {["Doença", "Falta sem aviso", "Férias", "Motivo pessoal", "Treinamento", "Outros"].map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Bloqueio</label>
                                <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border-2 border-slate-200 dark:border-zinc-800">
                                    <button
                                        onClick={() => setBlockingData({ ...blockingData, type: 'full' })}
                                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${blockingData.type === 'full' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        Dia Inteiro
                                    </button>
                                    <button
                                        onClick={() => setBlockingData({ ...blockingData, type: 'partial' })}
                                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${blockingData.type === 'partial' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        Parcial
                                    </button>
                                </div>
                            </div>

                            {blockingData.type === 'partial' && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hora Início</label>
                                        <input
                                            type="time"
                                            value={blockingData.startTime}
                                            onChange={(e) => setBlockingData({ ...blockingData, startTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hora Fim</label>
                                        <input
                                            type="time"
                                            value={blockingData.endTime}
                                            onChange={(e) => setBlockingData({ ...blockingData, endTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    onClick={handleConfirmBlock}
                                    disabled={isSubmittingBlock}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmittingBlock ? <Loader2 className="animate-spin" size={18} /> : <CircleCheck size={18} />}
                                    {isSubmittingBlock ? 'Salvando...' : 'Confirmar Bloqueio'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Restriction Alert Modal */}
            {restrictionAlert.open && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-white/20 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldAlert size={40} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            
                            <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tighter mb-2">
                                Restrição Detectada
                            </h3>
                            
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-6">
                                Profissional: <span className="text-rose-600 dark:text-rose-400 font-black">{restrictionAlert.providerName}</span>
                            </p>
                            
                            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-100 dark:border-zinc-800 mb-6">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo da Restrição:</p>
                                <p className="text-xs font-black text-slate-800 dark:text-slate-200 italic leading-relaxed">
                                    "{restrictionAlert.reason}"
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2 justify-center py-3 px-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50 mb-8">
                                <Sparkles size={14} className="text-emerald-600" />
                                <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest text-center leading-tight">
                                    Redirecionando para outra profissional disponível...
                                </p>
                            </div>
                            
                            <button
                                onClick={() => setRestrictionAlert({ ...restrictionAlert, open: false })}
                                className="w-full py-4 bg-slate-950 dark:bg-zinc-100 text-white dark:text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-950/10 active:scale-[0.98] transition-all"
                            >
                                Prosseguir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
