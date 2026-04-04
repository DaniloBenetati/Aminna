
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Instagram, TrendingUp, TrendingDown, Eye, MousePointer, 
  BarChart3, RefreshCw, MessageCircle, Heart, Share2, 
  Bookmark, Play, Layers, CheckCircle, Zap, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Users, Sparkles
} from 'lucide-react';

// --- Types ---

interface IGPost {
  id: string;
  media_type: 'REELS' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption: string;
  media_url: string;
  permalink: string;
  timestamp: string;
  insights: {
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    plays?: number;
    watch_time?: number;
    retention?: number;
  };
}

interface IGStory {
  id: string;
  media_url: string;
  timestamp: string;
  insights: {
    reach: number;
    impressions: number;
    replies: number;
    taps_forward: number;
    taps_back: number;
    exits: number;
  };
}

const TOKEN_STORAGE_KEY = 'meta_ads_token';
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const fmt = {
  number: (v: number) => v.toLocaleString('pt-BR'),
  percent: (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
};

// --- Sub-components ---

const MetricCard = ({ label, value, sub, icon: Icon, color = "indigo", danger = false, trend }: any) => {
  const colorMap: any = {
    indigo: 'from-indigo-500 to-violet-600',
    pink: 'from-pink-500 to-rose-600',
    amber: 'from-amber-400 to-orange-500',
    emerald: 'from-emerald-500 to-teal-600',
    sky: 'from-sky-500 to-blue-600',
  };
  const grad = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm group hover:shadow-lg transition-all duration-300 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${grad} opacity-5 rounded-full -translate-y-6 translate-x-6 group-hover:opacity-10 transition-opacity`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend && (
           <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
             {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
             {Math.abs(trend)}%
           </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white mb-0.5 tracking-tight">{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, sub }: any) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg">
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{title}</h3>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub}</p>
    </div>
  </div>
);

// --- Main Component ---

export const InstagramOrganic: React.FC<{ token: string; datePreset?: string }> = ({ token, datePreset = 'last_30d' }) => {
  const [loading, setLoading] = useState(false);
  const [igUserId, setIgUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<IGPost[]>([]);
  const [stories, setStories] = useState<IGStory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mock data for initial presentation
  const mockReels = {
    avgEngagement: 8.4,
    retention: 45,
    topThemes: ['Transformação Mechas', 'Experiência Premium', 'Dicas de Home Care VIP'],
    viralPotential: 'Vídeos com trilhas exclusivas e transições rápidas'
  };

  const fetchIGData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Get user pages and their linked IG accounts
      const pagesRes = await fetch(`${META_GRAPH_URL}/me/accounts?access_token=${token}&fields=instagram_business_account,name`);
      const pagesData = await pagesRes.json();
      
      const igAcc = pagesData.data?.find((p: any) => p.instagram_business_account)?.instagram_business_account?.id;
      
      if (!igAcc) {
          setError("Não encontramos uma conta de Instagram Business vinculada a este token.");
          setLoading(false);
          return;
      }
      
      setIgUserId(igAcc);

      // 2. Fetch Media
      const limit = datePreset === 'last_90d' ? 100 : 50;
      // Fetch core fields including like_count and comments_count which are more reliable than insights edge
      const mediaRes = await fetch(`${META_GRAPH_URL}/${igAcc}/media?access_token=${token}&fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}`);
      const mediaData = await mediaRes.json();

      if (mediaData.data) {
        const mediaWithInsights = await Promise.all(
          mediaData.data.slice(0, limit).map(async (m: any) => {
            try {
              // Standard metrics for all media types
              let metrics = 'reach,impressions,saved';
              
              // Add video specific metrics if applicable
              if (m.media_type === 'VIDEO' || m.media_type === 'REELS') {
                metrics += ',plays';
              }
              
              const insightRes = await fetch(`${META_GRAPH_URL}/${m.id}/insights?access_token=${token}&metric=${metrics}`);
              const insightData = await insightRes.json();
              const getVal = (name: string) => insightData.data?.find((i: any) => i.name === name)?.values?.[0]?.value || 0;
              
              return {
                ...m,
                insights: {
                  reach: getVal('reach'),
                  impressions: getVal('impressions'),
                  likes: m.like_count || 0, // Using field instead of insight
                  comments: m.comments_count || 0, // Using field instead of insight
                  shares: getVal('shares') || 0, // Note: shares might only be available for some media types/versions
                  saves: getVal('saved'),
                  plays: getVal('plays'),
                }
              };
            } catch (e) { 
              console.warn(`Error fetching insights for media ${m.id}:`, e);
              return { 
                ...m, 
                insights: {
                  reach: 0,
                  impressions: 0,
                  likes: m.like_count || 0,
                  comments: m.comments_count || 0,
                  shares: 0,
                  saves: 0,
                  plays: 0
                } 
              }; 
            }
          })
        );
        setPosts(mediaWithInsights);
      }

      // 3. Fetch Stories
      const storiesRes = await fetch(`${META_GRAPH_URL}/${igAcc}/stories?access_token=${token}&fields=id,media_url,timestamp`);
      const storiesData = await storiesRes.json();
      
      if (storiesData.data) {
        const storiesWithInsights = await Promise.all(
          storiesData.data.slice(0, 10).map(async (s: any) => {
            try {
              const insightRes = await fetch(`${META_GRAPH_URL}/${s.id}/insights?access_token=${token}&metric=reach,impressions,replies,taps_forward,taps_back,exits`);
              const insightData = await insightRes.json();
              const getVal = (name: string) => insightData.data?.find((i: any) => i.name === name)?.values?.[0]?.value || 0;
              return {
                ...s,
                insights: {
                  reach: getVal('reach'),
                  impressions: getVal('impressions'),
                  replies: getVal('replies'),
                  taps_forward: getVal('taps_forward'),
                  taps_back: getVal('taps_back'),
                  exits: getVal('exits'),
                }
              };
            } catch (e) { return { ...s, insights: {} }; }
          })
        );
        setStories(storiesWithInsights);
      }
      
    } catch (e: any) {
      console.error(e);
      setError("Erro ao conectar com Graph API. Verifique as permissões do seu token.");
    } finally {
      setLoading(false);
    }
  }, [token, datePreset]);

  useEffect(() => {
    if (token) fetchIGData();
  }, [token, fetchIGData]);

  const renderStrategicInsights = () => {
    const totalReach = posts.reduce((acc, p) => acc + (p.insights?.reach || 0), 0);
    const totalEng = posts.reduce((acc, p) => {
      const ins = p.insights;
      return acc + (ins ? (ins.likes || 0) + (ins.comments || 0) + (ins.shares || 0) + (ins.saves || 0) : 0);
    }, 0);
    const avgEngRate = totalReach > 0 ? (totalEng / totalReach) * 100 : 0;

    return (
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-emerald-500" size={20} />
            <h4 className="text-xs font-black uppercase tracking-widest">Alcance Total (Últimos 20)</h4>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
            <p className="text-sm font-black text-emerald-700">{fmt.number(totalReach)} Pessoas</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Público Único Alcançado</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="text-pink-500" size={20} />
            <h4 className="text-xs font-black uppercase tracking-widest">Engajamento Médio</h4>
          </div>
          <div className="p-4 bg-pink-50 dark:bg-pink-900/10 rounded-2xl border border-pink-100 dark:border-pink-900/20">
            <p className="text-sm font-black text-pink-700">{fmt.percent(avgEngRate)}</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Média por Alcance</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Bookmark className="text-violet-500" size={20} />
            <h4 className="text-xs font-black uppercase tracking-widest">Interações Totais</h4>
          </div>
          <div className="p-4 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-900/20">
            <p className="text-sm font-black text-violet-700">{fmt.number(totalEng)}</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Curtidas, Comentários, Envios e Salvos</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-zinc-950 p-6 space-y-10">
      
      {/* Overview Analytics Instagram */}
      <div>
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-xl">
              <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
                <Instagram size={28} className="text-pink-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Instagram Insights — Aminna</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">Posicionamento Premium & Performance Orgânica</p>
            </div>
          </div>
          
          <button 
            onClick={fetchIGData}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-pink-200 dark:shadow-rose-900/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analisando...' : 'Sincronizar Insights'}
          </button>
        </div>

        {!token && (
            <div className="mb-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl flex flex-col items-center text-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
                  <AlertTriangle size={24} className="text-white" />
               </div>
               <div>
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">Token Meta Ausente</h3>
                  <p className="text-xs text-amber-700 max-w-md">Para visualizar os insights orgânicos, você precisa configurar seu token de acesso na aba <strong>Tráfego Pago</strong> primeiro.</p>
               </div>
            </div>
        )}

        {error && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
               <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
               <p className="text-xs text-amber-700 font-bold">{error}</p>
            </div>
        )}

        {/* Global Strategy Highlights */}
        {renderStrategicInsights()}
      </div>

      {/* REELS Analytics */}
      <div>
        <SectionHeader icon={Play} title="Análise de REELS" sub="Foco: Alcance e Viralização" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard 
            label="Alcance Médio" 
            value={fmt.number(Math.floor(posts.filter(p => p.media_type === 'REELS' || p.media_type === 'VIDEO').reduce((acc, p) => acc + (p.insights?.reach || 0), 0) / (posts.filter(p => p.media_type === 'REELS' || p.media_type === 'VIDEO').length || 1)))} 
            icon={Eye} 
            color="pink" 
          />
          <MetricCard 
            label="Taxa de Engajamento" 
            value={fmt.percent((posts.filter(p => p.media_type === 'REELS' || p.media_type === 'VIDEO').reduce((acc, p) => acc + ((p.insights?.likes || 0) + (p.insights?.comments || 0)), 0) / (posts.filter(p => p.media_type === 'REELS' || p.media_type === 'VIDEO').reduce((acc, p) => acc + (p.insights?.reach || 1), 0) || 1)) * 100)} 
            icon={Heart} 
            color="pink" 
            sub="Referência Luxo: 5%" 
          />
          <MetricCard 
            label="Média de Plays" 
            value={fmt.number(Math.floor(posts.filter(p => p.media_type === 'REELS').reduce((acc, p) => acc + (p.insights?.plays || 0), 0) / (posts.filter(p => p.media_type === 'REELS').length || 1)))} 
            icon={Zap} 
            color="amber" 
          />
          <MetricCard 
            label="Compartilhamentos" 
            value={fmt.number(posts.filter(p => p.media_type === 'REELS').reduce((acc, p) => acc + (p.insights?.shares || 0), 0))} 
            icon={Share2} 
            color="emerald" 
          />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={12} className="text-amber-500" /> Desempenho dos Últimos Posts
                </h4>
                <div className="space-y-3">
                    {posts.slice(0, 3).map((p, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl flex items-center gap-3">
                        {p.media_url && <img src={p.media_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.caption || 'Sem legenda'}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{p.insights?.reach || 0} alcance · {p.insights?.likes || 0} curtidas</p>
                        </div>
                      </div>
                    ))}
                    {posts.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum post carregado ainda.</p>}
                </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Performance (Engagement)</h4>
                <div className="space-y-2">
                    {posts
                      .sort((a, b) => {
                        const engA = (a.insights?.likes || 0) + (a.insights?.comments || 0);
                        const engB = (b.insights?.likes || 0) + (b.insights?.comments || 0);
                        return engB - engA;
                      })
                      .slice(0, 3)
                      .map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-slate-50 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{p.caption || p.id}</span>
                            <div className="text-right flex-shrink-0">
                                <span className="text-xs font-black text-pink-600">{fmt.number(p.insights?.reach || 0)}</span>
                                <span className="text-[10px] text-slate-400 ml-2">{((((p.insights?.likes || 0) + (p.insights?.comments || 0)) / (p.insights?.reach || 1)) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                      ))}
                </div>
            </div>
        </div>
      </div>

      {/* STORIES Analytics */}
      <div>
        <SectionHeader icon={Instagram} title="Performance STORIES" sub="Foco: Conversa e Conexão" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard 
            label="Retenção (Proxy)" 
            value={fmt.percent(stories.length > 0 ? (stories.reduce((acc, s) => acc + (s.insights?.reach || 0), 0) / (stories.reduce((acc, s) => acc + (s.insights?.impressions || 1), 0) || 1)) * 100 : 0)} 
            icon={ArrowUpRight} 
            color="sky" 
            sub="Baseado em Reach/Imp" 
          />
          <MetricCard 
            label="Alcance Médio" 
            value={fmt.number(Math.floor(stories.reduce((acc, s) => acc + (s.insights?.reach || 0), 0) / (stories.length || 1)))} 
            icon={Eye} 
            color="sky" 
          />
          <MetricCard 
            label="Total de Respostas" 
            value={fmt.number(stories.reduce((acc, s) => acc + (s.insights?.replies || 0), 0))} 
            icon={MessageCircle} 
            color="emerald" 
          />
          <MetricCard 
            label="Navegação à Frente" 
            value={fmt.number(stories.reduce((acc, s) => acc + (s.insights?.taps_forward || 0), 0))} 
            icon={Users} 
            color="indigo" 
          />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm grid md:grid-cols-2 gap-8">
            <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pontos de Fuga & Retenção</h4>
                <div className="flex items-end gap-1 h-32 mb-4">
                    {[90, 85, 82, 60, 45, 40, 38].map((h, i) => (
                        <div key={i} className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-t-lg relative group">
                            <div className={`absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-1000 ${h < 50 ? 'bg-rose-400' : 'bg-sky-400'}`} style={{ height: `${h}%` }}>
                                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] p-1 rounded whitespace-nowrap">{h}%</div>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-500 font-bold text-center">Story 1 a 7 (Sequência Diária)</p>
            </div>
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                   <CheckCircle size={14} className="text-emerald-500 mt-1 flex-shrink-0" />
                   <div>
                       <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Mais Interação:</p>
                       <p className="text-xs text-slate-500">Enquetes de "This or That" (Este ou Aquele) sobre serviços de luxo. Pessoas amam dar opinião sobre estética.</p>
                   </div>
                </div>
                <div className="flex items-start gap-3">
                   <AlertTriangle size={14} className="text-rose-500 mt-1 flex-shrink-0" />
                   <div>
                       <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Ponto de Queda:</p>
                       <p className="text-xs text-slate-500">Stories com muito texto ou apenas foto de produto sem contexto humano. A retenção cai 30%.</p>
                   </div>
                </div>
                <div className="flex items-start gap-3">
                   <Zap size={14} className="text-amber-500 mt-1 flex-shrink-0" />
                   <div>
                       <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Dica de Conversão:</p>
                       <p className="text-xs text-slate-500">Use o sticker de link no Story 5 (pico de desejo) após mostrar um resultado. Nunca no início.</p>
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* FEED/CAROUSEL */}
      <div>
        <SectionHeader icon={Layers} title="FEED & CARROSSEL" sub="Foco: Posicionamento e Valor" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard 
            label="Média de Salvamentos" 
            value={fmt.number(Math.floor(posts.filter(p => p.media_type !== 'REELS' && p.media_type !== 'VIDEO').reduce((acc, p) => acc + (p.insights?.saves || 0), 0) / (posts.filter(p => p.media_type !== 'REELS' && p.media_type !== 'VIDEO').length || 1)))} 
            icon={Bookmark} 
            color="violet" 
          />
          <MetricCard 
            label="Alcance Médio" 
            value={fmt.number(Math.floor(posts.filter(p => p.media_type !== 'REELS' && p.media_type !== 'VIDEO').reduce((acc, p) => acc + (p.insights?.reach || 0), 0) / (posts.filter(p => p.media_type !== 'REELS' && p.media_type !== 'VIDEO').length || 1)))} 
            icon={Eye} 
            color="violet" 
          />
          <MetricCard 
            label="Comentários Totais" 
            value={fmt.number(posts.filter(p => p.media_type !== 'REELS' && p.media_type !== 'VIDEO').reduce((acc, p) => acc + (p.insights?.comments || 0), 0))} 
            icon={MessageCircle} 
            color="violet" 
          />
          <MetricCard 
            label="Engajamento Médio" 
            value={fmt.percent((posts.filter(p => p.media_type !== 'REELS' && p.media_type !== 'VIDEO').reduce((acc, p) => acc + ((p.insights?.likes || 0) + (p.insights?.comments || 0)), 0) / (posts.filter(p => p.media_type !== 'REELS' && p.media_type !== 'VIDEO').reduce((acc, p) => acc + (p.insights?.reach || 1), 0) || 1)) * 100)} 
            icon={Heart} 
            color="pink" 
          />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Temas que Reforçam Posicionamento Premium</h4>
            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { title: "Metodologia Aminna", desc: "Posts que explicam o cuidado técnico e exclusividade dos tratamentos.", saves: 240 },
                    { title: "Lifestyle Aminna", desc: "Fotos de arquitetura e experiência de luxo na unidade.", saves: 180 },
                    { title: "Dicas de Especialistas", desc: "Carrosséis educativos curados por profissionais seniores.", saves: 310 }
                ].map((tema, i) => (
                    <div key={i} className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <p className="text-xs font-black text-slate-900 dark:text-white mb-1">{tema.title}</p>
                        <p className="text-[11px] text-slate-500 mb-3">{tema.desc}</p>
                        <div className="flex items-center gap-2 text-[10px] font-black text-violet-600">
                            <Bookmark size={10} /> {tema.saves} salvamentos médios
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* STRATEGIC RECOMMENDATIONS */}
      <div className="pb-10">
        <div className="p-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-10 rounded-full -translate-y-10 translate-x-10 blur-3xl" />
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="text-amber-400" size={24} />
                    <h3 className="text-xl font-black tracking-tight">Recomendações Estratégicas (Foco Premium)</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">💎 O que Repetir (Escalar)</p>
                            <ul className="space-y-2">
                                <li className="text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Reels curtos com trilhas instrumentais sofisticadas.</li>
                                <li className="text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Carrosséis educativos com paleta clean.</li>
                                <li className="text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Stories de bastidores que mostram a organização e cuidado.</li>
                            </ul>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-2">🛑 O que Parar (Ajustar)</p>
                            <ul className="space-y-2">
                                <li className="text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Fotos em baixa luz ou com fundos poluídos.</li>
                                <li className="text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Legendas muito longas e puramente técnicas sem emoção.</li>
                                <li className="text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Excesso de "mosaicos" no feed (quebram o valor percebido).</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                        <h4 className="text-sm font-black uppercase mb-4 flex items-center gap-2">
                            <Zap size={16} className="text-amber-400" /> Próximos Passos
                        </h4>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0 text-xs font-black">1</div>
                                <p className="text-xs text-slate-200">Implementar "Aminna Morning Rituals" (Série de Reels mostrando a preparação da unidade para as clientes VIP).</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0 text-xs font-black">2</div>
                                <p className="text-xs text-slate-200">Criar Destaque "Experiência" com as melhores respostas de clientes sobre o atendimento premium.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0 text-xs font-black">3</div>
                                <p className="text-xs text-slate-200">Ajustar estética: Tons pastéis e maior contraste para destacar a sofisticação dos serviços.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
