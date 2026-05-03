
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Target, DollarSign,
  Eye, MousePointer, BarChart3, RefreshCw, ChevronDown, ChevronUp,
  CircleCheck, CircleX, Pause, Play, ArrowUpRight, ArrowDownRight,
  Megaphone, Users, Activity, Info, Filter, Calendar, Layers, FileText,
  Instagram, Plus, Edit2, ArrowUp, Ticket, X, ChevronRight, MessageSquare, ShieldCheck, Presentation
} from 'lucide-react';

import { InstagramOrganic } from './InstagramOrganic';
import { MarketingReports } from './MarketingReports';
import { supabase } from '../services/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cpa: number;
  roas: number;
  frequency: number;
  reach: number;
  date_start: string;
  daily_budget?: number;
  lifetime_budget?: number;
  results?: { count: number; name: string };
  cost_per_result?: number;
  result_name?: string;
}

interface AdSet {
  id: string;
  campaign_id: string;
  campaign_name: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cpa: number;
  frequency: number;
}

interface AdInsight {
  id: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  creative?: { thumbnail_url?: string };
  quality_ranking?: string;
}

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const CAMPAIGN_FIELDS = [
  'id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget',
  'insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,purchase_roas,frequency,reach,actions,action_values,date_start,date_stop}'
].join(',');

const ADSET_FIELDS = [
  'id', 'name', 'status', 'campaign_id', 'campaign{name}', 'targeting',
  'insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,frequency}'
].join(',');

const AD_FIELDS = [
  'id', 'name', 'status', 'adset_id', 'adset{name}', 'campaign_id', 'campaign{name}',
  'insights.date_preset(last_30d){spend,impressions,clicks,ctr,conversions,cost_per_conversion,quality_ranking,engagement_rate_ranking}',
  'creative{thumbnail_url}'
].join(',');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  currency: (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  number: (v: number, dec = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
  percent: (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
};

function parseInsight(insight: any) {
  const actions = insight?.actions || [];
  const getActionValue = (type: string) => parseFloat(String(actions.find((a: any) => a.action_type === type)?.value || 0));

  const conversions = getActionValue('purchase') + getActionValue('lead') + getActionValue('complete_registration') + getActionValue('omni_purchase');
  const landingPageViews = getActionValue('landing_page_view');
  const addToCart = getActionValue('add_to_cart');
  const initiateCheckout = getActionValue('initiate_checkout');

  const convValue = (insight?.action_values || []).find((a: any) => ['purchase', 'omni_purchase'].includes(a.action_type))?.value || 0;
  const spend = parseFloat(insight?.spend || '0');
  const impressions = parseInt(insight?.impressions || '0', 10);
  const clicks = parseInt(insight?.clicks || '0', 10);
  const roas = spend > 0 && convValue > 0 ? parseFloat(String(convValue)) / spend : 0;

  return {
    spend,
    impressions,
    clicks,
    ctr: parseFloat(insight?.ctr || '0'),
    cpc: parseFloat(insight?.cpc || '0'),
    cpm: parseFloat(insight?.cpm || '0'),
    conversions,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas,
    frequency: parseFloat(insight?.frequency || '0'),
    reach: parseInt(insight?.reach || '0', 10),
    date_start: insight?.date_start || '',
    date_stop: insight?.date_stop || '',
    lpv: landingPageViews,
    atc: addToCart,
    ic: initiateCheckout,
  };
}

async function fetchFromMeta(token: string, endpoint: string, params: Record<string, string>) {
  const url = new URL(`${META_GRAPH_URL}/${endpoint}`);
  url.searchParams.set('access_token', token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const KPICard = ({
  label, value, sub, icon: Icon, trend, trendLabel, color = 'indigo', danger = false, warning = false
}: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  trend?: number; trendLabel?: string; color?: string; danger?: boolean; warning?: boolean;
}) => {
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-violet-600',
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600',
    sky: 'from-sky-500 to-blue-600',
    purple: 'from-purple-500 to-indigo-600',
  };
  const grad = danger ? 'from-rose-500 to-rose-700' : warning ? 'from-amber-500 to-orange-600' : colorMap[color] || colorMap.indigo;
  return (
    <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl border ${danger ? 'border-rose-200 dark:border-rose-900' : warning ? 'border-amber-200 dark:border-amber-900' : 'border-slate-100 dark:border-zinc-800'} p-3 sm:p-4 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300 h-full`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${grad} opacity-5 rounded-full -translate-y-6 translate-x-6 group-hover:opacity-10 transition-opacity`} />
      <div className="flex items-start justify-between mb-2">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md`}>
          <Icon size={14} className="text-white sm:w-[16px] sm:h-[16px]" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg ${trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
            {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1 truncate">{value}</p>
      <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
      {sub && <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
      {trendLabel && <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{trendLabel}</p>}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'Ativa', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
    PAUSED: { label: 'Pausada', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    DELETED: { label: 'Excluída', cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
    ARCHIVED: { label: 'Arquivada', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
  };
  const s = map[status] || { label: status, cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600' };
  return <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
};

const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div className="mb-4">
    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{children}</h3>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const NewClientTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-zinc-800 p-4 border border-slate-100 dark:border-zinc-700 shadow-xl rounded-2xl min-w-[200px]">
        <p className="font-black text-slate-900 dark:text-white text-xs uppercase mb-3 border-b border-slate-50 dark:border-zinc-700 pb-2">{label}</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível: Novos Clientes</p>
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Clientes:</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">{data.value || 0}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Valor:</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">R$ {(data.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Cupons:</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">{data.coupons || 0}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Serviços:</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">{data.services || 0}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CouponsModal = ({ couponsListData, onClose, getDateLabel }: any) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 md:rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-full md:h-[80vh] overflow-hidden border-black dark:border-zinc-700 flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 md:px-8 md:py-6 bg-zinc-950 dark:bg-black text-white flex justify-between items-center">
          <div>
            <h3 className="font-black uppercase text-xs md:text-sm tracking-widest flex items-center gap-2">
              <Ticket size={18} className="text-amber-500" /> Detalhamento de Cupons Usados
            </h3>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Total de Cupons: <span className="text-amber-400">{couponsListData.length}</span> | Período: {getDateLabel()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Código</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissional</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tíquete</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviços</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
                    {couponsListData.map((row: any) => (
                      <tr key={row.id} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-black text-xs uppercase text-slate-900 dark:text-white">{row.name}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter ${row.isNew ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                              {row.isNew ? 'Novo Cliente' : 'Recorrente'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-500">{new Date(row.date).toLocaleDateString('pt-BR')}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/30 text-[10px] font-black text-amber-600 dark:text-amber-400">
                            {row.couponCode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 uppercase">{row.professional}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-emerald-600">R$ {row.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 leading-tight line-clamp-2">{row.services}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {couponsListData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 uppercase tracking-widest font-black text-xs gap-4 opacity-50">
              <Ticket size={48} strokeWidth={1} />
              Nenhum cupom utilizado no período
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const TOKEN_STORAGE_KEY = 'meta_ads_token';
const ACCOUNT_STORAGE_KEY = 'meta_ads_account_id';

export const Marketing: React.FC<{ appointments: any[], customers: any[], services: any[], providers?: any[], partnerCampaigns?: any[] }> = ({ appointments = [], customers = [], services = [], providers = [], partnerCampaigns = [] }) => {
  const [activeMarketingTab, setActiveMarketingTab] = useState<'paid' | 'organic' | 'reports'>(() => 
    (localStorage.getItem('active_marketing_tab') as 'paid' | 'organic' | 'reports') || 'paid'
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // Persistence to Supabase
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.from('marketing_config').select('*').maybeSingle();
        if (error) throw error;
        if (data) {
          if (data.meta_token) {
            setToken(data.meta_token);
            localStorage.setItem(TOKEN_STORAGE_KEY, data.meta_token);
          }
          if (data.ad_account_id) {
            setAdAccountId(data.ad_account_id);
            localStorage.setItem(ACCOUNT_STORAGE_KEY, data.ad_account_id);
          }
        }
      } catch (e) { console.error("Error loading marketing config", e); }
    };
    fetchConfig();
  }, []);

  const persistToDB = async (newToken?: string, newAccountId?: string) => {
    try {
      await supabase.from('marketing_config').upsert({
        id: '00000000-0000-0000-0000-000000000001',
        meta_token: newToken || token,
        ad_account_id: newAccountId || adAccountId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) { console.error("Error persisting to DB", e); }
  };

  useEffect(() => {
    localStorage.setItem('active_marketing_tab', activeMarketingTab);
  }, [activeMarketingTab]);

  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<AdInsight[]>([]);
  const [adAccountId, setAdAccountId] = useState<string>(() => localStorage.getItem(ACCOUNT_STORAGE_KEY) || '');
  const [adAccounts, setAdAccounts] = useState<{ id: string; name: string; account_id: string }[]>([]);
  const [selectedIgAccountId, setSelectedIgAccountId] = useState<string>(() => localStorage.getItem('selected_ig_account_id') || '');
  const [igAccounts, setIgAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);

  const [datePreset, setDatePreset] = useState('last_30d');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState<{ start: string; stop: string }>({ start: '', stop: '' });
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  const [dailyTimeSeries, setDailyTimeSeries] = useState<any[]>([]);

  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showTokenPanel, setShowTokenPanel] = useState<boolean>(false);

  const saveToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    localStorage.setItem(TOKEN_STORAGE_KEY, t);
    setToken(t);
    persistToDB(t);
    setTokenInput('');
    setShowTokenPanel(false);
    setError(null);
    setAdAccounts([]);
    setAdAccountId('');
    setHasFetched(false);
  };

  const [permissions, setPermissions] = useState<any[]>([]);
  const [checkingPerms, setCheckingPerms] = useState(false);

  const checkPermissions = async () => {
    if (!token) return;
    setCheckingPerms(true);
    try {
      const resp = await fetch(`${META_GRAPH_URL}/me/permissions?access_token=${token}`);
      const data = await resp.json();
      setPermissions(data.data || []);
    } catch (e) {
      console.error("Perms check failed", e);
    } finally {
      setCheckingPerms(false);
    }
  };

  const clearToken = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    setToken('');
    setAdAccounts([]);
    setAdAccountId('');
    setCampaigns([]);
    setAdSets([]);
    setAds([]);
    setHasFetched(false);
    setError(null);
  };

  useEffect(() => {
    if (token) fetchAdAccounts(token);
  }, [token]);

  const fetchAdAccounts = async (accessToken: string) => {
    try {
      const resp = await fetch(`${META_GRAPH_URL}/me/adaccounts?access_token=${accessToken}&fields=name,id,account_id`);
      const data = await resp.json();
      if (data.data && data.data.length > 0) {
        setAdAccounts(data.data);
        if (!adAccountId || !data.data.find((a: any) => a.id === adAccountId)) {
          const firstId = data.data[0].id;
          setAdAccountId(firstId);
          localStorage.setItem(ACCOUNT_STORAGE_KEY, firstId);
        }
      }

      // 1. Fetch IG Accounts from Pages
      const igResp = await fetch(`${META_GRAPH_URL}/me/accounts?access_token=${accessToken}&fields=instagram_business_account{id,name,username},name&limit=100`);
      const igData = await igResp.json();
      
      const igFromPages = (igData.data || [])
        .filter((p: any) => p.instagram_business_account)
        .map((p: any) => ({
          id: p.instagram_business_account.id,
          name: p.instagram_business_account.name || p.instagram_business_account.username || p.name
        }));

      // 2. Fetch IG Accounts from Ad Accounts (often more complete)
      const adIgResp = await fetch(`${META_GRAPH_URL}/me/adaccounts?access_token=${accessToken}&fields=instagram_accounts{id,name,username},name&limit=50`);
      const adIgData = await adIgResp.json();
      
      const igFromAds: any[] = [];
      (adIgData.data || []).forEach((ad: any) => {
         if (ad.instagram_accounts?.data) {
           ad.instagram_accounts.data.forEach((ig: any) => {
              igFromAds.push({
                id: ig.id,
                name: ig.name || ig.username || ad.name
              });
           });
         }
      });
      
      const allIgs = [...igFromPages, ...igFromAds];
      
      // Ensure we don't have duplicates
      const uniqueIgs = Array.from(new Map(allIgs.map(item => [item.id, item])).values());
      setIgAccounts(uniqueIgs);
      if (uniqueIgs.length > 0 && (!selectedIgAccountId || !uniqueIgs.find(i => i.id === selectedIgAccountId))) {
        setSelectedIgAccountId(uniqueIgs[0].id);
        localStorage.setItem('selected_ig_account_id', uniqueIgs[0].id);
      }
    } catch (e: any) {
      setError(`Erro ao buscar contas: ${e.message}`);
    }
  };

  const isAppointmentInMarketingPeriod = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.split('T')[0];
    
    if (datePreset === 'lifetime') return true;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let start = datePreset === 'custom' ? customStartDate : dateRange.start;
    let end = datePreset === 'custom' ? customEndDate : todayStr; // Default to today for appointments
    
    if (datePreset !== 'custom') {
      if (datePreset === 'last_7d') {
        const d = new Date(); d.setDate(d.getDate() - 7); start = d.toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'last_30d') {
        const d = new Date(); d.setDate(d.getDate() - 30); start = d.toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'last_90d') {
        const d = new Date(); d.setDate(d.getDate() - 90); start = d.toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'this_month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'last_month') {
        const d = new Date(); d.setDate(0);
        end = d.toISOString().split('T')[0];
        start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      } else if (datePreset === 'this_year') {
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = todayStr;
      }
    }
    
    if (start && end) {
      return cleanDate >= start && cleanDate <= end;
    }
    
    return true;
  }, [datePreset, customStartDate, customEndDate, dateRange.start]);

  const firstVisits = useMemo(() => {
    const visits: Record<string, { date: string }> = {};
    customers.forEach(c => {
      const customerApps = appointments.filter(a => a.customerId === c.id && a.status === 'Concluído');
      if (customerApps.length > 0) {
        const sorted = [...customerApps].sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (a.time || '').localeCompare(b.time || '');
        });
        visits[c.id] = { date: sorted[0].date };
      }
    });
    return visits;
  }, [customers, appointments]);

  const trafficChartData = useMemo(() => {
    const dailyData: Record<string, { count: number, recurring: number, services: number, recurringServices: number, revenue: number, recurringRevenue: number, coupons: number, recurringCoupons: number }> = {};
    
    Object.values(firstVisits).forEach((v: any) => {
      if (isAppointmentInMarketingPeriod(v.date)) {
        dailyData[v.date] = dailyData[v.date] || { count: 0, recurring: 0, services: 0, recurringServices: 0, revenue: 0, recurringRevenue: 0, coupons: 0, recurringCoupons: 0 };
        dailyData[v.date].count++;
      }
    });

    appointments.filter(a => a.status === 'Concluído' && isAppointmentInMarketingPeriod(a.date)).forEach(a => {
      const fv = firstVisits[a.customerId];
      const svc = services.find(s => s.id === a.serviceId);
      const appRevenue = (a.pricePaid ?? a.bookedPrice ?? svc?.price ?? 0) + (a.additionalServices || []).reduce((sum: number, extra: any) => sum + (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0), 0);

      if (fv && fv.date !== a.date) {
        dailyData[a.date] = dailyData[a.date] || { count: 0, recurring: 0, services: 0, recurringServices: 0, revenue: 0, recurringRevenue: 0, coupons: 0, recurringCoupons: 0 };
        dailyData[a.date].recurring++;
        dailyData[a.date].recurringRevenue += appRevenue;
        dailyData[a.date].recurringServices += (1 + (a.additionalServices || []).length);
        if (a.appliedCoupon) dailyData[a.date].recurringCoupons++;
      } else if (fv && fv.date === a.date) {
        dailyData[a.date] = dailyData[a.date] || { count: 0, recurring: 0, services: 0, recurringServices: 0, revenue: 0, recurringRevenue: 0, coupons: 0, recurringCoupons: 0 };
        dailyData[a.date].revenue += appRevenue;
        dailyData[a.date].services += (1 + (a.additionalServices || []).length);
        if (a.appliedCoupon) dailyData[a.date].coupons++;
      }
    });

    let start = datePreset === 'custom' ? customStartDate : dateRange.start;
    let end = datePreset === 'custom' ? customEndDate : dateRange.stop;
    
    if (datePreset !== 'custom') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      if (datePreset === 'last_7d') {
        const d = new Date(); d.setDate(d.getDate() - 7); start = d.toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'last_30d') {
        const d = new Date(); d.setDate(d.getDate() - 30); start = d.toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'last_90d') {
        const d = new Date(); d.setDate(d.getDate() - 90); start = d.toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'this_month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'last_month') {
        const d = new Date(); d.setDate(0);
        end = d.toISOString().split('T')[0];
        start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      } else if (datePreset === 'this_year') {
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = todayStr;
      } else if (datePreset === 'lifetime') {
        end = todayStr;
      }
    }

    if (!start || !end) return [];

    const data = [];
    let curr = new Date(start + 'T12:00:00');
    const last = new Date(end + 'T12:00:00');
    
    while (curr <= last) {
      const dStr = curr.toISOString().split('T')[0];
      const day = dailyData[dStr] || { count: 0, recurring: 0, services: 0, recurringServices: 0, revenue: 0, recurringRevenue: 0, coupons: 0, recurringCoupons: 0 };
      data.push({
        name: curr.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value: day.count,
        recurring: day.recurring,
        services: day.services,
        recurringServices: day.recurringServices,
        revenue: day.revenue,
        recurringRevenue: day.recurringRevenue,
        coupons: day.coupons,
        recurringCoupons: day.recurringCoupons
      });
      curr.setDate(curr.getDate() + 1);
    }
    return data;
  }, [firstVisits, appointments, isAppointmentInMarketingPeriod, customStartDate, customEndDate, dateRange, services]);

  const couponsListData = useMemo(() => {
    return appointments
        .filter(a => a.status === 'Concluído' && a.appliedCoupon && isAppointmentInMarketingPeriod(a.date))
        .map(a => {
            const customer = customers.find(c => c.id === a.customerId);
            const professional = providers.find(p => p.id === a.providerId)?.name || 'N/A';
            const svc = services.find(s => s.id === a.serviceId);
            const servicesNames = [svc?.name || 'Serviço', ...(a.additionalServices || []).map((extra: any) => services.find(s => s.id === extra.serviceId)?.name).filter(Boolean)].join(', ');
            const revenue = (a.pricePaid ?? a.bookedPrice ?? svc?.price ?? 0) + (a.additionalServices || []).reduce((sum: number, extra: any) => sum + (extra.bookedPrice ?? services.find(s => s.id === extra.serviceId)?.price ?? 0), 0);
            const isNew = firstVisits[a.customerId]?.date === a.date;

            return {
                id: a.id,
                customerId: a.customerId,
                name: customer?.name || 'Sem Nome',
                date: a.date,
                professional,
                services: servicesNames,
                revenue,
                couponCode: a.appliedCoupon,
                isNew
            };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments, customers, services, providers, firstVisits, isAppointmentInMarketingPeriod]);

  const fetchAll = useCallback(async () => {
    if (!adAccountId || !token) return;
    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const dailyPreset = datePreset === 'custom' ? '' : `.date_preset(${datePreset})`;
      const timeRange = datePreset === 'custom' ? `{"since":"${customStartDate}","until":"${customEndDate}"}` : '';

      const isLifetime = datePreset === 'lifetime';
      const insightsField = isLifetime 
        ? 'insights.date_preset(lifetime){spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,actions,frequency,reach,purchase_roas,date_start}'
        : `insights${dailyPreset}${timeRange ? `.time_range(${timeRange})` : ''}{spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,actions,frequency,reach,purchase_roas,date_start}`;

      const params: any = {
        fields: `id,name,status,effective_status,objective,daily_budget,lifetime_budget,${insightsField}`,
        limit: '500',
      };

      const campData = await fetchFromMeta(token, `${adAccountId}/campaigns`, params);

      const parsedCampaigns: MetaCampaign[] = (campData.data || []).map((c: any) => {
        const ins = c.insights?.data?.[0] || {};
        const roasObj = ins.purchase_roas?.find((r: any) => r.action_type === 'purchase') || ins.purchase_roas?.[0];
        
        // Dynamic Results Extractor
        const actions = ins.actions || [];
        // Search for primary results (Lead, Message, Conversion)
        const primaryRes = actions.find((a: any) => 
           a.action_type.includes('messaging_conversation_started') || 
           a.action_type === 'lead' || 
           a.action_type === 'purchase'
        ) || actions.find((a: any) => a.action_type === 'post_engagement') || actions[0];

        let resultName = 'Resultado';
        if (primaryRes) {
           const type = primaryRes.action_type;
           if (type.includes('messaging_conversation_started')) resultName = 'Conversas por mensagem';
           else if (type === 'lead') resultName = 'Leads';
           else if (type === 'purchase') resultName = 'Compras';
           else if (type === 'post_engagement') resultName = 'Engajamento com a publicação';
           else resultName = type.split('.').pop()?.replace(/_/g, ' ') || 'Resultado';
        }

        return {
          id: c.id,
          name: c.name,
          status: c.effective_status || c.status,
          objective: c.objective,
          daily_budget: c.daily_budget ? Number(c.daily_budget) : undefined,
          lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : undefined,
          spend: Number(ins.spend || 0),
          impressions: Number(ins.impressions || 0),
          clicks: Number(ins.clicks || 0),
          ctr: Number(ins.ctr || 0),
          cpc: Number(ins.cpc || 0),
          cpm: Number(ins.cpm || 0),
          conversions: Number(ins.conversions || 0),
          cpa: Number(ins.cost_per_conversion || 0),
          roas: Number(roasObj?.value || 0),
          frequency: Number(ins.frequency || 0),
          reach: Number(ins.reach || 0),
          date_start: ins.date_start,
          results: primaryRes ? {
            count: Number(primaryRes.value),
            name: resultName
          } : undefined,
          result_name: resultName,
          cost_per_result: (primaryRes && Number(primaryRes.value) > 0) ? Number(ins.spend) / Number(primaryRes.value) : undefined
        };
      });
      setCampaigns(parsedCampaigns);

      const adSetFields = [
        'id', 'name', 'status', 'campaign_id', 'campaign{name}', 'targeting',
        `insights${dailyPreset}${timeRange ? `.time_range(${timeRange})` : ''}{spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,frequency}`
      ].join(',');

      const adsetData = await fetchFromMeta(token, `${adAccountId}/adsets`, {
        fields: adSetFields,
        limit: '200',
      });

      const parsedAdSets: AdSet[] = (adsetData.data || []).map((a: any) => {
        const insight = a.insights?.data?.[0];
        let targetingDesc = '—';
        if (a.targeting) {
           const parts = [];
           if (a.targeting.age_min) parts.push(`${a.targeting.age_min}-${a.targeting.age_max || '65+'} anos`);
           if (a.targeting.genders && a.targeting.genders.length === 1) parts.push(a.targeting.genders[0] === 1 ? 'Homens' : 'Mulheres');
           if (a.targeting.custom_audiences) parts.push('Público Personalizado');
           if (a.targeting.flexible_spec && a.targeting.flexible_spec.length > 0) parts.push('Interesses Detalhados');
           else if (a.targeting.geo_locations?.cities) parts.push(`${a.targeting.geo_locations.cities.length} Cidades`);
           targetingDesc = parts.join(' • ') || 'Aberto / Broad';
        }
        return {
          id: a.id,
          campaign_id: a.campaign_id,
          campaign_name: a.campaign?.name || '—',
          name: a.name,
          targeting_desc: targetingDesc,
          status: a.status,
          ...parseInsight(insight),
        };
      });
      setAdSets(parsedAdSets);

      const adFields = [
        'id', 'name', 'status', 'adset_id', 'adset{name}', 'campaign_id', 'campaign{name}',
        `insights${dailyPreset}${timeRange ? `.time_range(${timeRange})` : ''}{spend,impressions,clicks,ctr,conversions,cost_per_conversion,quality_ranking,engagement_rate_ranking}`,
        'creative{thumbnail_url}'
      ].join(',');

      const adData = await fetchFromMeta(token, `${adAccountId}/ads`, {
        fields: adFields,
        limit: '200',
      });

      const parsedAds: AdInsight[] = (adData.data || []).map((ad: any) => {
        const insight = ad.insights?.data?.[0];
        return {
          id: ad.id,
          adset_id: ad.adset_id,
          adset_name: ad.adset?.name || '—',
          campaign_id: ad.campaign_id,
          campaign_name: ad.campaign?.name || '—',
          name: ad.name,
          status: ad.status,
          creative: ad.creative,
          quality_ranking: insight?.quality_ranking || 'UNKNOWN',
          ...parseInsight(insight),
        };
      });
      setAds(parsedAds);

      try {
        const insightParams: any = {
          time_increment: '1',
          fields: 'spend,impressions,clicks,conversions,date_start,date_stop',
        };

        if (datePreset === 'custom') {
          insightParams.time_range = JSON.stringify({ since: customStartDate, until: customEndDate });
        } else {
          insightParams.date_preset = datePreset;
        }

        const dailyData = await fetchFromMeta(token, `${adAccountId}/insights`, insightParams);
        const timeseries = (dailyData.data || []).map((d: any) => ({
          day: d.date_start.split('-').slice(1).reverse().join('/'),
          spend: parseFloat(d.spend || '0'),
          impressions: parseInt(d.impressions || '0', 10),
          clicks: parseInt(d.clicks || '0', 10),
        }));
        setDailyTimeSeries(timeseries);
        
        if (timeseries.length > 0) {
           setDateRange({ 
             start: dailyData.data[0].date_start, 
             stop: dailyData.data[dailyData.data.length - 1].date_stop 
           });
        }
      } catch (e) { console.error("Error fetching daily stats", e); }

    } catch (e: any) {
      setError(`Erro ao buscar dados da Meta API: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, token, datePreset, customStartDate, customEndDate]);

  useEffect(() => {
    if (token && adAccountId && (activeMarketingTab === 'paid' || activeMarketingTab === 'reports')) {
      fetchAll();
    }
  }, [token, adAccountId, fetchAll, activeMarketingTab]);

  const getMatchingCouponAppts = (cName: string) => {
    const nameLower = cName.toLowerCase();
    
    // Only conversation/lead/booking campaigns should have CRM revenue
    const isConversionCampaign = nameLower.includes('conversas') || 
                                 nameLower.includes('lead') || 
                                 nameLower.includes('cupom agendamento') ||
                                 (nameLower.includes('trafego') && !nameLower.includes('manicures') && !nameLower.includes('seguidores'));

    if (!isConversionCampaign) return [];

    return appointments.filter(a => {
        if (a.status !== 'Concluído' || !isAppointmentInMarketingPeriod(a.date)) return false;
        
        const isNewCustomer = firstVisits[a.customerId]?.date === a.date;
        if (!isNewCustomer) return false; // Only new customers generate CRM return for campaigns

        const coupon = a.appliedCoupon ? a.appliedCoupon.toLowerCase().trim() : '';
        
        // Match specific coupons if they are in the campaign name
        if (coupon && nameLower.includes(coupon)) return true;
        
        // Generic matching for booking campaigns
        if (nameLower.includes('cupom agendamento') || nameLower.includes('trafego')) {
            const isPartnerCoupon = coupon && partnerCampaigns.some((pc: any) => pc.couponCode && pc.couponCode.toLowerCase().trim() === coupon);
            // If it's not a partner coupon and we have a generic traffic campaign, we count it
            // but we avoid including it if it's clearly another type of campaign
            if (!isPartnerCoupon || coupon === 'aminnavip') return true;
        }
        return false;
    });
  };

  const campaignsWithCRM = useMemo(() => {
    return campaigns.map(c => {
      const nameLower = c.name.toLowerCase();
      const matchingCouponAppts = getMatchingCouponAppts(c.name);
      
      const crmRevenue = matchingCouponAppts.reduce((sum, a) => {
        const svc = services.find(s => s.id === a.serviceId);
        const rev = (a.pricePaid ?? a.bookedPrice ?? svc?.price ?? 0) + (a.additionalServices || []).reduce((s: number, ex: any) => s + (ex.bookedPrice ?? services.find(srv => srv.id === ex.serviceId)?.price ?? 0), 0);
        return sum + rev;
      }, 0);

      // Classification
      const isFollower = nameLower.includes('seguidores');
      const isManicure = nameLower.includes('manicures');
      const isConversation = !isFollower && !isManicure && (nameLower.includes('conversas') || nameLower.includes('lead') || nameLower.includes('cupom') || nameLower.includes('trafego'));

      // Override result name for specific campaigns
      const updatedResults = c.results ? {
        ...c.results,
        name: isFollower ? 'Seguidores Novos' : isManicure ? 'Candidatas' : c.results.name
      } : undefined;

      return { 
        ...c, 
        results: updatedResults,
        crmRevenue: isConversation ? crmRevenue : 0, 
        crmROI: (isConversation && c.spend > 0) ? crmRevenue / c.spend : 0
      };
    });
  }, [campaigns, appointments, services, firstVisits, partnerCampaigns]);

  const activeCampaigns = campaignsWithCRM.filter(c => c.status === 'ACTIVE');
  const totalSpend = campaignsWithCRM.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaignsWithCRM.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaignsWithCRM.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaignsWithCRM.reduce((s, c) => {
    const matchingCouponAppts = getMatchingCouponAppts(c.name);
    return s + matchingCouponAppts.length;
  }, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const totalCRMRevenue = campaignsWithCRM.reduce((s, c) => s + c.crmRevenue, 0);
  const totalROAS = totalSpend > 0 ? totalCRMRevenue / totalSpend : 0;
  
  const totalMessageStarts = campaignsWithCRM.reduce((s, c) => {
    const nameLower = c.name.toLowerCase();
    const isFollower = nameLower.includes('seguidores');
    const isManicure = nameLower.includes('manicures');
    const isLeadConversion = !isFollower && !isManicure && (nameLower.includes('conversas') || nameLower.includes('lead') || nameLower.includes('cupom') || nameLower.includes('trafego'));
    
    return isLeadConversion ? s + (c.results?.count || 0) : s;
  }, 0);

  const conversionSpend = campaignsWithCRM.reduce((s, c) => {
    const nameLower = c.name.toLowerCase();
    const isFollower = nameLower.includes('seguidores');
    const isManicure = nameLower.includes('manicures');
    const isLeadConversion = !isFollower && !isManicure && (nameLower.includes('conversas') || nameLower.includes('lead') || nameLower.includes('cupom') || nameLower.includes('trafego'));
    
    return isLeadConversion ? s + c.spend : s;
  }, 0);

  const avgCostPerResult = totalMessageStarts > 0 ? conversionSpend / totalMessageStarts : 0;
  const totalNewCustomersCRM = totalConversions;
  const avgTicketMarketing = totalNewCustomersCRM > 0 ? totalCRMRevenue / totalNewCustomersCRM : 0;

  const highFrequency = campaignsWithCRM.filter(c => c.frequency > 3 && c.status === 'ACTIVE');
  const lowCTR = campaignsWithCRM.filter(c => c.ctr < 1 && c.impressions > 1000 && c.status === 'ACTIVE');
  const highCPA = campaignsWithCRM.filter(c => c.cpa > avgCPA * 2 && c.cpa > 0 && c.status === 'ACTIVE');
  const zeroConversions = campaignsWithCRM.filter(c => {
    const matchingCouponAppts = getMatchingCouponAppts(c.name);
    return matchingCouponAppts.length === 0 && c.spend > 50 && c.status === 'ACTIVE';
  });
  const topPerformers = campaignsWithCRM.filter(c => c.crmROI > 2 && c.status === 'ACTIVE').sort((a, b) => b.crmROI - a.crmROI);
  const problems = [...highFrequency.map(c => ({ type: 'frequency', campaign: c })),
    ...lowCTR.map(c => ({ type: 'ctr', campaign: c })),
    ...highCPA.map(c => ({ type: 'cpa', campaign: c })),
    ...zeroConversions.map(c => ({ type: 'conversions', campaign: c }))];

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${!token ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200' : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-200'}`}>
        <Megaphone size={40} className="text-white" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase">Análise Estratégica Meta</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {!token ? 'Conecte sua conta para começar.' : 'Aguardando atualização de dados...'}
        </p>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Total Investido" value={fmt.currency(totalSpend)} icon={DollarSign} color="indigo" />
        <KPICard label="Retorno CRM" value={fmt.currency(totalCRMRevenue)} icon={DollarSign} color="emerald" />
        <KPICard label="ROI CRM" value={totalROAS > 0 ? `${fmt.number(totalROAS, 2)}x` : '—'} icon={TrendingUp} color="emerald" />
        <KPICard label="Ticket Médio" value={fmt.currency(avgTicketMarketing)} icon={DollarSign} color="emerald" />
        <KPICard label="Novos Clientes (CRM)" value={fmt.number(totalNewCustomersCRM, 0)} icon={Users} color="emerald" />

        <KPICard label="Conversas Iniciadas" value={fmt.number(totalMessageStarts, 0)} icon={MessageSquare} color="sky" />
        <KPICard label="Custo p/ Resultado" value={fmt.currency(avgCostPerResult)} icon={Zap} color="indigo" />
        <KPICard label="CTR Médio" value={fmt.percent(avgCTR)} icon={MousePointer} color="rose" danger={avgCTR < 1} />
        <KPICard label="CPC Médio" value={fmt.currency(avgCPC)} icon={DollarSign} color="emerald" warning={avgCPC > 3} />
        <KPICard label="CPM" value={fmt.currency(avgCPM)} icon={Layers} color="amber" />

        <KPICard label="Impressões" value={fmt.number(totalImpressions, 0)} icon={Eye} color="sky" />
        <KPICard label="Cliques Totais" value={fmt.number(totalClicks, 0)} icon={MousePointer} color="indigo" />
        <KPICard label="Campanhas Ativas" value={fmt.number(activeCampaigns.length, 0)} icon={Activity} color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="grid md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                <SectionTitle sub="Campanhas com ROAS acima de 2x">🚀 OPORTUNIDADES — ESCALAR</SectionTitle>
                <div className="space-y-3 mt-4">
                  {topPerformers.length > 0 ? topPerformers.slice(0, 3).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 truncate max-w-[150px]">{c.name}</span>
                      <span className="text-xs font-black text-emerald-600">{fmt.number(c.crmROI, 2)}x ROAS</span>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-400 italic">Nenhuma campanha com ROAS {'>'} 2x no período.</p>
                  )}
                </div>
             </div>

             <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                <SectionTitle sub="Problemas detectados automaticamente">🚨 PRINCIPAIS PROBLEMAS</SectionTitle>
                <div className="space-y-3 mt-4">
                   {problems.length > 0 ? problems.slice(0, 3).map((p, i) => (
                     <div key={i} className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/20">
                        <AlertTriangle size={14} className="text-rose-500" />
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-400 truncate flex-1">{p.campaign.name}</span>
                     </div>
                   )) : (
                     <div className="flex items-center gap-2 text-emerald-600">
                        <CircleCheck size={14} />
                        <span className="text-xs font-bold">Nenhum problema crítico detectado!</span>
                     </div>
                   )}
                </div>
             </div>
           </div>

           <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm">
              <SectionTitle sub="Investimento diário no período">📈 DESEMPENHO DE INVESTIMENTO</SectionTitle>
              <div className="h-64 w-full mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTimeSeries}>
                      <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                        formatter={(v: number) => [fmt.currency(v), 'Gasto']} 
                      />
                      <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSpend)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap size={80} className="text-indigo-500" />
              </div>
             <SectionTitle sub="Controle de orçamento e performance.">⚡ RESUMO DE INVESTIMENTO</SectionTitle>
             <div className="mt-8 space-y-6 relative">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média Diária Planejada</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{fmt.currency(totalSpend / (dailyTimeSeries.length || 1))}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status de Entrega</p>
                  <div className="flex items-center gap-2 mt-1">
                     <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: '85%' }} />
                     </div>
                     <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">85%</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                   <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "Seu ROAS está {totalROAS > 1.5 ? 'saudável' : 'abaixo do ideal'}. Recomenda-se focar em criativos de alta conversão para reduzir o CPA."
                   </p>
                </div>
             </div>
           </div>

           <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm">
             <SectionTitle>📖 GUIA DE MÉTRICAS</SectionTitle>
             <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase"><span className="text-slate-900 dark:text-white">ROAS:</span> Retorno sobre gasto. {'>'} 2.0x é excelente.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-rose-500 mt-1.5" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase"><span className="text-slate-900 dark:text-white">CTR:</span> Taxa de clique. Ideal acima de 1%.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase"><span className="text-slate-900 dark:text-white">CPA:</span> Custo por aquisição. Deve ser {'<'} margem lucro.</p>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderCampaigns = () => (
    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 shadow-none overflow-hidden">
      {/* Desktop Version */}
      <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-800/30 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold text-slate-500 uppercase">
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">CAMPANHA <ArrowUp size={10} className="inline ml-1" /></th>
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">Veiculação</th>
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">Ações</th>
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">Resultados</th>
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right">Custo p/ res.</th>
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right">Orçamento</th>
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right">Valor usado</th>
                <th className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right text-emerald-600">Retorno CRM</th>
                <th className="px-6 py-4 text-right text-emerald-600">ROI CRM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            {campaignsWithCRM.filter(c => c.status === 'ACTIVE').map(c => {
               const isActive = c.status === 'ACTIVE';
               const hasProblem = problems.find(p => p.campaign.id === c.id);
               
               const matchingCouponAppts = getMatchingCouponAppts(c.name);
               const crmRevenue = c.crmRevenue;
               const crmROI = c.crmROI;

               return (
                 <tr key={c.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/5 transition-colors group cursor-default h-14">
                   <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">
                      <span className="text-[12px] font-black text-slate-900 dark:text-white uppercase leading-tight">{c.name}</span>
                   </td>
                   <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00a400]' : 'bg-slate-400'}`} />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                           {isActive ? 'Ativo' : 
                            c.status === 'PAUSED' ? 'Desativado' : 
                            c.status === 'IN_PROCESS' ? 'Em rascunho' : 
                            c.status.charAt(0).toUpperCase() + c.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </div>
                   </td>
                   <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">
                      {hasProblem ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold border border-blue-100 dark:border-blue-800 w-fit">
                           <Zap size={10} fill="currentColor" /> 1 recomendação
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-zinc-700">—</span>
                      )}
                   </td>
                   <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800">
                      {c.results ? (
                        <div className="flex flex-col">
                           <span className="text-[12px] font-bold text-slate-900 dark:text-white leading-none">{fmt.number(c.results.count, 0)}</span>
                           <span className="text-[9px] text-slate-400 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">{c.results.name || 'Conversas'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-zinc-700">—</span>
                      )}
                   </td>
                   <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[12px] font-bold text-slate-900 dark:text-white leading-none">
                           {c.cost_per_result ? fmt.currency(c.cost_per_result) : '—'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                           Por res.
                        </span>
                      </div>
                   </td>
                   <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[12px] font-bold text-slate-900 dark:text-white leading-none">
                           {fmt.currency((c.daily_budget || c.lifetime_budget || 0) / 100)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                           {c.daily_budget ? 'Média diária' : 'Vitalício'}
                        </span>
                      </div>
                   </td>
                   <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right font-black">
                      <span className="text-[12px] text-slate-900 dark:text-white">{fmt.currency(c.spend)}</span>
                   </td>
                    <td className="px-6 py-4 border-r border-slate-200 dark:border-zinc-800 text-right">
                      {c.crmRevenue > 0 ? (
                        <span className={`text-[12px] font-black ${crmROI >= 1 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{fmt.currency(crmRevenue)}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-zinc-700">—</span>
                      )}
                   </td>
                   <td className="px-6 py-4 text-right">
                      {crmROI > 0 ? (
                        <span className={`text-[12px] font-black ${crmROI >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {fmt.number(crmROI, 1)}x
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-zinc-700">—</span>
                      )}
                   </td>
                 </tr>
               );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden divide-y divide-slate-100 dark:divide-zinc-800/50">
        {campaignsWithCRM.filter(c => c.status === 'ACTIVE').map(c => {
           const isActive = c.status === 'ACTIVE';
           const hasProblem = problems.find(p => p.campaign.id === c.id);

           const crmRevenue = c.crmRevenue;
           const crmROI = c.crmROI;

           return (
             <div key={c.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-4">
                   <span className="text-[13px] font-black text-slate-900 dark:text-white leading-tight uppercase">{c.name}</span>
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded-full h-fit flex-shrink-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#00a400]' : 'bg-slate-400'}`} />
                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                         {isActive ? 'Ativo' : 'Pausado'}
                      </span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resultados</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">
                         {c.results ? fmt.number(c.results.count, 0) : '—'} 
                         <span className="text-[9px] font-medium text-slate-400 ml-1">
                            {c.results?.name?.split(' ')[0] || 'Res.'}
                         </span>
                      </p>
                   </div>
                   <div className="space-y-0.5 text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Custo p/ Res.</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">
                         {c.cost_per_result ? fmt.currency(c.cost_per_result) : '—'}
                      </p>
                   </div>

                   <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Orçamento</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">
                         {fmt.currency((c.daily_budget || c.lifetime_budget || 0) / 100)}
                         <span className="text-[8px] text-slate-400 font-bold ml-1">{c.daily_budget ? 'DIA' : 'VIT.'}</span>
                      </p>
                   </div>

                   <div className="space-y-0.5 text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Investido</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">
                         {fmt.currency(c.spend)}
                      </p>
                   </div>

                   <div className="space-y-0.5">
                      <p className={`text-[8px] font-black uppercase tracking-widest ${crmRevenue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Retorno CRM</p>
                      <p className={`text-[11px] font-black ${crmRevenue > 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                         {crmRevenue > 0 ? fmt.currency(crmRevenue) : '—'}
                      </p>
                   </div>
                   <div className="space-y-0.5 text-right">
                      <p className={`text-[8px] font-black uppercase tracking-widest ${crmROI >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>ROI CRM</p>
                      <p className={`text-[11px] font-black ${crmROI >= 1 ? 'text-emerald-600' : crmROI > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                         {crmROI > 0 ? `${fmt.number(crmROI, 1)}x` : '—'}
                      </p>
                   </div>
                </div>

                {hasProblem && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                     <Zap size={10} className="text-blue-500" />
                     <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Recomendação Disponível</span>
                  </div>
                )}
             </div>
           );
        })}
      </div>
      
      <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-zinc-800/30 border-t border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-6 md:px-8">
         <span className="text-slate-900 dark:text-white">Resultados de {campaignsWithCRM.filter(c => c.status === 'ACTIVE').length} campanhas ativas</span>
         <button className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
            <Info size={14} /> Detalhes do Gerenciador
         </button>
      </div>
    </div>
  );

  const renderAdSets = () => {
    const activeAdSets = adSets.filter(a => a.status === 'ACTIVE');
    return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
      {/* Desktop Version */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-zinc-800/50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-zinc-800">
              <th className="px-4 py-2 text-left">Conjunto</th>
              <th className="px-4 py-2 text-left">Campanha</th>
              <th className="px-4 py-2 text-left">Gasto</th>
              <th className="px-4 py-2 text-left">Conv.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {activeAdSets.map(a => (
              <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors border-b border-slate-100 dark:border-zinc-800 last:border-0">
                <td className="px-4 py-2">
                  <p className="font-bold text-[10px] text-slate-900 dark:text-white leading-tight">{a.name}</p>
                  <p className="text-[9px] text-indigo-500 font-bold mt-0.5 leading-tight">{a.targeting_desc || '—'}</p>
                </td>
                <td className="px-4 py-2 text-[10px] text-slate-500">{a.campaign_name}</td>
                <td className="px-4 py-2 font-black text-[10px]">{fmt.currency(a.spend)}</td>
                <td className="px-4 py-2 font-bold text-[10px] text-right">{a.conversions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Version */}
      <div className="sm:hidden divide-y divide-slate-100 dark:divide-zinc-800/50">
         {activeAdSets.map(a => (
           <div key={a.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                 <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight">{a.name}</p>
                 <span className="text-[10px] font-black text-emerald-600">{fmt.currency(a.spend)}</span>
              </div>
              <p className="text-[10px] font-bold text-indigo-500 leading-tight">
                 {a.targeting_desc || '—'}
              </p>
              <div className="flex justify-between items-center pt-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{a.campaign_name}</p>
                 <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                    {a.conversions} Conv.
                 </p>
              </div>
           </div>
         ))}
      </div>
    </div>
  )};

  const renderAds = () => {
    const activeAds = ads.filter(ad => ad.status === 'ACTIVE');
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAds.map(ad => (
        <div key={ad.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex gap-4 mb-4">
             {ad.creative?.thumbnail_url && <img src={ad.creative.thumbnail_url} className="w-16 h-16 rounded-xl object-cover" alt="" />}
             <div className="min-w-0">
                <p className="font-black text-xs text-slate-900 dark:text-white mb-1 uppercase tracking-tight leading-tight">{ad.name}</p>
                <div className="flex gap-2 items-center">
                   <StatusBadge status={ad.status} />
                   {ad.quality_ranking && ad.quality_ranking !== 'UNKNOWN' && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                         ad.quality_ranking.includes('BELOW') ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                         ad.quality_ranking.includes('ABOVE') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                         'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}>
                         {ad.quality_ranking.includes('BELOW') ? 'Fadigado' : ad.quality_ranking.includes('ABOVE') ? 'Alta Qualidade' : 'Na Média'}
                      </span>
                   )}
                </div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800 pt-4">
             <div>
                <p className="text-[10px] text-slate-400 font-black uppercase">Gasto</p>
                <p className="text-xs font-black">{fmt.currency(ad.spend)}</p>
             </div>
             <div>
                <p className="text-[10px] text-slate-400 font-black uppercase">Conv.</p>
                <p className="text-xs font-black">{ad.conversions}</p>
             </div>
          </div>
        </div>
      ))}
      {activeAds.length === 0 && !loading && hasFetched && (
        <div className="col-span-full py-8 text-center text-slate-500 font-bold text-xs uppercase tracking-widest">
           Nenhum anúncio ativo encontrado
        </div>
      )}
    </div>
  );
};

  const renderFunil = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl border-l-4 border-l-sky-500 shadow-sm">
         <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visualizações</p>
         <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{totalImpressions.toLocaleString('pt-BR')}</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl border-l-4 border-l-indigo-500 shadow-sm">
         <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliques Únicos</p>
         <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{totalClicks.toLocaleString('pt-BR')}</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl border-l-4 border-l-emerald-500 shadow-sm sm:col-span-2 lg:col-span-1">
         <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversões</p>
         <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{totalConversions.toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-4">
      {problems.length > 0 ? problems.map((p, i) => (
        <div key={i} className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 p-5 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-rose-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-rose-900 dark:text-rose-400 mb-1 uppercase tracking-widest">{p.campaign.name}</p>
            <p className="text-sm text-rose-700 dark:text-rose-500">
               {p.type === 'frequency' && 'Frequência elevada (fadiga). Sature o público e troque os criativos.'}
               {p.type === 'ctr' && 'CTR abaixo da média. O anúncio não está atraente.'}
               {p.type === 'conversions' && 'Gasto sem conversão. Revise a oferta ou segmentação.'}
            </p>
          </div>
        </div>
      )) : (
        <div className="bg-emerald-50 p-12 rounded-3xl text-center">
           <CircleCheck size={40} className="text-emerald-500 mx-auto mb-4" />
           <p className="font-black text-emerald-900">Performance Saudável!</p>
           <p className="text-sm text-emerald-700 mt-2">Suas métricas principais estão dentro dos benchmarks.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-zinc-950 min-h-0 overflow-hidden">
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 px-4 md:px-6 py-2 flex gap-2 md:gap-4 overflow-x-auto shadow-sm flex-shrink-0 scrollbar-hide z-30">
        <button
          onClick={() => setActiveMarketingTab('paid')}
          className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeMarketingTab === 'paid' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Tráfego Pago
        </button>
        <button
          onClick={() => setActiveMarketingTab('organic')}
          className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeMarketingTab === 'organic' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Orgânico
        </button>
        <button
          onClick={() => setActiveMarketingTab('reports')}
          className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeMarketingTab === 'reports' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Apresentações
        </button>
      </div>

      <div className="flex-1 overflow-auto flex flex-col min-h-0">
        <div className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex-shrink-0 z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                {activeMarketingTab === 'paid' ? <Megaphone size={20} /> : activeMarketingTab === 'reports' ? <Presentation size={20} /> : <Instagram size={20} />}
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                  {activeMarketingTab === 'organic' ? 'Orgânico' : activeMarketingTab === 'reports' ? 'Apresentações' : 'Tráfego Pago'}
                </h1>
                <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                  Análise estratégica · {
                    datePreset === 'last_7d' ? 'Últimos 7 dias' : 
                    datePreset === 'last_30d' ? 'Últimos 30 dias' : 
                    datePreset === 'last_90d' ? 'Últimos 90 dias' :
                    datePreset === 'this_month' ? 'Este mês' :
                    datePreset === 'last_month' ? 'Mês anterior' :
                    datePreset === 'this_year' ? 'Este ano' :
                    datePreset === 'custom' ? `${customStartDate.split('-').reverse().join('/')} até ${customEndDate.split('-').reverse().join('/')}` :
                    'Período personalizado'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFiltersVisible ? 'bg-slate-100 dark:bg-zinc-800 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}
              >
                <Filter size={14} />
                {isFiltersVisible ? 'Ocultar Filtros' : 'Filtrar'}
              </button>
            </div>
          </div>

          {isFiltersVisible && (
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {(activeMarketingTab === 'paid' || activeMarketingTab === 'reports') && (
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase ml-3 mb-1">Conta de Anúncios</span>
                    <select
                      value={adAccountId}
                      onChange={e => {
                        setAdAccountId(e.target.value);
                        localStorage.setItem(ACCOUNT_STORAGE_KEY, e.target.value);
                        persistToDB(undefined, e.target.value);
                      }}
                      className="px-6 py-2.5 text-[10px] font-black bg-white dark:bg-zinc-800 border-2 border-indigo-500 rounded-full text-indigo-600 dark:text-indigo-400 outline-none shadow-sm hover:bg-indigo-50 transition-colors uppercase tracking-widest"
                    >
                      {adAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.account_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase ml-3 mb-1">Perfil do Instagram</span>
                  <select
                    value={selectedIgAccountId}
                    onChange={e => {
                      setSelectedIgAccountId(e.target.value);
                      localStorage.setItem('selected_ig_account_id', e.target.value);
                    }}
                    className={`px-6 py-2.5 text-[10px] font-black bg-white dark:bg-zinc-800 border-2 rounded-full outline-none shadow-sm transition-colors uppercase tracking-widest ${activeMarketingTab === 'organic' ? 'border-indigo-500 text-indigo-600' : 'border-slate-200 text-slate-500'}`}
                  >
                    {igAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase ml-3 mb-1">Período</span>
                  <select
                    value={datePreset}
                    onChange={e => setDatePreset(e.target.value)}
                    className="px-4 py-2.5 text-xs font-black bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none h-[42px]"
                  >
                     <option value="last_7d">Últimos 7 dias</option>
                     <option value="last_30d">Últimos 30 dias</option>
                     <option value="last_90d">Últimos 90 dias</option>
                     <option value="this_month">Este mês</option>
                     <option value="last_month">Mês anterior</option>
                     <option value="this_year">Este ano</option>
                     <option value="lifetime">Total Acumulado</option>
                     <option value="custom">Período customizado</option>
                  </select>
                </div>

                {datePreset === 'custom' && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none"
                    />
                    <span className="text-[10px] font-black text-slate-400 uppercase">até</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (activeMarketingTab === 'paid' || activeMarketingTab === 'reports') fetchAll();
                  else setRefreshKey(prev => prev + 1);
                }}
                disabled={loading || ((activeMarketingTab === 'paid' || activeMarketingTab === 'reports') && !adAccountId) || !token}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] md:text-xs font-black rounded-xl shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Buscando...' : 'Atualizar Dados'}
              </button>

              <button
                onClick={() => setShowTokenPanel(!showTokenPanel)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                  token
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                }`}
              >
                <Info size={13} />
                {token ? '🔑 Token OK' : '⚠️ Sem Token'}
              </button>

              {showTokenPanel && (
                <div className="w-full mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-black text-amber-800 dark:text-amber-300 mb-1">🔑 Token de Acesso — Meta API</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">Insira seu Access Token com as permissões necessárias.</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveToken()}
                      placeholder="Access Token..."
                      className="flex-1 text-xs px-3 py-2 border border-amber-200 dark:border-amber-700 rounded-xl bg-white dark:bg-zinc-800"
                    />
                    <button onClick={saveToken} className="px-4 py-2 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 transition-colors">Salvar</button>
                    {token && <button onClick={clearToken} className="px-4 py-2 text-rose-500 text-xs font-black hover:text-rose-600 transition-colors">Remover</button>}
                  </div>

                  {token && (
                    <div className="mt-4 pt-4 border-t border-amber-100 dark:border-amber-800">
                      <button 
                        onClick={checkPermissions}
                        disabled={checkingPerms}
                        className="text-[10px] font-black text-amber-600 hover:text-amber-700 flex items-center gap-2 uppercase tracking-widest"
                      >
                        {checkingPerms ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                        Verificar Permissões Reais do Token
                      </button>
                      {permissions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {permissions.map((p: any) => (
                            <div key={p.permission} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${p.status === 'granted' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {p.permission}: {p.status}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 md:p-8">
          {activeMarketingTab === 'reports' ? (
            <MarketingReports 
              campaigns={campaignsWithCRM}
              totalSpend={totalSpend}
              totalRevenue={totalCRMRevenue}
              totalROAS={totalROAS}
              totalConversions={totalConversions}
              avgCPA={avgCPA}
              avgCTR={avgCTR}
              dateLabel={
                datePreset === 'last_7d' ? 'Últimos 7 dias' : 
                datePreset === 'last_30d' ? 'Últimos 30 dias' : 
                datePreset === 'last_90d' ? 'Últimos 90 dias' :
                datePreset === 'this_month' ? 'Este mês' :
                datePreset === 'last_month' ? 'Mês anterior' :
                datePreset === 'this_year' ? 'Este ano' :
                datePreset === 'custom' ? `${customStartDate.split('-').reverse().join('/')} até ${customEndDate.split('-').reverse().join('/')}` :
                'Período selecionado'
              }
              dailyData={dailyTimeSeries}
            />
          ) : activeMarketingTab === 'organic' ? (
            <InstagramOrganic 
              token={token} 
              datePreset={datePreset} 
              refreshKey={refreshKey}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              targetIgAccountId={selectedIgAccountId}
            />
          ) : (
            <div className="w-full">
              {error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black text-rose-700 dark:text-rose-400">Erro na API Meta</p>
                    <p className="text-xs text-rose-600 dark:text-rose-500 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {!hasFetched ? (
                renderEmpty()
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-2xl animate-bounce">
                    <BarChart3 size={32} className="text-white" />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Sincronizando Inteligência Aminna...</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="space-y-6">
                    {renderOverview()}
                  </div>

                  <div className="space-y-8">
                    <section id="detalhamento-campanhas" className="scroll-mt-32">
                      <SectionTitle sub="Visão macro de performance por objetivo de campanha">📣 DETALHAMENTO DE CAMPANHAS</SectionTitle>
                      {renderCampaigns()}
                    </section>

                    {/* Novo Gráfico: Conversão e Performance de Clientes */}
                    <section id="conversao-clientes" className="scroll-mt-32">
                      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-zinc-800">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                          <div>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                              <TrendingUp size={16} className="text-indigo-600" /> Conversão e Performance de Clientes
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Análise de novos clientes e serviços no período</p>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-3xl shadow-sm flex items-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                              <div className="px-5 py-2">
                                <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Base de Novos</p>
                                <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                  {trafficChartData.reduce((sum: number, d: any) => sum + (d.value || 0), 0)}
                                </p>
                              </div>
                              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                              <div className="px-5 py-2 text-center min-w-[100px]">
                                <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Faturamento</p>
                                <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                  R$ {trafficChartData.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                </p>
                              </div>
                              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                              <div className="px-5 py-2">
                                <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Serviços</p>
                                <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                  {trafficChartData.reduce((sum: number, d: any) => sum + (d.services || 0), 0)}
                                </p>
                              </div>
                              <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                              <div 
                                className="px-5 py-2 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700/50 transition-colors group/new"
                                onClick={() => setIsCouponsModalOpen(true)}
                              >
                                <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Cupons</p>
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                    {trafficChartData.reduce((sum: number, d: any) => sum + (d.coupons || 0), 0)}
                                  </p>
                                  <ChevronRight size={14} className="text-slate-400 mt-0.5" />
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                        <div className="h-80 mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trafficChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorNewMkt" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} width={30} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                              <Tooltip content={<NewClientTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <Area type="monotone" dataKey="value" name="Novos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNewMkt)" dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </section>

                    <section id="conjuntos-anuncios" className="scroll-mt-32">
                      <SectionTitle sub="Interação por público, segmentação e posicionamento">👥 CONJUNTOS DE ANÚNCIOS</SectionTitle>
                      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-slate-100 dark:border-zinc-800 p-8 shadow-sm">
                        {renderAdSets()}
                      </div>
                    </section>


                    <section id="anuncios-criativos" className="scroll-mt-32">
                      <SectionTitle sub="Melhores criativos e análise visual de anúncios">🖼️ ANÚNCIOS E CRIATIVOS EM DESTAQUE</SectionTitle>
                      {renderAds()}
                    </section>

                    <section id="insights-IA" className="scroll-mt-32 mt-16">
                      <SectionTitle sub="Otimizações recomendadas com base no desempenho atual">💡 RECOMENDAÇÕES E INSIGHTS</SectionTitle>
                      {renderRecommendations()}
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {isCouponsModalOpen && (
        <CouponsModal 
          couponsListData={couponsListData} 
          onClose={() => setIsCouponsModalOpen(false)} 
          getDateLabel={() => {
            const start = dateRange.start || customStartDate;
            const end = dateRange.stop || customEndDate;
            return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
          }}
        />
      )}
    </div>
  );
};
