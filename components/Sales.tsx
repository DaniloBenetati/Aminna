
import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';

import { ShoppingCart, Plus, Minus, Search, Calendar, User, Package, Check, X, DollarSign, TrendingUp, BarChart3, Filter, CreditCard, ArrowUpRight, ChevronDown, Trash2, ShoppingBag, ChevronLeft, ChevronRight, CalendarRange, Camera, Loader2, ArrowRight } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { CUSTOMERS } from '../constants';
import { Sale, StockItem, PaymentSetting, Customer, PaymentInfo } from '../types';

interface SalesProps {
    sales: Sale[];
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    stock: StockItem[];
    setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
    paymentSettings: PaymentSetting[];
    customers: Customer[];
}

interface CartItem {
    id: string; // Temporary ID for the list
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export const Sales: React.FC<SalesProps> = ({ sales, setSales, stock, setStock, paymentSettings, customers }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- DATE FILTER STATE ---
    // Default to 'day' view showing today
    const [timeView, setTimeView] = useState<'day' | 'month' | 'year' | 'custom'>('day');
    const [dateRef, setDateRef] = useState(new Date());

    const [customRange, setCustomRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [paymentFilter, setPaymentFilter] = useState('all');
    const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

    // Transaction State
    const [customerId, setCustomerId] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [payments, setPayments] = useState<PaymentInfo[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Item Selection State
    const [currentProduct, setCurrentProduct] = useState('');
    const [currentQuantity, setCurrentQuantity] = useState(1);
    const [productSearch, setProductSearch] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [saleTab, setSaleTab] = useState<'SEARCH' | 'CATALOG'>('CATALOG');
    const [activeMainTab, setActiveMainTab] = useState<'ACTIVITY' | 'CATALOG'>('CATALOG');
    const [triedToSubmit, setTriedToSubmit] = useState(false);

    // Catalog Filters
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [selectedSubGroup, setSelectedSubGroup] = useState<string>('all');

    // Multi-Image Catalog Preview
    const [previewProduct, setPreviewProduct] = useState<StockItem | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const getCustomerName = (id: string) => (customers.find(c => c.id === id)?.name || 'Cliente Desconhecido').toUpperCase();
    const getProductName = (id: string) => stock.find(s => s.id === id)?.name || 'Produto Removido';

    const formatDateBR = (dateStr: string) => {
        const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR');
    };

    // --- DATE HELPERS ---
    const navigateDate = (direction: 'prev' | 'next') => {
        if (timeView === 'custom') return;
        const newDate = new Date(dateRef);
        if (timeView === 'day') {
            newDate.setDate(dateRef.getDate() + (direction === 'next' ? 1 : -1));
        } else if (timeView === 'month') {
            newDate.setMonth(dateRef.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            newDate.setFullYear(dateRef.getFullYear() + (direction === 'next' ? 1 : -1));
        }
        setDateRef(newDate);
    };

    const getDateLabel = () => {
        if (timeView === 'custom') return "Período Personalizado";
        if (timeView === 'day') return dateRef.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
        if (timeView === 'month') return dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return dateRef.getFullYear().toString();
    };

    const isDateInPeriod = (dateStr: string) => {
        const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');

        if (timeView === 'day') {
            return d.getDate() === dateRef.getDate() &&
                d.getMonth() === dateRef.getMonth() &&
                d.getFullYear() === dateRef.getFullYear();
        } else if (timeView === 'month') {
            return d.getMonth() === dateRef.getMonth() && d.getFullYear() === dateRef.getFullYear();
        } else if (timeView === 'year') {
            return d.getFullYear() === dateRef.getFullYear();
        } else if (timeView === 'custom') {
            return dateStr >= customRange.start && dateStr <= customRange.end;
        }
        return false;
    };

    // Computed Data
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const dateMatch = isDateInPeriod(s.date);
            const customerMatch = getCustomerName(s.customerId).toLowerCase().includes(searchTerm.toLowerCase());
            const productMatch = s.items?.some((item: any) => 
                (item.name || getProductName(item.productId)).toLowerCase().includes(searchTerm.toLowerCase())
            );
            const searchMatch = customerMatch || productMatch;
            const paymentMatch = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
            return dateMatch && searchMatch && paymentMatch;
        });
    }, [sales, timeView, dateRef, customRange, searchTerm, paymentFilter, stock]);

    const stats = useMemo(() => {
        const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        let totalItems = 0;
        const productCounts: Record<string, number> = {};

        filteredSales.forEach(s => {
            if (s.items && Array.isArray(s.items)) {
                s.items.forEach((item: any) => {
                    totalItems += (item.quantity || 0);
                    const id = item.productId || 'unknown';
                    productCounts[id] = (productCounts[id] || 0) + (item.quantity || 0);
                });
            }
        });

        const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
        const topProductId = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topProduct = stock.find(p => p.id === topProductId)?.name || '-';

        return { totalRevenue, totalItems, avgTicket, topProduct };
    }, [filteredSales, stock]);

    const saleProducts = useMemo(() => stock.filter(item => item.category === 'Venda'), [stock]);

    const uniqueGroups = useMemo(() => {
        const groups = new Set(saleProducts.map(item => item.group).filter(Boolean));
        return Array.from(groups as Set<string>).sort();
    }, [saleProducts]);

    const uniqueSubGroups = useMemo(() => {
        if (selectedGroup === 'all') return [];
        const subGroups = new Set(
            saleProducts
                .filter(item => item.group === selectedGroup)
                .map(item => item.subGroup)
                .filter(Boolean)
        );
        return Array.from(subGroups as Set<string>).sort();
    }, [saleProducts, selectedGroup]);

    const filteredCatalog = useMemo(() => {
        return saleProducts.filter(item => {
            const matchesGroup = selectedGroup === 'all' || item.group === selectedGroup;
            const matchesSubGroup = selectedSubGroup === 'all' || item.subGroup === selectedSubGroup;
            const matchesSearch = item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                (item.code || '').toLowerCase().includes(productSearch.toLowerCase());
            return matchesGroup && matchesSubGroup && matchesSearch;
        });
    }, [saleProducts, selectedGroup, selectedSubGroup, productSearch]);

    // Calculate selected product details for preview
    const selectedStockItem = saleProducts.find(p => p.id === currentProduct);
    const currentItemTotal = selectedStockItem ? (selectedStockItem.price || 0) * currentQuantity : 0;

    // Cart Totals
    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    const totalPaid = useMemo(() => {
        return payments.reduce((acc, p) => acc + p.amount, 0);
    }, [payments]);

    const addPayment = () => {
        const remaining = cartTotal - totalPaid;
        setPayments([...payments, {
            id: Date.now().toString(),
            method: paymentSettings[0]?.method || 'Pix',
            amount: Math.max(0, remaining)
        }]);
    };

    const removePayment = (id: string) => {
        if (payments.length <= 1) return;
        setPayments(payments.filter(p => p.id !== id));
    };

    const updatePayment = (id: string, field: keyof PaymentInfo, value: any) => {
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleAddItemToCart = () => {
        if (!currentProduct || currentQuantity <= 0) return;

        const product = stock.find(p => p.id === currentProduct);
        if (!product) return;

        if (product.quantity < currentQuantity) {
            alert(`Estoque insuficiente. Disponível: ${product.quantity}`);
            return;
        }

        // Check if already in cart to verify total stock limit
        const existingInCart = cart.find(item => item.productId === currentProduct);
        const totalRequested = (existingInCart ? existingInCart.quantity : 0) + currentQuantity;

        if (product.quantity < totalRequested) {
            alert(`Estoque insuficiente para adicionar mais este item. Total disponível: ${product.quantity}`);
            return;
        }

        const newItem: CartItem = {
            id: Date.now().toString(),
            productId: currentProduct,
            productName: product.name,
            quantity: currentQuantity,
            unitPrice: product.price || 0,
            total: (product.price || 0) * currentQuantity
        };

        setCart([...cart, newItem]);
        setCurrentProduct('');
        setCurrentQuantity(1);
    };

    const handleRemoveFromCart = (itemId: string) => {
        setCart(cart.filter(item => item.id !== itemId));
    };

    const handleOCRField = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setOcrError(null);

        try {
            const { data: { text } } = await Tesseract.recognize(file, 'por+eng');
            const normalizedText = text.toLowerCase()
                .replace(/[#*_\-\/]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            const matchedItem = stock.find(item => {
                if (item.category !== 'Venda') return false;
                const name = item.name.toLowerCase();
                const code = item.code?.toLowerCase();

                if (code && normalizedText.includes(code)) return true;
                if (normalizedText.includes(name)) return true;

                const nameWords = name.split(' ').filter(word => word.length > 2);
                if (nameWords.length > 0 && nameWords.every(word => normalizedText.includes(word))) return true;

                return false;
            });

            if (matchedItem) {
                setCurrentProduct(matchedItem.id);
            } else {
                setOcrError("Produto não identificado.");
            }
        } catch (error) {
            console.error("OCR Error:", error);
            setOcrError("Erro ao ler imagem.");
        } finally {
            setIsScanning(false);
            if (e.target) e.target.value = '';
        }
    };

    const filteredProductOptions = useMemo(() => {
        if (!productSearch) return saleProducts.slice(0, 50);
        const search = productSearch.toLowerCase();
        return saleProducts.filter(item =>
            item.name.toLowerCase().includes(search) ||
            item.code?.toLowerCase().includes(search)
        );
    }, [saleProducts, productSearch]);

    const filteredCustomerOptions = useMemo(() => {
        if (!customerSearch) return customers.slice(0, 20);
        const search = customerSearch.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.phone.includes(search)
        ).slice(0, 20);
    }, [customers, customerSearch]);

    const handleRegisterSale = async (e: React.FormEvent) => {
        e.preventDefault();
        setTriedToSubmit(true);

        if (!customerId) {
            alert("Por favor, selecione uma cliente.");
            return;
        }

        if (cart.length === 0) {
            alert("Adicione pelo menos um produto ao carrinho.");
            return;
        }

        if (Math.abs(totalPaid - cartTotal) > 0.01) {
            alert("O valor total pago deve ser igual ao total do carrinho.");
            return;
        }

        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        try {
            // 1. Prepare single sale data for insertion
            const saleToInsert = {
                customer_id: customerId,
                total_amount: cartTotal,
                total_price: cartTotal, // Added to satisfy NOT NULL constraint
                date: localDate,
                payment_method: payments.length > 0 ? (payments.length === 1 ? payments[0].method : 'Múltiplos') : 'Pix',
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    name: item.productName
                })),
                payments: payments
            };

            // 2. Insert into Supabase
            const { data: insertedRecords, error: saleError } = await supabase.from('sales').insert([saleToInsert]).select();
            if (saleError) throw saleError;

            // 3. Update local state and Stock in Supabase
            let updatedStock = [...stock];
            for (const item of cart) {
                const stockItem = updatedStock.find(s => s.id === item.productId);
                if (stockItem) {
                    const newQty = stockItem.quantity - item.quantity;
                    const { error: stockError } = await supabase
                        .from('stock_items')
                        .update({ quantity: newQty })
                        .eq('id', item.productId);
                    if (stockError) throw stockError;

                    updatedStock = updatedStock.map(s => s.id === item.productId ? { ...s, quantity: newQty } : s);
                }
            }

            if (insertedRecords && insertedRecords.length > 0) {
                const newLocalSales: Sale[] = insertedRecords.map((s: any) => ({
                    id: s.id,
                    customerId: s.customer_id,
                    totalAmount: s.total_amount,
                    totalPrice: s.total_price,
                    date: s.date,
                    paymentMethod: s.payment_method,
                    items: s.items || [],
                    payments: s.payments || []
                }));
                setSales(prev => [...newLocalSales, ...prev]);
            }

            setStock(updatedStock);
            // 3. Update local state and close modal
            setIsModalOpen(false);
            setCustomerId('');
            setCart([]);
            setPayments([]);
            setCustomerSearch('');
            setTriedToSubmit(false);
            setCurrentProduct('');
            setPaymentMethod('Pix');

        } catch (error) {
            console.error('Error registering sale:', error);
            alert('Erro ao registrar venda.');
        }
    };

    const handleDeleteSale = async (id: string) => {
        if (confirm('Deseja estornar esta venda? O estoque não será devolvido automaticamente nesta versão.')) {
            try {
                const { error } = await supabase.from('sales').delete().eq('id', id);
                if (error) throw error;
                setSales(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error('Error deleting sale:', error);
            }
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-8 text-black dark:text-white">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white leading-tight">Vendas de Produtos</h2>
                    <p className="text-[10px] md:text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Painel comercial e histórico</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 flex-1 md:flex-none">
                        {(['ACTIVITY', 'CATALOG'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveMainTab(tab)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMainTab === tab ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {tab === 'ACTIVITY' ? 'Atividade' : 'Catálogo'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        <Plus size={18} /> Nova Venda
                    </button>
                </div>
            </div>

            {/* Main Tabs Content */}
            {activeMainTab === 'ACTIVITY' ? (
                <>
                    {/* KPI Section */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl"><DollarSign size={20} /></div>
                        <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Receita Total</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl"><Package size={20} /></div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Itens Vendidos</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">{stats.totalItems} un</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl"><BarChart3 size={20} /></div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Ticket Médio</p>
                    <p className="text-lg md:text-xl font-black text-slate-950 dark:text-white">R$ {stats.avgTicket.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl"><ArrowUpRight size={20} /></div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Mais Vendido</p>
                    <p className="text-xs md:text-sm font-black text-slate-950 dark:text-white truncate">{stats.topProduct}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col xl:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou produto..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-transparent focus:border-black dark:focus:border-white rounded-2xl text-xs md:text-sm font-black text-slate-950 dark:text-white outline-none transition-all placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Date & Payment Controls */}
                <div className="flex flex-col md:flex-row gap-3 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full md:w-auto">
                        {(['day', 'month', 'year', 'custom'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => { setTimeView(v); if (v !== 'custom') setDateRef(new Date()); }}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === v ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {v === 'day' ? 'Dia' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Período'}
                            </button>
                        ))}
                    </div>

                    {/* Date Navigator */}
                    {timeView === 'custom' ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-3 py-1.5 rounded-2xl w-full md:w-auto">
                            <CalendarRange size={16} className="text-slate-400" />
                            <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                            <span className="text-slate-300">-</span>
                            <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} className="text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none bg-transparent" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-700 px-2 py-1.5 rounded-2xl w-full md:w-auto justify-between md:justify-start">
                            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <div className="flex flex-col items-center min-w-[120px]">
                                <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">{getDateLabel()}</span>
                            </div>
                            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    )}

                    <select
                        value={paymentFilter}
                        onChange={e => setPaymentFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-zinc-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-zinc-700 text-[11px] font-black uppercase text-slate-900 dark:text-white outline-none focus:border-black dark:focus:border-white transition-all w-full md:w-auto"
                    >
                        <option value="all">Todos Pagamentos</option>
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão">Cartão</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-800 dark:text-slate-300 font-black uppercase bg-slate-50 dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4 text-center">Qtd</th>
                                <th className="px-6 py-4 text-right">Valor Unit.</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Pagamento</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 group">
                                    <td className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 text-xs">
                                        {formatDateBR(sale.date)}
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">
                                        {getCustomerName(sale.customerId)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                        {sale.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="truncate max-w-[200px]">
                                                {item.name || getProductName(item.productId)}
                                            </div>
                                        )) || 'Sem itens'}
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">
                                        {sale.items?.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0) || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 font-bold">
                                        {sale.items?.length === 1 ? `R$ ${(sale.items[0].unitPrice || 0).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-700 dark:text-emerald-400">
                                        R$ {(sale.totalAmount || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-[9px] px-2 py-1 rounded-full font-black uppercase bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 dark:text-slate-300">
                                            {sale.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setSelectedSaleDetail(sale)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                <Search size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
                {filteredSales.map(sale => (
                    <div key={sale.id} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3 active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase">{formatDateBR(sale.date)}</p>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate uppercase">{getCustomerName(sale.customerId)}</h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="p-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded-lg"><Package size={12} /></span>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                        {sale.items?.map((i: any) => i.name || getProductName(i.productId)).join(', ') || 'Sem itens'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 leading-none">R$ {(sale.totalAmount || 0).toFixed(2)}</p>
                                <span className="text-[9px] font-black uppercase text-slate-400">
                                    {sale.items?.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0) || 0} unid.
                                </span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-50 dark:border-zinc-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setSelectedSaleDetail(sale)} className="text-[9px] px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full font-black uppercase border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
                                    <Search size={10} /> DETALHES
                                </button>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    {sale.items?.length === 1 ? `Unit: R$${(sale.items[0].unitPrice || 0).toFixed(2)}` : `${sale.items?.length || 0} itens`}
                                </p>
                            </div>
                            <button onClick={() => handleDeleteSale(sale.id)} className="p-2 text-rose-200 dark:text-rose-900 active:text-rose-600 dark:active:text-rose-400">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredSales.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-zinc-800">
                        <ShoppingCart size={48} className="mx-auto text-slate-100 dark:text-zinc-800 mb-2" />
                        <p className="text-sm font-black text-slate-300 dark:text-zinc-600 uppercase">Nenhuma venda encontrada</p>
                    </div>
                )}
            </div>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight" style={{ color: '#75787B' }}>Catálogo de Produtos</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Navegue e adicione itens para venda</p>
                                    </div>
                                    {cart.length > 0 && (
                                        <button 
                                            onClick={() => setIsModalOpen(true)}
                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 animate-bounce-subtle"
                                        >
                                            <ShoppingCart size={14} /> Ver Carrinho ({cart.length})
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                                    {/* Quick Customer Selector in Catalog */}
                                    <div className="relative w-full md:w-72">
                                        <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${customerId ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        <input
                                            type="text"
                                            placeholder={customerId ? getCustomerName(customerId) : "Selecionar Cliente..."}
                                            className={`w-full pl-11 pr-10 py-3 rounded-2xl text-xs font-black outline-none transition-all shadow-inner border-2 ${customerId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100' : 'bg-slate-50 dark:bg-zinc-800 border-transparent focus:border-zinc-950 dark:focus:border-white'}`}
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                        />
                                        {customerId && (
                                            <button 
                                                type="button"
                                                onClick={() => setCustomerId('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        {customerSearch && (
                                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                                {filteredCustomerOptions.length > 0 ? filteredCustomerOptions.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800 last:border-none flex justify-between items-center group/client"
                                                        onClick={() => {
                                                            setCustomerId(c.id);
                                                            setCustomerSearch('');
                                                            setTriedToSubmit(false);
                                                        }}
                                                    >
                                                        <div>
                                                            <p className="font-black text-xs text-slate-900 dark:text-white uppercase">{c.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase">{c.phone}</p>
                                                        </div>
                                                        <ArrowRight size={14} className="text-slate-300 group-hover/client:text-indigo-600" />
                                                    </button>
                                                )) : (
                                                    <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase">Não encontrado</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative w-full md:w-64">
                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar catálogo..."
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-transparent focus:border-zinc-950 dark:focus:border-white rounded-2xl text-xs font-black outline-none transition-all shadow-inner"
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                        </div>

                        {/* Category & Subcategory Filters */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => { setSelectedGroup('all'); setSelectedSubGroup('all'); }}
                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedGroup === 'all' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-lg' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                >
                                    Todos
                                </button>
                                {uniqueGroups.map(group => (
                                    <button
                                        key={group}
                                        onClick={() => { setSelectedGroup(group); setSelectedSubGroup('all'); }}
                                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedGroup === group ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-lg' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                    >
                                        {group}
                                    </button>
                                ))}
                            </div>

                            {uniqueSubGroups.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <button
                                        onClick={() => setSelectedSubGroup('all')}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSubGroup === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                    >
                                        Todas Subcategorias
                                    </button>
                                    {uniqueSubGroups.map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setSelectedSubGroup(sub)}
                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedSubGroup === sub ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-zinc-900 text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredCatalog.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            setPreviewProduct(product);
                                            setActiveImageIndex(0);
                                            setCurrentQuantity(1);
                                        }}
                                        className="group bg-white dark:bg-zinc-800 rounded-3xl border-2 p-3 text-left hover:border-zinc-950 dark:hover:border-white transition-all shadow-sm hover:shadow-xl active:scale-[0.98] flex flex-col gap-3 relative overflow-hidden"
                                        style={{ borderColor: '#D9D9D6' }}
                                    >
                                        <div className="aspect-square rounded-[1.5rem] bg-slate-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-zinc-800 shadow-inner">
                                            {product.imageUrl ? (
                                                <img 
                                                    src={product.imageUrl} 
                                                    alt={product.name} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                    referrerPolicy="no-referrer"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <Package size={32} className="text-slate-200 dark:text-zinc-700" />
                                            )}
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 p-2 rounded-xl shadow-lg">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-1">
                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</p>
                                            <div className="flex justify-between items-end mt-2">
                                                <p className="text-sm font-black" style={{ color: '#75787B' }}>R$ {product.price?.toFixed(2)}</p>
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase ${product.quantity > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                                                    {product.quantity} un
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            }
                        </div>

                        {filteredCatalog.length === 0 && (
                            <div className="py-32 text-center opacity-50 bg-slate-50 dark:bg-zinc-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-zinc-700">
                                <ShoppingBag size={64} className="mx-auto mb-4 text-slate-300 dark:text-zinc-700" />
                                <h4 className="text-lg font-black uppercase text-slate-400 dark:text-zinc-500">Nenhum produto encontrado</h4>
                                <p className="text-xs font-bold text-slate-400/70 mt-1 uppercase tracking-widest">Ajuste os filtros ou cadastre novos produtos</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New Sale Modal (Updated for Cart) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 flex flex-col max-h-[90vh] border border-slate-200 dark:border-zinc-800">
                        {/* Header Updated to be Light by default, Dark in Dark Mode */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-black flex justify-between items-center bg-white dark:bg-zinc-950 text-slate-900 dark:text-white flex-shrink-0">
                            <h3 className="font-black text-base md:text-lg uppercase tracking-tight flex items-center gap-2">
                                <ShoppingCart size={20} className="text-slate-900 dark:text-white" />
                                Registrar Venda
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleRegisterSale} className="flex flex-col flex-1 overflow-hidden">
                            {/* 1. Sticky Customer Selection */}
                            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-950/20 flex-shrink-0">
                                <label className="block text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                                    <span>Selecionar Cliente</span>
                                    {customerId && <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-black uppercase">Selecionada</span>}
                                </label>

                                {!customerId ? (
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100" />
                                        <input
                                            type="text"
                                            placeholder="Busque por nome ou celular..."
                                            className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 ${triedToSubmit && !customerId ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-zinc-700'} rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white text-slate-900 dark:text-white transition-all shadow-sm`}
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                        />
                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100 pointer-events-none" />

                                        {customerSearch && (
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                                {filteredCustomerOptions.length > 0 ? filteredCustomerOptions.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-100 dark:border-zinc-800 last:border-none flex justify-between items-center group/client"
                                                        onClick={() => {
                                                            setCustomerId(c.id);
                                                            setCustomerSearch('');
                                                        }}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-black text-[12px] text-slate-950 dark:text-white truncate uppercase">{c.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{c.phone}</p>
                                                        </div>
                                                        <ArrowRight size={14} className="text-slate-300 group-hover/client:text-indigo-600" />
                                                    </button>
                                                )) : (
                                                    <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase">Nenhuma cliente encontrada</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/50 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"><User size={16} /></div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-950 dark:text-white truncate uppercase">{getCustomerName(customerId)}</p>
                                                <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">{customers.find(c => c.id === customerId)?.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setCustomerId('')} className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-slate-50 transition-colors">Trocar</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto scrollbar-hide bg-white dark:bg-zinc-900 flex-1">
                                {/* Tab Switcher remains inside scrollable area */}
                                <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 mb-2">
                                    {(['CATALOG', 'SEARCH'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setSaleTab(tab)}
                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${saleTab === tab ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            {tab === 'CATALOG' ? 'Catálogo Visual' : 'Busca por Código'}
                                        </button>
                                    ))}
                                </div>

                                {/* Items Area */}
                                {saleTab === 'SEARCH' ? (
                                    <>
                                        <div className="flex justify-between items-center mb-1.5 px-1">
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Adicionar Produto</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="ocr-scanner-sales"
                                                    className="hidden"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={handleOCRField}
                                                    disabled={isScanning}
                                                />
                                                <label
                                                    htmlFor="ocr-scanner-sales"
                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer shadow-sm border ${isScanning ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-600 text-white border-indigo-700 active:scale-95'}`}
                                                >
                                                    {isScanning ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
                                                    {isScanning ? 'Lendo...' : 'Escanear'}
                                                </label>
                                            </div>
                                        </div>

                                        {!currentProduct ? (
                                            <div className="relative">
                                                <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100" />
                                                <input
                                                    type="text"
                                                    placeholder="Busque por nome ou bipe o código..."
                                                    className="w-full pl-11 pr-10 py-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 focus:border-black dark:focus:border-white rounded-2xl text-sm font-black outline-none text-slate-900 dark:text-white transition-all"
                                                    value={productSearch}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setProductSearch(val);
                                                        const exactMatch = stock.find(i => i.category === 'Venda' && i.code?.toUpperCase() === val.toUpperCase());
                                                        if (exactMatch) {
                                                            setCurrentProduct(exactMatch.id);
                                                            setProductSearch('');
                                                        }
                                                    }}
                                                />
                                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />

                                                {productSearch && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                                        {filteredProductOptions.map(item => (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-zinc-800 border-b border-slate-100 dark:border-zinc-800 last:border-none flex justify-between items-center group/item"
                                                                onClick={() => {
                                                                    setCurrentProduct(item.id);
                                                                    setProductSearch('');
                                                                }}
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-[11px] text-slate-950 dark:text-white truncate uppercase">{item.name}</p>
                                                                    <p className="text-[9px] font-bold text-slate-500 uppercase">{item.code || 'S/ REF'} - R$ {item.price?.toFixed(2)}</p>
                                                                </div>
                                                                <ArrowRight size={14} className="text-slate-300 group-hover/item:text-indigo-600" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl border-2 border-black dark:border-zinc-700 flex items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">Produto Selecionado</p>
                                                    <p className="text-xs font-black truncate" style={{ color: '#75787B' }}>{selectedStockItem?.name}</p>
                                                    <p className="text-[10px] font-bold" style={{ color: '#75787B' }}>R$ {selectedStockItem?.price?.toFixed(2)}</p>
                                                </div>
                                                <button type="button" onClick={() => setCurrentProduct('')} className="text-[9px] font-black text-slate-950 dark:text-white uppercase bg-white dark:bg-zinc-700 px-2.5 py-1.5 rounded-lg ml-2 border border-black dark:border-zinc-600 shadow-sm">Remover</button>
                                            </div>
                                        )}
                                        {ocrError && <p className="text-[9px] font-bold text-rose-600 px-1">{ocrError}</p>}
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Filtrar catálogo..."
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-black outline-none text-slate-950 dark:text-white focus:border-black dark:focus:border-white transition-all shadow-inner"
                                                value={productSearch}
                                                onChange={e => setProductSearch(e.target.value)}
                                            />
                                        </div>
                                        
                                        {!currentProduct ? (
                                            <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 overflow-y-auto max-h-[350px] p-1 scrollbar-hide">
                                                {stock
                                                    .filter(item => item.category === 'Venda' && (!productSearch || item.name.toLowerCase().includes(productSearch.toLowerCase())))
                                                    .map(product => (
                                                        <button
                                                            key={product.id}
                                                            type="button"
                                                            onClick={() => setCurrentProduct(product.id)}
                                                            className="group bg-white dark:bg-zinc-800 rounded-2xl border-2 p-2 text-left hover:border-black dark:hover:border-white transition-all shadow-sm active:scale-95 flex flex-col gap-2 relative overflow-hidden"
                                                            style={{ borderColor: '#D9D9D6' }}
                                                        >
                                                            <div className="aspect-square rounded-xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-zinc-800">
                                                                {product.imageUrl ? (
                                                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                ) : (
                                                                    <Package size={24} className="text-slate-200 dark:text-zinc-700" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black truncate uppercase leading-tight group-hover:text-indigo-600 transition-colors" style={{ color: '#75787B' }}>{product.name}</p>
                                                                <div className="flex justify-between items-end mt-1">
                                                                    <p className="text-[11px] font-black" style={{ color: '#75787B' }}>R$ {product.price?.toFixed(2)}</p>
                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase">{product.quantity} un</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border-2 border-black dark:border-zinc-700 flex items-center justify-between animate-in zoom-in-95 duration-200 shadow-xl">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex-shrink-0 shadow-inner">
                                                        {selectedStockItem?.imageUrl ? (
                                                            <img src={selectedStockItem.imageUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-200/50"><Package size={24} /></div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Selecionado</p>
                                                        <p className="text-sm font-black truncate uppercase" style={{ color: '#75787B' }}>{selectedStockItem?.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-black" style={{ color: '#75787B' }}>R$ {selectedStockItem?.price?.toFixed(2)}</span>
                                                            <span className="w-1 h-1 bg-slate-300 dark:bg-zinc-600 rounded-full"></span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{selectedStockItem?.quantity} em estoque</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => setCurrentProduct('')} className="text-[10px] font-black text-slate-900 dark:text-white uppercase bg-slate-50 dark:bg-zinc-700 px-4 py-2 rounded-xl ml-4 border border-slate-200 dark:border-zinc-600 shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 transition-all">Remover</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedStockItem?.quantity || 999}
                                            className="w-full border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-black dark:focus:border-white rounded-2xl p-4 text-xl font-black outline-none text-slate-900 dark:text-white text-center placeholder:text-slate-200 transition-all"
                                            placeholder="Qtd"
                                            value={currentQuantity}
                                            onChange={e => setCurrentQuantity(parseInt(e.target.value) || 1)}
                                        />
                                        <span className="absolute -top-2 left-4 bg-white dark:bg-zinc-900 px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantidade</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddItemToCart}
                                        disabled={!currentProduct}
                                        className="flex-[2] bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-slate-200 disabled:opacity-50 transition-all shadow-xl active:scale-[0.98] group"
                                    >
                                        <Plus size={18} className="group-active:rotate-90 transition-transform" /> 
                                        Adicionar ao Carrinho
                                    </button>
                                </div>

                                {/* 3. Cart List */}
                                {cart.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Itens no Carrinho</label>
                                        <div className="bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl overflow-hidden divide-y divide-slate-50 dark:divide-zinc-700">
                                            {cart.map(item => (
                                                <div key={item.id} className="p-3 flex justify-between items-center group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-100 dark:bg-zinc-700 p-2 rounded-lg text-slate-500 dark:text-slate-400"><ShoppingBag size={16} /></div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white">{item.productName}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.quantity}x R$ {item.unitPrice.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white">R$ {item.total.toFixed(2)}</span>
                                                        <button onClick={() => handleRemoveFromCart(item.id)} className="text-rose-300 hover:text-rose-600 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 4. Payment & Totals */}
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between ml-1 mb-2">
                                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Formas de Recebimento</label>
                                            <button
                                                type="button"
                                                onClick={addPayment}
                                                className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Adicionar Fonte
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {payments.length === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={addPayment}
                                                    className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-100 transition-colors"
                                                >
                                                    Definir Pagamento
                                                </button>
                                            )}
                                            {payments.map((payment) => (
                                                <div key={payment.id} className="flex gap-2">
                                                    <select
                                                        className="flex-[2] bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-black uppercase"
                                                        value={payment.method}
                                                        onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                                                    >
                                                        {paymentSettings.map(pay => (
                                                            <option key={pay.id} value={pay.method}>
                                                                {pay.method}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full pl-8 pr-3 py-3 bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-black text-slate-950 dark:text-white outline-none focus:border-black"
                                                            value={payment.amount || ''}
                                                            placeholder="0,00"
                                                            onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    {payments.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removePayment(payment.id)}
                                                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {payments.length > 0 && (
                                            <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between ${Math.abs(totalPaid - cartTotal) < 0.01 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                                <span className="text-[9px] font-black uppercase text-slate-500">Total Pago</span>
                                                <span className={`text-xs font-black ${Math.abs(totalPaid - cartTotal) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    R$ {totalPaid.toFixed(2)} / R$ {cartTotal.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-5 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/50">
                                        <div className="flex justify-between items-center text-2xl font-black text-emerald-950 dark:text-emerald-400">
                                            <span>Total Geral</span>
                                            <span>R$ {cartTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3 flex-shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 py-4 text-slate-400 dark:text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    {cart.length > 0 ? "Continuar Comprando" : "Cancelar"}
                                </button>
                                 <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    <Check size={18} /> Confirmar Venda
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sale Details Modal */}
            {selectedSaleDetail && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-4xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 border border-slate-200 dark:border-zinc-800">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950">
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                    <ShoppingBag size={18} className="text-indigo-600" /> Detalhes da Venda
                                </h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase">{getCustomerName(selectedSaleDetail.customerId)}</p>
                            </div>
                            <button onClick={() => setSelectedSaleDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 flex justify-between items-center text-emerald-900 dark:text-emerald-300">
                                <span className="text-[10px] font-black uppercase tracking-widest">Total Pago</span>
                                <span className="text-2xl font-black tracking-tighter">R$ {selectedSaleDetail.totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Itens Vendidos</h4>
                                <div className="space-y-2">
                                    {(selectedSaleDetail.items || []).map((item: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700 flex justify-between items-center">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-950 dark:text-white uppercase truncate">{item.name || getProductName(item.productId)}</p>
                                                <p className="text-[9px] font-bold text-slate-500">{item.quantity}un x R$ {item.unitPrice?.toFixed(2)}</p>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 dark:text-white ml-2">R$ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Formas de Recebimento</h4>
                                <div className="bg-slate-100 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 space-y-2">
                                    {(selectedSaleDetail.payments && selectedSaleDetail.payments.length > 0) ? (
                                        selectedSaleDetail.payments.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{p.method}</span>
                                                </div>
                                                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">R$ {p.amount.toFixed(2)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={14} className="text-indigo-600 dark:text-indigo-400" />
                                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{selectedSaleDetail.paymentMethod}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedSaleDetail(null)}
                                className="w-full py-4 bg-slate-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all mt-2"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Catalog Preview Modal */}
            {previewProduct && (
                <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-0 md:p-6 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-zinc-950 md:rounded-[3rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row h-full md:h-[85vh] border border-white/5">
                        
                        {/* Image Section - The STAR */}
                        <div className="md:flex-[3] relative bg-zinc-100 dark:bg-black flex items-center justify-center group overflow-hidden">
                            <button 
                                onClick={() => setPreviewProduct(null)}
                                className="absolute top-6 left-6 z-20 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-full transition-all border border-white/10 shadow-lg md:hidden"
                            >
                                <X size={24} />
                            </button>

                            {/* Main Image - Fully Expanded */}
                            <img 
                                src={[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean)[activeImageIndex] as string || ''} 
                                alt={previewProduct.name}
                                className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-700"
                                referrerPolicy="no-referrer"
                            />

                            {/* Navigation Arrows - Sleeker */}
                            {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveImageIndex(prev => prev > 0 ? prev - 1 : [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).length - 1);
                                        }}
                                        className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white rounded-3xl transition-all border border-white/5 opacity-0 group-hover:opacity-100 hidden md:flex"
                                    >
                                        <ChevronLeft size={32} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveImageIndex(prev => prev < [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).length - 1 ? prev + 1 : 0);
                                        }}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white rounded-3xl transition-all border border-white/5 opacity-0 group-hover:opacity-100 hidden md:flex"
                                    >
                                        <ChevronRight size={32} />
                                    </button>
                                </>
                            )}

                            {/* Indicators */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
                                {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Side Info Panel - Discrete & Functional */}
                        <div className="md:flex-[1.2] p-8 md:p-10 flex flex-col bg-white dark:bg-zinc-950 border-l border-slate-50 dark:border-zinc-900">
                            <div className="flex justify-between items-start mb-10">
                                <div className="space-y-0.5 opacity-60">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{previewProduct.group || 'Geral'}</p>
                                    <h2 className="text-lg font-bold uppercase leading-tight tracking-tight" style={{ color: '#75787B' }}>{previewProduct.name}</h2>
                                </div>
                                <button 
                                    onClick={() => setPreviewProduct(null)}
                                    className="hidden md:flex p-2 text-slate-200 hover:text-rose-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-12">
                                <div className="flex items-baseline gap-2 pb-6 border-b border-slate-50 dark:border-zinc-900">
                                    <span className="text-2xl font-black italic tracking-tighter opacity-70" style={{ color: '#75787B' }}>R$ {previewProduct.price?.toFixed(2)}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-50">unid.</span>
                                </div>

                                {/* Thumbnails - Discrete Strip */}
                                {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).length > 1 && (
                                    <div className="space-y-3">
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Galeria</p>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).map((url, i) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => setActiveImageIndex(i)}
                                                    className={`w-12 h-12 rounded-xl overflow-hidden border transition-all duration-300 flex-shrink-0 ${i === activeImageIndex ? 'border-zinc-950 dark:border-white scale-105' : 'border-transparent opacity-30 hover:opacity-100'}`}
                                                >
                                                    <img src={url as string} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6 pt-4">
                                    <div className="flex flex-col items-center gap-4">
                                        <label className="text-[8px] font-black text-slate-300 dark:text-zinc-600 uppercase tracking-[0.3em]">Quantidade</label>
                                        <div className="flex items-center gap-10">
                                            <button 
                                                onClick={() => setCurrentQuantity(prev => Math.max(1, prev - 1))}
                                                className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-zinc-950 dark:hover:text-white transition-all active:scale-75"
                                            >
                                                <Minus size={20} />
                                            </button>
                                            <span className="text-3xl font-black text-zinc-950 dark:text-white w-10 text-center tabular-nums opacity-80">{currentQuantity}</span>
                                            <button 
                                                onClick={() => setCurrentQuantity(prev => prev + 1)}
                                                className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-zinc-950 dark:hover:text-white transition-all active:scale-75"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 space-y-4">
                                <button 
                                    onClick={() => {
                                        const newItem: CartItem = {
                                            id: Date.now().toString(),
                                            productId: previewProduct.id,
                                            productName: previewProduct.name,
                                            quantity: currentQuantity,
                                            unitPrice: previewProduct.price || 0,
                                            total: (previewProduct.price || 0) * currentQuantity
                                        };
                                        setCart([...cart, newItem]);
                                        setPreviewProduct(null);
                                        // Optional: Auto-open checkout or show a snackbar
                                    }}
                                    className="w-full py-5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.25em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group"
                                >
                                    <ShoppingCart size={16} className="group-hover:scale-110 transition-transform" /> 
                                    Adicionar ao Carrinho
                                </button>
                                <button 
                                    onClick={() => setPreviewProduct(null)}
                                    className="w-full py-2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                    Voltar para o Catálogo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
