
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Target, DollarSign,
  Eye, MousePointer, BarChart3, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Pause, Play, ArrowUpRight, ArrowDownRight,
  Megaphone, Users, Activity, Info, Filter, Calendar, Layers, FileText
} from 'lucide-react';

import { InstagramOrganic } from './InstagramOrganic';
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
  'insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,conversions,cost_per_conversion}',
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
  const [activeMarketingTab, setActiveMarketingTab] = useState<'paid' | 'organic'>('paid');

  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<AdInsight[]>([]);
  const [adAccountId, setAdAccountId] = useState<string>(() => localStorage.getItem(ACCOUNT_STORAGE_KEY) || '');
  const [adAccounts, setAdAccounts] = useState<{ id: string; name: string; account_id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'adsets' | 'ads' | 'funil' | 'recommendations' | 'report'>('overview');
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Stats for reporting
  const [dailyTimeSeries, setDailyTimeSeries] = useState<any[]>([]);
  const [prevStats, setPrevStats] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; stop: string }>({ start: '', stop: '' });
  const [datePreset, setDatePreset] = useState<string>('last_30d');

  // Token management
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showTokenPanel, setShowTokenPanel] = useState<boolean>(false);

  const saveToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    localStorage.setItem(TOKEN_STORAGE_KEY, t);
    setToken(t);
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

  // Fetch ad accounts when token changes
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
      // ── Campaigns ──
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

      // ── Ad Sets ──
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

      // ── Ads ──
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

      // ── New: Fetch Daily Stats for Chart ──
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
          conversions: (d.actions || []).find((a: any) => ['purchase', 'lead', 'complete_registration'].includes(a.action_type))?.value || 0
        }));
        setDailyTimeSeries(timeseries);
        
        if (timeseries.length > 0) {
           setDateRange({ 
             start: dailyData.data[0].date_start, 
             stop: dailyData.data[dailyData.data.length - 1].date_stop 
           });
        }
      } catch (e) { console.error("Error fetching daily stats", e); }

      // ── New: Fetch Previous Period for Deltas ──
      try {
        // Calculate previous 30 days - approximate for now using date_preset offset if possible
        // Actually simpler to just use 'last_30d' and offset from the API response's dates
        const prevData = await fetchFromMeta(token, `${adAccountId}/insights`, {
          time_range: JSON.stringify({
            since: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            until: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }),
          fields: 'spend,impressions,clicks,conversions,actions,action_values',
        });
        
        if (prevData.data?.[0]) {
           const p = parseInsight(prevData.data[0]);
           setPrevStats(p);
        }
      } catch (e) { console.error("Error fetching previous stats", e); }

    } catch (e: any) {
      setError(`Erro ao buscar dados da Meta API: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, token]);

  // Auto-fetch data if account is already selected (persistence)
  useEffect(() => {
    if (token && adAccountId && !hasFetched && !loading) {
      fetchAll();
    }
  }, [token, adAccountId, fetchAll, hasFetched, loading]);


  // ── Derived Totals ──
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const totalLPV = campaigns.reduce((s, c) => s + (c.lpv || 0), 0);
  const totalATC = campaigns.reduce((s, c) => s + (c.atc || 0), 0);
  const totalIC = campaigns.reduce((s, c) => s + (c.ic || 0), 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const totalROAS = campaigns.filter(c => c.roas > 0).reduce((s, c) => s + c.roas * c.spend, 0) / (totalSpend || 1);

  // ── Problem Detection ──
  const highFrequency = campaigns.filter(c => c.frequency > 3 && c.status === 'ACTIVE');
  const lowCTR = campaigns.filter(c => c.ctr < 1 && c.impressions > 1000 && c.status === 'ACTIVE');
  const highCPA = campaigns.filter(c => c.cpa > avgCPA * 2 && c.cpa > 0 && c.status === 'ACTIVE');
  const zeroConversions = campaigns.filter(c => c.conversions === 0 && c.spend > 50 && c.status === 'ACTIVE');
  const topPerformers = campaigns.filter(c => c.roas > 2 && c.status === 'ACTIVE').sort((a, b) => b.roas - a.roas);
  const problems = [...highFrequency.map(c => ({ type: 'frequency', campaign: c })),
    ...lowCTR.map(c => ({ type: 'ctr', campaign: c })),
    ...highCPA.map(c => ({ type: 'cpa', campaign: c })),
    ...zeroConversions.map(c => ({ type: 'conversions', campaign: c }))];

  const TABS = [
    { id: 'overview', label: 'Resumo Executivo', icon: BarChart3 },
    { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
    { id: 'adsets', label: 'Conjuntos', icon: Layers },
    { id: 'ads', label: 'Anúncios', icon: Eye },
    { id: 'funil', label: 'Funil', icon: Filter },
    { id: 'recommendations', label: 'Recomendações', icon: Zap },
  ] as const;

  // ── Render states ──
  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${!token ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200 dark:shadow-amber-900/30' : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-200 dark:shadow-indigo-900/30'}`}>
        <Megaphone size={40} className="text-white" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Análise de Tráfego Pago</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {!token
            ? 'Configure seu token de acesso da Meta API clicando no botão "⚠️ Sem Token" no canto superior direito.'
            : adAccounts.length > 0
              ? 'Selecione uma conta e clique em "Atualizar Dados" para carregar sua análise.'
              : 'Carregando contas de anúncio...'}
        </p>
      </div>
      {!token && (
        <button
          onClick={() => setShowTokenPanel(true)}
          className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30 hover:scale-105 active:scale-95 transition-all"
        >
          Configurar Token Agora
        </button>
      )}
      {token && adAccounts.length > 0 && (
        <button
          onClick={fetchAll}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:scale-105 active:scale-95 transition-all"
        >
          Buscar Dados Agora
        </button>
      )}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div>
        <SectionTitle sub="Últimos 30 dias — todas as campanhas">📊 RESUMO EXECUTIVO</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPICard label="Total Investido" value={fmt.currency(totalSpend)} icon={DollarSign} color="indigo" />
          <KPICard label="Impressões" value={totalImpressions.toLocaleString('pt-BR')} icon={Eye} color="sky" />
          <KPICard label="CTR Médio" value={fmt.percent(avgCTR)} icon={MousePointer} color="purple"
            danger={avgCTR < 1} warning={avgCTR >= 1 && avgCTR < 2} />
          <KPICard label="CPC Médio" value={fmt.currency(avgCPC)} icon={DollarSign} color="emerald"
            warning={avgCPC > 3} danger={avgCPC > 8} />
          <KPICard label="CPM" value={fmt.currency(avgCPM)} icon={BarChart3} color="amber" />
          <KPICard label="Conversões" value={fmt.number(totalConversions, 0)} icon={Target} color="emerald" />
          <KPICard label="CPA Médio" value={totalConversions > 0 ? fmt.currency(avgCPA) : '—'} icon={DollarSign} color="purple"
            warning={avgCPA > 50} danger={avgCPA > 150} />
          <KPICard label="ROAS" value={totalROAS > 0 ? `${fmt.number(totalROAS, 2)}x` : '—'} icon={TrendingUp} color="emerald"
            danger={totalROAS > 0 && totalROAS < 1} warning={totalROAS >= 1 && totalROAS < 2} />
          <KPICard label="Campanhas Ativas" value={String(activeCampaigns.length)} icon={Activity} color="sky" />
          <KPICard label="Cliques Totais" value={totalClicks.toLocaleString('pt-BR')} icon={MousePointer} color="indigo" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
          <SectionTitle sub="Campanhas com ROAS acima de 2x">🚀 OPORTUNIDADES — ESCALAR</SectionTitle>
          {topPerformers.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nenhuma campanha com ROAS {'>'} 2x no período.</p>
          ) : (
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{fmt.currency(c.spend)} investido</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmt.number(c.roas, 2)}x ROAS</p>
                    <p className="text-[10px] text-slate-500">{c.conversions} conv.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Problems */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
          <SectionTitle sub="Problemas detectados automaticamente">🚨 PRINCIPAIS PROBLEMAS</SectionTitle>
          {problems.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={16} />
              <p className="text-sm font-bold">Nenhum problema crítico detectado!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {problems.slice(0, 6).map((p, i) => (
                <div key={`${p.type}-${i}`} className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/20">
                  <AlertTriangle size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{p.campaign.name}</p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400">
                      {p.type === 'frequency' && `Frequência alta: ${fmt.number(p.campaign.frequency, 1)}x (fadiga de criativo)`}
                      {p.type === 'ctr' && `CTR baixo: ${fmt.percent(p.campaign.ctr)} (problema de criativo)`}
                      {p.type === 'cpa' && `CPA muito alto: ${fmt.currency(p.campaign.cpa)} (${fmt.number(p.campaign.cpa / (avgCPA || 1), 1)}x a média)`}
                      {p.type === 'conversions' && `Sem conversões | ${fmt.currency(p.campaign.spend)} desperdiçado`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Desempenho de Investimento</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Investimento diário no período</p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Investido</span>
              </div>
           </div>
           
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTimeSeries}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: number) => [fmt.currency(v), 'Investido']}
                    />
                    <Area type="monotone" dataKey="spend" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between">
           <div>
              <Zap className="text-amber-400 mb-4" size={24} />
              <h3 className="text-lg font-black tracking-tight mb-2">Resumo de Investimento</h3>
              <p className="text-xs text-indigo-200 mb-6 font-medium">Controle de orçamento e performance.</p>
              
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Média Diária Planejada</p>
                    <p className="text-2xl font-black">{fmt.currency(totalSpend / 30)}</p>
                 </div>
                 <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Status de Entrega</p>
                    <div className="flex items-center gap-2">
                       <CheckCircle size={14} className="text-emerald-400" />
                       <span className="text-xs font-bold text-emerald-400 tracking-tight">Dentro da estratégia sugerida</span>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 font-medium italic text-center">Análise Estratégica Aminna</p>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm">
         <div className="flex items-center gap-3 mb-8">
            <Info className="text-blue-500" size={20} />
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Guia de Métricas Principais</h3>
         </div>
         
         <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">CTR (Taxa de Cliques)</p>
               <p className="text-[11px] text-slate-500 font-medium">Mede quão atraente é o anúncio. Um CTR alto indica criativos eficientes.</p>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">CPA (Custo por Aquisição)</p>
               <p className="text-[11px] text-slate-500 font-medium">Quanto cada conversão custou. O objetivo é manter abaixo da margem de lucro.</p>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">ROAS (Retorno sobre Gasto)</p>
               <p className="text-[11px] text-slate-500 font-medium">Faturamento gerado para cada real investido. O ideal para Aminna é acima de 2x.</p>
            </div>
         </div>
      </div>
    </div>
  );

  const renderCampaigns = () => (
    <div>
      <SectionTitle sub={`${campaigns.length} campanhas encontradas`}>📋 CAMPANHAS</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {['Campanha', 'Status', 'Objetivo', 'Gasto', 'Impressões', 'CTR', 'CPC', 'CPM', 'Conv.', 'CPA', 'ROAS', 'Freq.'].map(h => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
            {campaigns.sort((a, b) => b.spend - a.spend).map(c => {
              const isProb = c.frequency > 3 || c.ctr < 1 || (c.conversions === 0 && c.spend > 50);
              return (
                <tr
                  key={c.id}
                  onClick={() => setExpandedCampaign(expandedCampaign === c.id ? null : c.id)}
                  className={`cursor-pointer transition-colors ${isProb ? 'bg-rose-50/30 dark:bg-rose-900/5 hover:bg-rose-50 dark:hover:bg-rose-900/10' : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      {isProb && <AlertTriangle size={12} className="text-rose-400 flex-shrink-0" />}
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate block max-w-[220px]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{c.objective}</td>
                  <td className="px-4 py-3 font-black text-slate-900 dark:text-white whitespace-nowrap">{fmt.currency(c.spend)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.impressions.toLocaleString('pt-BR')}</td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${c.ctr < 1 && c.impressions > 1000 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{fmt.percent(c.ctr)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt.currency(c.cpc)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt.currency(c.cpm)}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{fmt.number(c.conversions, 0)}</td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${c.cpa > avgCPA * 2 && c.cpa > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {c.cpa > 0 ? fmt.currency(c.cpa) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-black whitespace-nowrap ${c.roas >= 2 ? 'text-emerald-600 dark:text-emerald-400' : c.roas > 0 && c.roas < 1 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {c.roas > 0 ? `${fmt.number(c.roas, 2)}x` : '—'}
                  </td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${c.frequency > 3 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>{fmt.number(c.frequency, 1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {campaigns.length === 0 && hasFetched && !loading && (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhuma campanha encontrada nesta conta.</div>
        )}
      </div>
    </div>
  );

  const renderAdSets = () => (
    <div>
      <SectionTitle sub={`${adSets.length} conjuntos encontrados`}>🎯 CONJUNTOS DE ANÚNCIOS</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {['Conjunto', 'Campanha', 'Status', 'Gasto', 'CTR', 'CPC', 'Conv.', 'CPA', 'Freq.'].map(h => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
            {adSets.sort((a, b) => b.spend - a.spend).map(a => (
              <tr key={a.id} className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-bold text-xs text-slate-900 dark:text-white max-w-[200px] truncate">{a.name}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{a.campaign_name}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3 font-black text-slate-900 dark:text-white whitespace-nowrap">{fmt.currency(a.spend)}</td>
                <td className={`px-4 py-3 font-bold whitespace-nowrap ${a.ctr < 1 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{fmt.percent(a.ctr)}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt.currency(a.cpc)}</td>
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{fmt.number(a.conversions, 0)}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{a.cpa > 0 ? fmt.currency(a.cpa) : '—'}</td>
                <td className={`px-4 py-3 font-bold whitespace-nowrap ${a.frequency > 3 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>{fmt.number(a.frequency, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {adSets.length === 0 && hasFetched && !loading && (
          <div className="py-12 text-center text-slate-400 text-sm">Nenhum conjunto encontrado.</div>
        )}
      </div>
    </div>
  );

  const renderAds = () => (
    <div>
      <SectionTitle sub={`${ads.length} anúncios encontrados`}>🖼️ ANÚNCIOS</SectionTitle>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {['Anúncio', 'Conjunto', 'Campanha', 'Status', 'Gasto', 'Impressões', 'CTR', 'CPC', 'Conv.'].map(h => (
                <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
            {ads.sort((a, b) => b.spend - a.spend).map(ad => (
              <tr key={ad.id} className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {ad.creative?.thumbnail_url && (
                      <img src={ad.creative.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <span className="font-bold text-xs text-slate-900 dark:text-white max-w-[180px] truncate block">{ad.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{ad.adset_name}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{ad.campaign_name}</td>
                <td className="px-4 py-3"><StatusBadge status={ad.status} /></td>
                <td className="px-4 py-3 font-black text-slate-900 dark:text-white whitespace-nowrap">{fmt.currency(ad.spend)}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{ad.impressions.toLocaleString('pt-BR')}</td>
                <td className={`px-4 py-3 font-bold whitespace-nowrap ${ad.ctr < 1 && ad.impressions > 500 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{fmt.percent(ad.ctr)}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmt.currency(ad.cpc)}</td>
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{fmt.number(ad.conversions, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ads.length === 0 && hasFetched && !loading && (
          <div className="py-12 text-center text-slate-400 text-sm">Nenhum anúncio encontrado.</div>
        )}
      </div>
    </div>
  );

  const renderFunil = () => {
    const topIssue = lowCTR.length > 0;
    const midIssue = avgCPC > 5;
    const botIssue = avgCPA > 100 || (totalConversions === 0 && totalSpend > 100);

    const stages = [
      {
        label: 'TOPO DO FUNIL',
        desc: 'Criativo → Atenção',
        metric: `CTR: ${fmt.percent(avgCTR)}`,
        ok: !topIssue,
        diagnosis: topIssue ? 'CTR abaixo de 1% — criativo fraco. Teste novos formatos, hooks e copys.' : 'CTR saudável — criativos capturando atenção.',
        color: topIssue ? 'rose' : 'emerald',
        icon: Eye,
      },
      {
        label: 'MEIO DO FUNIL',
        desc: 'Segmentação → Clique',
        metric: `CPC: ${fmt.currency(avgCPC)}`,
        ok: !midIssue,
        diagnosis: midIssue ? 'CPC alto — segmentação muito ampla ou público saturado. Revise públicos e exclua conversos.' : 'CPC dentro do esperado — segmentação adequada.',
        color: midIssue ? 'amber' : 'emerald',
        icon: Users,
      },
      {
        label: 'FUNDO DO FUNIL',
        desc: 'Página → Conversão',
        metric: totalConversions > 0 ? `CPA: ${fmt.currency(avgCPA)}` : 'Sem conversões',
        ok: !botIssue,
        diagnosis: botIssue
          ? totalConversions === 0 ? 'ZERO conversões — verifique pixel, evento de conversão, e a qualidade da landing page.'
            : 'CPA muito elevado — problema de oferta, landing page ou jornada de compra.'
          : 'CPA dentro do esperado — funil de conversão funcionando.',
        color: botIssue ? 'rose' : 'emerald',
        icon: Target,
      },
    ];

    return (
      <div className="space-y-4">
        <SectionTitle sub="Diagnóstico automático baseado nas métricas">🔎 ANÁLISE DE FUNIL</SectionTitle>
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          const colorClass = stage.color === 'rose'
            ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/10'
            : stage.color === 'amber'
              ? 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/10'
              : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/10';
          return (
            <div key={i} className={`flex gap-5 p-5 rounded-2xl border ${colorClass}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${stage.ok ? 'bg-emerald-500' : stage.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{stage.label}</p>
                  <span className="text-[10px] text-slate-500">{stage.desc}</span>
                  <span className={`ml-auto text-sm font-black ${stage.ok ? 'text-emerald-600 dark:text-emerald-400' : stage.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{stage.metric}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{stage.diagnosis}</p>
              </div>
              <div className="flex-shrink-0">
                {stage.ok ? <CheckCircle size={18} className="text-emerald-500" /> : <XCircle size={18} className={stage.color === 'amber' ? 'text-amber-500' : 'text-rose-500'} />}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRecommendations = () => {
    const recs: { icon: React.ElementType; priority: 'ALTA' | 'MÉDIA' | 'BAIXA'; action: string; detail: string; campaigns?: string[] }[] = [];

    if (highFrequency.length > 0) {
      recs.push({
        icon: Pause,
        priority: 'ALTA',
        action: 'RENOVAR CRIATIVOS — Fadiga Detectada',
        detail: `${highFrequency.length} campanha(s) com frequência > 3. Substitua imediatamente os criativos ou pause para refresh. Público esgotado = desperdício de orçamento.`,
        campaigns: highFrequency.slice(0, 3).map(c => c.name),
      });
    }

    if (zeroConversions.length > 0) {
      recs.push({
        icon: XCircle,
        priority: 'ALTA',
        action: 'PAUSAR — Campanhas com Zero Conversão',
        detail: `${zeroConversions.length} campanha(s) gastando sem converter. Verifique pixel, evento, landing page e segmentação antes de reativar.`,
        campaigns: zeroConversions.slice(0, 3).map(c => c.name),
      });
    }

    if (topPerformers.length > 0) {
      recs.push({
        icon: TrendingUp,
        priority: 'ALTA',
        action: 'ESCALAR — Aumentar Orçamento nas Lucrativas',
        detail: `${topPerformers.length} campanha(s) com ROAS > 2x. Aumente o orçamento em 20-30% a cada 2 dias. Evite mudanças bruscas que entram nova fase de aprendizado.`,
        campaigns: topPerformers.slice(0, 3).map(c => `${c.name} (${fmt.number(c.roas, 2)}x)`),
      });
    }

    if (lowCTR.length > 0) {
      recs.push({
        icon: Eye,
        priority: 'MÉDIA',
        action: 'TESTAR CRIATIVOS — CTR Baixo',
        detail: 'CTR < 1% indica que o criativo não está capturando atenção. Teste: novo hook, vídeo vs imagem estática, UGC, depoimentos, ofertas diferentes.',
        campaigns: lowCTR.slice(0, 3).map(c => c.name),
      });
    }

    if (highCPA.length > 0) {
      recs.push({
        icon: DollarSign,
        priority: 'MÉDIA',
        action: 'AJUSTAR SEGMENTAÇÃO — CPA Muito Alto',
        detail: 'CPA acima de 2x a média. Revise públicos, exclua clientes já convertidos, teste lookalike de clientes de alto valor.',
        campaigns: highCPA.slice(0, 3).map(c => c.name),
      });
    }

    recs.push({
      icon: Users,
      priority: 'BAIXA',
      action: 'TESTAR PÚBLICOS LOOKALIKE',
      detail: 'Crie lookalikes de 1% a partir de listas de clientes convertidos. Tende a performar melhor que públicos por interesse.',
    });

    recs.push({
      icon: Calendar,
      priority: 'BAIXA',
      action: 'ANÁLISE DE HORÁRIO',
      detail: 'Use o relatório de desempenho por hora do dia no Ads Manager. Concentre orçamento nos horários de maior conversão.',
    });

    const priorityColor = { ALTA: 'rose', MÉDIA: 'amber', BAIXA: 'sky' } as const;
    const priorityBg = {
      ALTA: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900',
      MÉDIA: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900',
      BAIXA: 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-900',
    };

    return (
      <div className="space-y-4">
        <SectionTitle sub="Plano de ação gerado automaticamente com base nos dados">🎯 PLANO DE AÇÃO ESTRATÉGICO</SectionTitle>
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 mb-6">
          <div className="flex items-start gap-3">
            <Zap size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold">
              <span className="font-black">Objetivo: ESCALAR campanhas lucrativas e ELIMINAR desperdício rapidamente.</span>
              {' '}Foque nas ações de prioridade ALTA primeiro — elas impactam diretamente seu dinheiro.
            </p>
          </div>
        </div>
        {recs.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={i} className={`flex gap-4 p-5 rounded-2xl border ${priorityBg[r.priority]}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-${priorityColor[r.priority]}-500 shadow-sm`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <p className="text-xs font-black text-slate-900 dark:text-white">{r.action}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-${priorityColor[r.priority]}-100 dark:bg-${priorityColor[r.priority]}-900/30 text-${priorityColor[r.priority]}-700 dark:text-${priorityColor[r.priority]}-400 uppercase tracking-wider`}>
                    {r.priority}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{r.detail}</p>
                {r.campaigns && r.campaigns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.campaigns.map((cn, ci) => (
                      <span key={ci} className="text-[10px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-400 font-bold truncate max-w-[200px]">{cn}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Main render ──
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-zinc-950 min-h-0">
      {/* Sub-Tabs Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 px-6 py-2 flex gap-4 overflow-x-auto shadow-sm">
        <button
          onClick={() => setActiveMarketingTab('paid')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeMarketingTab === 'paid' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Tráfego Pago
        </button>
        <button
          onClick={() => setActiveMarketingTab('organic')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeMarketingTab === 'organic' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Orgânico (Instagram)
        </button>
      </div>

      {activeMarketingTab === 'organic' ? (
        <InstagramOrganic token={token} datePreset={datePreset} />
      ) : (
        <>
          {/* Header (Original MetaAds Header) */}
          <div className="bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex-shrink-0">

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
              <Megaphone size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Tráfego Pago — Meta Ads</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Análise estratégica · {datePreset === 'last_7d' ? 'Últimos 7 dias' : datePreset === 'last_30d' ? 'Últimos 30 dias' : 'Últimos 90 dias'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {adAccounts.length > 0 && (
              <select
                value={adAccountId}
                onChange={e => {
                  setAdAccountId(e.target.value);
                  localStorage.setItem(ACCOUNT_STORAGE_KEY, e.target.value);
                }}
                className="text-xs font-bold px-3 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {adAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_id})</option>
                ))}
              </select>
            )}

            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
              className="text-xs font-bold px-3 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="last_7d">Últimos 7 dias</option>
              <option value="last_30d">Últimos 30 dias</option>
              <option value="last_90d">Últimos 90 dias</option>
              <option value="this_month">Este mês</option>
              <option value="last_month">Mês anterior</option>
            </select>

            <button
              onClick={fetchAll}
              disabled={loading || !adAccountId || !token}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Buscando...' : 'Atualizar Dados'}
            </button>
            <button
              onClick={() => setShowTokenPanel(!showTokenPanel)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                token
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                  : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
              }`}
            >
              <Info size={13} />
              {token ? '🔑 Token OK' : '⚠️ Sem Token'}
            </button>
          </div>
        </div>

        {/* Token Setup Panel */}
        {showTokenPanel && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <p className="text-xs font-black text-amber-800 dark:text-amber-300 mb-1">🔑 Token de Acesso — Meta API</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">
              Gere um token em{' '}
              <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline font-black">
                Graph API Explorer
              </a>
              {' '}com permissões{' '}
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">ads_read</code>{' '}e{' '}
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">ads_management</code>.
              Para duração longa, use um <strong>token de página</strong> ou <strong>token de sistema</strong> (não expira).
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveToken()}
                placeholder="Cole aqui seu Access Token da Meta..."
                className="flex-1 text-xs px-3 py-2 border border-amber-200 dark:border-amber-700 rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-slate-400"
              />
              <button
                onClick={saveToken}
                disabled={!tokenInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors"
              >
                Salvar
              </button>
              {token && (
                <button
                  onClick={() => { setShowTokenPanel(false); setTokenInput(''); }}
                  className="px-3 py-2 text-xs font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
            {token && (
              <button onClick={clearToken} className="mt-2 text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors">
                Remover token salvo
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-0.5 scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${isActive
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-black text-rose-700 dark:text-rose-400">Erro na API Meta</p>
              <p className="text-xs text-rose-600 dark:text-rose-500 mt-1">{error}</p>
              <p className="text-xs text-rose-500 dark:text-rose-600 mt-1">Verifique se o token tem permissão <code>ads_read</code> e se a conta de anúncios está correta.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl animate-pulse">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-900 dark:text-white">Buscando dados da Meta API...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Isso pode levar alguns segundos</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        ) : !hasFetched ? (
          renderEmpty()
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'campaigns' && renderCampaigns()}
            {activeTab === 'adsets' && renderAdSets()}
            {activeTab === 'ads' && renderAds()}
            {activeTab === 'funil' && renderFunil()}
            {activeTab === 'recommendations' && renderRecommendations()}
          </>
        )}
      </div>
        </>
      )}
    </div>
  );
};
