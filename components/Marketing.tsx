
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Target, DollarSign,
  Eye, MousePointer, BarChart3, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Pause, Play, ArrowUpRight, ArrowDownRight,
  Megaphone, Users, Activity, Info, Filter, Calendar, Layers, FileText,
  Instagram
} from 'lucide-react';

import { InstagramOrganic } from './InstagramOrganic';
import { supabase } from '../services/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
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
  lpv?: number;
  atc?: number;
  ic?: number;
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
}

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const CAMPAIGN_FIELDS = [
  'id', 'name', 'status', 'objective',
  'insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,purchase_roas,frequency,reach,actions,action_values,date_start,date_stop}'
].join(',');

const ADSET_FIELDS = [
  'id', 'name', 'status', 'campaign_id', 'campaign{name}',
  'insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,frequency}'
].join(',');

const AD_FIELDS = [
  'id', 'name', 'status', 'adset_id', 'adset{name}', 'campaign_id', 'campaign{name}',
  'insights.date_preset(last_30d){spend,impressions,clicks,ctr,conversions,cost_per_conversion}',
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
    <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl border ${danger ? 'border-rose-200 dark:border-rose-900' : warning ? 'border-amber-200 dark:border-amber-900' : 'border-slate-100 dark:border-zinc-800'} p-5 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${grad} opacity-5 rounded-full -translate-y-6 translate-x-6 group-hover:opacity-10 transition-opacity`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{value}</p>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
      {trendLabel && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{trendLabel}</p>}
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

// ─── Main Component ────────────────────────────────────────────────────────────

const TOKEN_STORAGE_KEY = 'meta_ads_token';
const ACCOUNT_STORAGE_KEY = 'meta_ads_account_id';

export const Marketing: React.FC = () => {
  const [activeMarketingTab, setActiveMarketingTab] = useState<'paid' | 'organic'>(() => 
    (localStorage.getItem('active_marketing_tab') as 'paid' | 'organic') || 'paid'
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // Persistence to Supabase
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase.from('marketing_config').select('*').single();
        if (data) {
          if (data.meta_token && !token) {
            setToken(data.meta_token);
            localStorage.setItem(TOKEN_STORAGE_KEY, data.meta_token);
          }
          if (data.ad_account_id && !adAccountId) {
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
      await supabase.from('marketing_config').update({
        meta_token: newToken || token,
        ad_account_id: newAccountId || adAccountId,
        updated_at: new Date().toISOString()
      }).eq('id', '00000000-0000-0000-0000-000000000001');
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [dailyTimeSeries, setDailyTimeSeries] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; stop: string }>({ start: '', stop: '' });
  const [datePreset, setDatePreset] = useState<string>('last_30d');

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
    if (token) fetchAdAccounts();
  }, [token]);

  const fetchAdAccounts = async () => {
    if (!token) return;
    try {
      const data = await fetchFromMeta(token, 'me/adaccounts', { fields: 'id,name,account_id,account_status' });
      if (data.data && data.data.length > 0) {
        setAdAccounts(data.data);
        if (!adAccountId || !data.data.find((a: any) => a.id === adAccountId)) {
          const firstId = data.data[0].id;
          setAdAccountId(firstId);
          localStorage.setItem(ACCOUNT_STORAGE_KEY, firstId);
        }
      } else {
        setError('Nenhuma conta de anúncio encontrada vinculada a este token.');
      }
    } catch (e: any) {
      setError(`Erro ao buscar contas de anúncio: ${e.message}`);
    }
  };

  const fetchAll = useCallback(async () => {
    if (!adAccountId || !token) return;
    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const campData = await fetchFromMeta(token, `${adAccountId}/campaigns`, {
        fields: CAMPAIGN_FIELDS,
        limit: '100',
        date_preset: datePreset,
      });

      const parsedCampaigns: MetaCampaign[] = (campData.data || []).map((c: any) => {
        const insight = c.insights?.data?.[0];
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective || '—',
          ...parseInsight(insight),
        };
      });
      setCampaigns(parsedCampaigns);

      const adsetData = await fetchFromMeta(token, `${adAccountId}/adsets`, {
        fields: ADSET_FIELDS,
        limit: '200',
      });

      const parsedAdSets: AdSet[] = (adsetData.data || []).map((a: any) => {
        const insight = a.insights?.data?.[0];
        return {
          id: a.id,
          campaign_id: a.campaign_id,
          campaign_name: a.campaign?.name || '—',
          name: a.name,
          status: a.status,
          ...parseInsight(insight),
        };
      });
      setAdSets(parsedAdSets);

      const adData = await fetchFromMeta(token, `${adAccountId}/ads`, {
        fields: AD_FIELDS,
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
          ...parseInsight(insight),
        };
      });
      setAds(parsedAds);

      try {
        const dailyData = await fetchFromMeta(token, `${adAccountId}/insights`, {
          date_preset: datePreset,
          time_increment: '1',
          fields: 'spend,impressions,clicks,conversions,date_start,date_stop',
        });
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
  }, [adAccountId, token, datePreset]);

  useEffect(() => {
    if (token && adAccountId && activeMarketingTab === 'paid') {
      fetchAll();
    }
  }, [token, adAccountId, fetchAll, activeMarketingTab]);

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const totalROAS = campaigns.filter(c => c.roas > 0).reduce((s, c) => s + c.roas * c.spend, 0) / (totalSpend || 1);

  const highFrequency = campaigns.filter(c => c.frequency > 3 && c.status === 'ACTIVE');
  const lowCTR = campaigns.filter(c => c.ctr < 1 && c.impressions > 1000 && c.status === 'ACTIVE');
  const highCPA = campaigns.filter(c => c.cpa > avgCPA * 2 && c.cpa > 0 && c.status === 'ACTIVE');
  const zeroConversions = campaigns.filter(c => c.conversions === 0 && c.spend > 50 && c.status === 'ACTIVE');
  const topPerformers = campaigns.filter(c => c.roas > 2 && c.status === 'ACTIVE').sort((a, b) => b.roas - a.roas);
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Total Investido" value={fmt.currency(totalSpend)} icon={DollarSign} color="indigo" />
        <KPICard label="Impressões" value={fmt.number(totalImpressions, 0)} icon={Eye} color="sky" />
        <KPICard label="CTR Médio" value={fmt.percent(avgCTR)} icon={MousePointer} color="rose" danger={avgCTR < 1} />
        <KPICard label="CPC Médio" value={fmt.currency(avgCPC)} icon={DollarSign} color="emerald" warning={avgCPC > 3} />
        <KPICard label="CPM" value={fmt.currency(avgCPM)} icon={Layers} color="amber" />
        
        <KPICard label="Conversões" value={fmt.number(totalConversions, 0)} icon={Target} color="emerald" />
        <KPICard label="CPA Médio" value={fmt.currency(avgCPA)} icon={DollarSign} color="indigo" />
        <KPICard label="ROAS" value={totalROAS > 0 ? `${fmt.number(totalROAS, 2)}x` : '—'} icon={TrendingUp} color="emerald" />
        <KPICard label="Campanhas Ativas" value={fmt.number(activeCampaigns.length, 0)} icon={Activity} color="sky" />
        <KPICard label="Cliques Totais" value={fmt.number(totalClicks, 0)} icon={MousePointer} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="grid md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                <SectionTitle sub="Campanhas com ROAS acima de 2x">🚀 OPORTUNIDADES — ESCALAR</SectionTitle>
                <div className="space-y-3 mt-4">
                  {topPerformers.length > 0 ? topPerformers.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 truncate max-w-[150px]">{c.name}</span>
                      <span className="text-xs font-black text-emerald-600">{fmt.number(c.roas, 2)}x ROAS</span>
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
                        <CheckCircle size={14} />
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
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <th className="px-4 py-3 text-left">Campanha</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Gasto</th>
            <th className="px-4 py-3 text-left">CTR</th>
            <th className="px-4 py-3 text-left">Conv.</th>
            <th className="px-4 py-3 text-left">ROAS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {campaigns.map(c => (
            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              <td className="px-4 py-3 font-bold text-xs truncate max-w-[200px]">{c.name}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3 font-black">{fmt.currency(c.spend)}</td>
              <td className="px-4 py-3 font-bold text-indigo-600">{fmt.percent(c.ctr)}</td>
              <td className="px-4 py-3 font-bold">{c.conversions}</td>
              <td className="px-4 py-3 font-black text-emerald-600">{c.roas > 0 ? `${fmt.number(c.roas, 2)}x` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAdSets = () => (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <th className="px-4 py-3 text-left">Conjunto</th>
            <th className="px-4 py-3 text-left">Campanha</th>
            <th className="px-4 py-3 text-left">Gasto</th>
            <th className="px-4 py-3 text-left">Conv.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {adSets.map(a => (
            <tr key={a.id}>
              <td className="px-4 py-3 font-bold truncate max-w-[200px]">{a.name}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{a.campaign_name}</td>
              <td className="px-4 py-3 font-black">{fmt.currency(a.spend)}</td>
              <td className="px-4 py-3 font-bold">{a.conversions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAds = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ads.map(ad => (
        <div key={ad.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex gap-4 mb-4">
             {ad.creative?.thumbnail_url && <img src={ad.creative.thumbnail_url} className="w-16 h-16 rounded-xl object-cover" alt="" />}
             <div className="min-w-0">
                <p className="font-black text-xs truncate text-slate-900 dark:text-white mb-1 uppercase tracking-tight">{ad.name}</p>
                <div className="flex gap-2"><StatusBadge status={ad.status} /></div>
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
    </div>
  );

  const renderFunil = () => (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border-l-4 border-l-sky-500 shadow-sm">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visualizações</p>
         <p className="text-2xl font-black">{totalImpressions.toLocaleString('pt-BR')}</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border-l-4 border-l-indigo-500 shadow-sm">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliques Únicos</p>
         <p className="text-2xl font-black">{totalClicks.toLocaleString('pt-BR')}</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border-l-4 border-l-emerald-500 shadow-sm">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversões</p>
         <p className="text-2xl font-black">{totalConversions.toLocaleString('pt-BR')}</p>
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
           <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4" />
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
      </div>

      <div className="flex-1 overflow-auto flex flex-col min-h-0">
        <div className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex-shrink-0 z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                {activeMarketingTab === 'paid' ? <Megaphone size={20} /> : <Instagram size={20} />}
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                  {activeMarketingTab === 'organic' ? 'Orgânico' : 'Tráfego Pago'}
                </h1>
                <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                  Análise estratégica · {datePreset === 'last_7d' ? 'Últimos 7 dias' : datePreset === 'last_30d' ? 'Últimos 30 dias' : 'Últimos 90 dias'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {activeMarketingTab === 'paid' && adAccounts.length > 0 && (
                <select
                  value={adAccountId}
                  onChange={e => {
                    const newVal = e.target.value;
                    setAdAccountId(newVal);
                    localStorage.setItem(ACCOUNT_STORAGE_KEY, newVal);
                    persistToDB(undefined, newVal);
                  }}
                  className="px-4 py-2 text-xs font-black bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none"
                >
                  {adAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_id})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={datePreset}
                onChange={e => setDatePreset(e.target.value)}
                className="px-4 py-2 text-xs font-black bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none"
              >
                <option value="last_7d">Últimos 7 dias</option>
                <option value="last_30d">Últimos 30 dias</option>
                <option value="last_90d">Últimos 90 dias</option>
                <option value="this_month">Este mês</option>
                <option value="last_month">Mês anterior</option>
              </select>

              <button
                onClick={() => {
                  if (activeMarketingTab === 'paid') fetchAll();
                  else setRefreshKey(prev => prev + 1);
                }}
                disabled={loading || (activeMarketingTab === 'paid' && !adAccountId) || !token}
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
            </div>
          </div>

          {showTokenPanel && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl animate-in slide-in-from-top-2 duration-300">
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
            </div>
          )}
        </div>

        <div className="flex-1 p-4 md:p-8">
          {activeMarketingTab === 'organic' ? (
            <InstagramOrganic token={token} datePreset={datePreset} refreshKey={refreshKey} />
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
                <div className="space-y-16 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="space-y-12">
                    {renderOverview()}
                  </div>

                  <div className="pt-20 border-t border-slate-200 dark:border-zinc-800 space-y-24">
                    <section id="funil-marketing" className="scroll-mt-32">
                      <SectionTitle sub="Análise detalhada da jornada do cliente no funil de conversão">🌪️ FUNIL E EFICIÊNCIA DE VENDAS</SectionTitle>
                      {renderFunil()}
                    </section>
                    
                    <section id="insights-IA" className="scroll-mt-32">
                      <SectionTitle sub="Otimizações recomendadas com base no desempenho atual">💡 RECOMENDAÇÕES E INSIGHTS</SectionTitle>
                      {renderRecommendations()}
                    </section>

                    <section id="detalhamento-campanhas" className="scroll-mt-32">
                      <SectionTitle sub="Visão macro de performance por objetivo de campanha">📣 DETALHAMENTO DE CAMPANHAS</SectionTitle>
                      {renderCampaigns()}
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
