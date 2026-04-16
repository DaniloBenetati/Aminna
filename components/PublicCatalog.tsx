import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { ShoppingCart, Plus, Minus, Search, Trash2, ArrowRight, Package, Loader2, Info, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { StockItem } from '../types';
import { sanitizeImageUrl } from '../services/utils';

export const PublicCatalog: React.FC = () => {
    const [products, setProducts] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedSubGroup, setSelectedSubGroup] = useState('all');

    // Cart State
    const [cart, setCart] = useState<{ product: StockItem, quantity: number }[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    // Checkout State
    const [checkoutName, setCheckoutName] = useState('');
    const [checkoutPhone, setCheckoutPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Preview
    const [previewProduct, setPreviewProduct] = useState<StockItem | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const touchStartRef = React.useRef<number | null>(null);

    // Success State
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [finalWpLink, setFinalWpLink] = useState('');

    useEffect(() => {
        const fetchCatalog = async () => {
            setIsLoading(true);
            try {
                // Anonymous fetch! Only brings active = true and quantity > 0 via RLS
                const { data, error } = await supabase
                    .from('stock_items')
                    .select('*')
                    .order('name', { ascending: true });
                
                if (error) {
                    console.error("Error fetching catalog:", error);
                } else if (data) {
                    // Map just exactly what is needed
                    const mapped = data.map((s: any) => ({
                        id: s.id,
                        code: s.code,
                        name: s.name,
                        category: s.category,
                        group: s.group,
                        subGroup: s.sub_group,
                        quantity: s.quantity,
                        price: s.sale_price,
                        imageUrl: s.image_url,
                        imageUrls: s.image_urls || [],
                    }));
                    setProducts(mapped);
                }
            } catch (err) {
                console.error("Fetch crashed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCatalog();
    }, []);

    const uniqueGroups = useMemo(() => {
        const groups = new Set(products.map(item => item.group).filter(Boolean));
        return Array.from(groups as Set<string>).sort();
    }, [products]);

    const uniqueSubGroups = useMemo(() => {
        if (selectedGroup === 'all') return [];
        const subGroups = new Set(
            products
                .filter(item => item.group === selectedGroup)
                .map(item => item.subGroup)
                .filter(Boolean)
        );
        return Array.from(subGroups as Set<string>).sort();
    }, [products, selectedGroup]);

    const filteredCatalog = useMemo(() => {
        return products.filter(item => {
            const matchesGroup = selectedGroup === 'all' || item.group === selectedGroup;
            const matchesSubGroup = selectedSubGroup === 'all' || item.subGroup === selectedSubGroup;
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                                (item.code || '').toLowerCase().includes(search.toLowerCase());
            return matchesGroup && matchesSubGroup && matchesSearch;
        });
    }, [products, selectedGroup, selectedSubGroup, search]);

    const cartTotal = useMemo(() => {
        return cart.reduce((acc, item) => acc + (item.product.price || 0) * item.quantity, 0);
    }, [cart]);

    const getCartTotalQuantity = () => cart.reduce((acc, item) => acc + item.quantity, 0);

    const addToCart = (product: StockItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.quantity + 1 > product.quantity) {
                    alert(`Estoque máximo (${product.quantity}) atingido para esta peça.`);
                    return prev;
                }
                return prev.map(item => 
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.product.id === productId) {
                    const newQty = item.quantity + delta;
                    if (newQty > item.product.quantity) {
                         alert(`Estoque máximo (${item.product.quantity}) atingido para esta peça.`);
                         return item;
                    }
                    if (newQty <= 0) return { ...item, quantity: 0 };
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) return;
        if (!checkoutName || !checkoutPhone) {
            alert("Por favor, preencha nome e telefone para reserva.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Verificar se a cliente já existe via RPC
            const cleanPhone = checkoutPhone.replace(/\D/g, '');
            const { data: customerStatus, error: statusError } = await supabase.rpc('check_customer_exists', {
                phone_text: cleanPhone
            });

            if (statusError) console.error("Erro check customer:", statusError);
            const isExisting = customerStatus?.exists || false;

            // Criar Reserva no Supabase usando ANON Role!
            const { data: reservation, error: resError } = await supabase.from('catalog_reservations').insert({
                customer_name: checkoutName,
                customer_phone: cleanPhone,
                total_amount: cartTotal,
                status: 'Pendente'
            }).select().single();

            if (resError) throw resError;

            // Inserir items
            const itemsToInsert = cart.map(item => ({
                reservation_id: reservation.id,
                product_id: item.product.id,
                product_name: item.product.name,
                quantity: item.quantity,
                unit_price: item.product.price
            }));

            const { error: itemsError } = await supabase.from('catalog_reservation_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // Sucesso! Gerar WhatsApp
            const wpPhone = "5511941326490";
            let wpText = `*NOVA RESERVA - AMINNA STORE*\n\n`;
            wpText += `*Cliente:* ${checkoutName}\n`;
            wpText += `*Telefone:* ${checkoutPhone}\n`;
            wpText += `*Status:* ${isExisting ? '✅ CLIENTE JÁ CADASTRADA' : '✨ CLIENTE NOVA'}\n\n`;
            wpText += `*Itens da Reserva:*\n`;
            
            cart.forEach((item, index) => {
                wpText += `${index + 1}. ${item.product.name} (x${item.quantity}) - R$ ${((item.product.price || 0) * item.quantity).toFixed(2)}\n`;
            });

            wpText += `\n*TOTAL:* R$ ${cartTotal.toFixed(2)}\n`;
            wpText += `\n_Reserva originada do Catálogo Online de Cliente._`;

            const encodedWp = encodeURIComponent(wpText);
            const wplink = `https://wa.me/${wpPhone}?text=${encodedWp}`;
            
            setCart([]);
            setIsCartOpen(false);
            setFinalWpLink(wplink);
            setIsSuccessModalOpen(true);
            
        } catch (error) {
            console.error("Erro no Checkout:", error);
            // Modal de erro simplificado ou alert (opcional manter alert para erro se preferir)
            alert("Ocorreu um erro ao processar sua reserva. Por favor, verifique sua conexão ou tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
            {/* Header Aminna Public */}
            <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40 px-4 md:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" style={{ height: '36px', filter: 'grayscale(1) contrast(1.2)' }} alt="Aminna" />
                    <span className="hidden sm:inline-block text-xs font-black uppercase tracking-widest text-[#947c4c] border-l border-slate-200 pl-4">
                        Catálogo de Peças
                    </span>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        <ShoppingCart size={18} />
                        <span className="text-xs font-black tracking-wider uppercase">
                            Reserva {getCartTotalQuantity() > 0 && `(${getCartTotalQuantity()})`}
                        </span>
                    </button>
                    {getCartTotalQuantity() > 0 && (
                         <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border border-white"></span>
                        </span>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Search & Filters (Replicação visual exata) */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-2 border-2 border-slate-100 flex items-center gap-3 mb-6 shadow-sm focus-within:border-black transition-colors">
                    <div className="pl-3">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Filtrar catálogo online por nome, tipo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent p-2 text-xs font-black text-slate-900 dark:text-white uppercase outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                    <button
                        onClick={() => { setSelectedGroup('all'); setSelectedSubGroup('all'); }}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedGroup === 'all' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-slate-500 border border-slate-200'}`}
                    >
                        TODOS
                    </button>
                    {uniqueGroups.map(group => (
                        <button
                            key={group}
                            onClick={() => { setSelectedGroup(group); setSelectedSubGroup('all'); }}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedGroup === group ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-slate-500 border border-slate-200'}`}
                        >
                            {group}
                        </button>
                    ))}
                </div>

                {selectedGroup !== 'all' && uniqueSubGroups.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mt-2">
                         <div className="w-4 flex-shrink-0" />
                        {uniqueSubGroups.map(subGroup => (
                            <button
                                key={subGroup}
                                onClick={() => setSelectedSubGroup(subGroup)}
                                className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${selectedSubGroup === subGroup ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900' : 'bg-transparent text-slate-400 border border-dashed border-slate-200'}`}
                            >
                                {subGroup}
                            </button>
                        ))}
                    </div>
                )}


                {/* Listagem de Produtos (Layout idêntico a Vendas) */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-20 flex-col gap-4">
                        <Loader2 size={32} className="animate-spin text-[#947c4c]" />
                        <span className="text-xs font-black uppercase tracking-widest text-[#947c4c]">Carregando Acervo</span>
                    </div>
                ) : filteredCatalog.length === 0 ? (
                    <div className="text-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-slate-200">
                        <Info size={32} className="mx-auto mb-4 text-slate-300" />
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Nenhuma peça encontrada</h3>
                        <p className="text-xs font-medium text-slate-500">Tente ajustar seus filtros de busca para encontrar peças disponíveis.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredCatalog.map(product => (
                            <button
                                key={product.id}
                                onClick={() => {
                                    setPreviewProduct(product);
                                    setActiveImageIndex(0);
                                }}
                                className="group bg-white dark:bg-zinc-800 rounded-3xl border-2 p-3 text-left hover:border-zinc-950 dark:hover:border-white transition-all shadow-sm hover:shadow-xl active:scale-[0.98] flex flex-col gap-3 relative overflow-hidden"
                                style={{ borderColor: '#D9D9D6' }}
                            >
                                <div className="aspect-square rounded-[1.5rem] bg-slate-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-zinc-800 shadow-inner">
                                    {product.imageUrl ? (
                                        <img 
                                            src={sanitizeImageUrl(product.imageUrl)} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none" 
                                            loading="lazy"
                                        />
                                    ) : (
                                        <Package size={32} className="text-slate-200 dark:text-zinc-700" />
                                    )}
                                    <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(product);
                                            }}
                                            className="p-2 rounded-xl shadow-lg transition-all bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:scale-110 active:scale-90"
                                            title="Adicionar ao Carrinho"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {cart.some(c => c.product.id === product.id) && (
                                        <div className="absolute top-3 left-3 bg-[#947c4c] text-white text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-widest shadow-md">
                                            Na Reserva
                                        </div>
                                    )}
                                </div>
                                <div className="px-1">
                                    <p className="lg:hidden text-[11px] font-black text-slate-900 dark:text-white truncate uppercase leading-tight group-hover:text-[#947c4c] transition-colors">
                                        {product.name?.split(' ')[0]}
                                    </p>
                                    <p className="hidden lg:block text-xs font-black text-slate-900 dark:text-white truncate uppercase leading-tight group-hover:text-[#947c4c] transition-colors">
                                        {product.name}
                                    </p>
                                    <div className="flex justify-between items-end mt-2">
                                        <p className="text-sm font-black" style={{ color: '#75787B' }}>R$ {product.price?.toFixed(2)}</p>
                                        <p className="text-[9px] font-black uppercase text-slate-400">
                                            {product.quantity} un
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {previewProduct && (
                <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-0 md:p-6 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-zinc-950 md:rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-full md:h-[85vh] border border-white/5 relative">
                        <button 
                            onClick={() => setPreviewProduct(null)}
                            className="absolute top-3 right-3 md:top-6 md:right-6 z-50 p-1.5 md:p-4 bg-black/40 hover:bg-black/60 backdrop-blur-xl text-white rounded-full transition-all border border-white/10 shadow-lg active:scale-90"
                        >
                            <X size={14} className="md:w-6 md:h-6" />
                        </button>
                        <div 
                            className="flex-1 relative bg-zinc-50 dark:bg-black flex items-center justify-center group overflow-hidden touch-pan-y"
                            onTouchStart={(e) => {
                                touchStartRef.current = e.touches[0].clientX;
                            }}
                            onTouchEnd={(e) => {
                                if (touchStartRef.current === null) return;
                                const touchEnd = e.changedTouches[0].clientX;
                                const diff = touchStartRef.current - touchEnd;
                                const images = [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean);
                                
                                if (Math.abs(diff) > 50) {
                                    if (diff > 0) setActiveImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
                                    else setActiveImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
                                }
                                touchStartRef.current = null;
                            }}
                        >
                            <img 
                                src={sanitizeImageUrl([previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean)[activeImageIndex] as string || '')} 
                                alt={previewProduct.name}
                                className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-700 select-none pointer-events-none"
                                referrerPolicy="no-referrer"
                            />
                            {[previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean).length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const images = [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean);
                                            setActiveImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
                                        }}
                                        className="absolute left-6 top-1/2 -translate-y-1/2 p-5 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-[2rem] transition-all border border-white/10 active:scale-95 z-10 hidden lg:flex"
                                    >
                                        <ChevronLeft size={32} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const images = [previewProduct.imageUrl, ...(previewProduct.imageUrls || [])].filter(Boolean);
                                            setActiveImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
                                        }}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 p-5 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-[2rem] transition-all border border-white/10 active:scale-95 z-10 hidden lg:flex"
                                    >
                                        <ChevronRight size={32} />
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="absolute top-6 left-6 right-20 sm:static sm:p-12 sm:pb-8 sm:bg-white sm:dark:bg-zinc-950 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pointer-events-auto sm:z-auto z-20">
                            <div>
                                <h2 className="text-xl sm:text-5xl font-black text-black sm:text-slate-900 dark:text-white uppercase tracking-tighter drop-shadow-md sm:drop-shadow-none leading-none mb-1 sm:mb-4">{previewProduct.name}</h2>
                                <p className="text-xs sm:text-sm font-black text-[#947c4c] sm:text-slate-400 uppercase tracking-widest drop-shadow-md sm:drop-shadow-none">{previewProduct.category || "Produto"}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Preço Atual</p>
                                    <p className="text-4xl font-black text-[#947c4c]">R$ {previewProduct.price?.toFixed(2) || '0.00'}</p>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(previewProduct);
                                        setPreviewProduct(null);
                                    }}
                                    className="bg-[#947c4c] text-white pl-8 pr-6 rounded-[2rem] h-20 flex items-center justify-center gap-4 hover:bg-[#867045] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#947c4c]/30 disabled:opacity-50"
                                >
                                    <span className="text-base font-black tracking-widest uppercase">Reservar</span>
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                                        <Plus size={24} />
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="sm:hidden absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-auto z-20">
                            <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-[2rem] border border-white/10 shadow-lg">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Preço</p>
                                <p className="text-2xl font-black text-white drop-shadow-sm">R$ {previewProduct.price?.toFixed(2) || '0.00'}</p>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(previewProduct);
                                    setPreviewProduct(null);
                                }}
                                className="bg-[#947c4c] text-white p-6 rounded-[2rem] hover:bg-[#867045] active:scale-90 transition-all shadow-xl border border-white/20"
                            >
                                <Plus size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Carrinho */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-zinc-950 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Cart Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-zinc-900 flex justify-between items-center bg-slate-50 dark:bg-zinc-900">
                            <h2 className="text-sm font-black uppercase tracking-widest text-[#947c4c] flex items-center gap-2">
                                <ShoppingCart size={20} /> Lista de Reserva
                            </h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-white rounded-xl shadow-sm">
                                <Minus size={20} className="rotate-45" /> {/* Use minus rotated to act as X intentionally or lucide X */}
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-20 opacity-50 flex flex-col items-center">
                                     <ShoppingCart size={40} className="mb-4" />
                                     <p className="text-xs font-black uppercase tracking-widest">Sua lista está vazia</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.product.id} className="flex gap-4 p-3 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm">
                                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
                                             {item.product.imageUrl ? (
                                                 <img src={sanitizeImageUrl(item.product.imageUrl)} alt="" className="w-full h-full object-cover" />
                                             ) : (
                                                 <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-slate-300"/></div>
                                             )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xs font-black text-slate-900 uppercase leading-snug">{item.product.name}</h3>
                                                <button onClick={() => removeFromCart(item.product.id)} className="text-rose-400 hover:text-rose-600 bg-rose-50 p-1.5 rounded-lg ml-2 active:scale-95 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            
                                            <div className="flex justify-between items-end mt-2">
                                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 text-slate-500 hover:text-slate-900 bg-white rounded-md shadow-sm active:scale-95"><Minus size={14} /></button>
                                                    <span className="text-[11px] font-black w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 text-slate-500 hover:text-slate-900 bg-white rounded-md shadow-sm active:scale-95"><Plus size={14} /></button>
                                                </div>
                                                <span className="text-xs font-black text-[#947c4c]">R$ {((item.product.price || 0) * item.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Checkout Footer */}
                        {cart.length > 0 && (
                            <div className="p-6 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200">
                                <div className="space-y-4 mb-6">
                                     <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500">Seu Nome Completo</label>
                                        <input 
                                            type="text" 
                                            value={checkoutName}
                                            onChange={e => setCheckoutName(e.target.value)}
                                            className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-xs font-black text-slate-900 outline-none focus:border-black uppercase transition-colors"
                                            placeholder="MARIA SILVA"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500">Seu WhatsApp</label>
                                        <input 
                                            type="tel" 
                                            value={checkoutPhone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                let formatted = val;
                                                if(val.length > 2) formatted = `(${val.slice(0,2)}) ${val.slice(2)}`;
                                                if(val.length > 7) formatted = `(${val.slice(0,2)}) ${val.slice(2,7)}-${val.slice(7,11)}`;
                                                setCheckoutPhone(formatted);
                                            }}
                                            maxLength={15}
                                            className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-xs font-black text-slate-900 outline-none focus:border-black uppercase transition-colors"
                                            placeholder="(11) 90000-0000"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total da Reserva</span>
                                    <span className="text-xl font-black text-[#947c4c]">R$ {cartTotal.toFixed(2)}</span>
                                </div>

                                <button 
                                    onClick={handleCheckout}
                                    disabled={isSubmitting || cart.length === 0}
                                    className="w-full bg-[#947c4c] text-white p-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-[#867045] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[#947c4c]/20"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Concluindo...</>
                                    ) : (
                                        <>Finalizar e Enviar via WhatsApp <ArrowRight size={18} /></>
                                    )}
                                </button>
                                <p className="text-center text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-4">
                                    Você não fará nenhum pagamento agora.<br/>Isto apenas reservará a peça escolhida.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Modal de Sucesso - Padrão Aminna */}
            {isSuccessModalOpen && (
                <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-8 md:p-12 w-full max-w-lg text-center shadow-2xl border border-white/10 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 shadow-inner">
                            <CheckCircle2 size={48} />
                        </div>
                        
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 leading-none">
                            Reserva Realizada!
                        </h2>
                        
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                            Sua peça já foi separada. Para concluir sua reserva, basta clicar no botão abaixo para confirmar os detalhes via WhatsApp com nossa equipe.
                        </p>

                        <button
                            onClick={() => {
                                window.location.href = finalWpLink;
                                setIsSuccessModalOpen(false);
                            }}
                            className="w-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 p-6 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
                        >
                            Confirmar no WhatsApp <ArrowRight size={20} />
                        </button>

                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8">
                            Obrigado por escolher a Aminna
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
