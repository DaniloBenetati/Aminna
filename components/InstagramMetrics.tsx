import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Users, Eye, Heart, MessageCircle, Share2, Bookmark, TrendingUp, BarChart3, Instagram, Loader2 } from 'lucide-react';
import { syncAllMetrics, loadHistoryFromDB, calculateSummary, IGMetricSnapshot, IGPost } from '../services/instagramMetricsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Props { token: string; igUserId: string; }

export const InstagramMetrics: React.FC<Props> = ({ token, igUserId }) => {
  const [snapshot, setSnapshot] = useState<IGMetricSnapshot | null>(null);
  const [posts, setPosts] = useState<IGPost[]>([]);
  const [history, setHistory] = useState<IGMetricSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ msg: '', pct: 0 });
  const [lastSync, setLastSync] = useState<string>('');
  const [tab, setTab] = useState<'kpi'|'posts'|'rankings'|'charts'|'history'>('kpi');

  useEffect(() => {
    loadHistoryFromDB(igUserId).then(({ snapshots, posts: dbPosts }) => {
      setHistory(snapshots);
      if (snapshots.length > 0) setSnapshot(snapshots[0]);
      if (dbPosts.length > 0) setPosts(dbPosts);
      setLastSync(snapshots[0]?.synced_at || '');
    });
  }, [igUserId]);

  useEffect(() => {
    if (!token || !igUserId) return;
    const id = setInterval(() => { handleSync(true); }, 3600000);
    return () => clearInterval(id);
  }, [token, igUserId]);

  const handleSync = async (bg = false) => {
    if (loading || !token || !igUserId) return;
    setLoading(true);
    try {
      const { snapshot: s, posts: p } = await syncAllMetrics(token, igUserId, (msg, pct) => setProgress({ msg, pct }));
      setSnapshot(s); setPosts(p); setLastSync(s.synced_at);
      const { snapshots } = await loadHistoryFromDB(igUserId);
      setHistory(snapshots);
    } catch (e: any) { console.error(e); }
    setLoading(false); setProgress({ msg: '', pct: 0 });
  };

  const summary = useMemo(() => calculateSummary(snapshot, posts, history), [snapshot, posts, history]);

  const followerChart = useMemo(() =>
    [...history].reverse().slice(-48).map(h => ({
      label: new Date(h.synced_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      followers: h.followers_count
    })), [history]);

  const KPI = ({ label, value, icon: I, color = 'indigo' }: { label: string; value: string | number; icon: any; color?: string }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 p-3 shadow-sm">
      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br from-${color}-500 to-${color}-600 flex items-center justify-center mb-1`}>
        <I size={12} className="text-white" />
      </div>
      <p className="text-sm font-black text-slate-900 dark:text-white">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );

  if (!token || !igUserId) return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
      <Instagram size={48} strokeWidth={1} />
      <p className="text-sm font-black uppercase tracking-widest">Configure o token Meta e selecione uma conta IG</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['kpi','history','posts','rankings','charts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}>
              {t === 'kpi' ? 'Visão Geral' : t === 'history' ? 'Seguidores' : t === 'posts' ? 'Publicações' : t === 'rankings' ? 'Rankings' : 'Gráficos'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {lastSync && <span className="text-[8px] text-slate-400">Última sync: {new Date(lastSync).toLocaleString('pt-BR')}</span>}
          <button onClick={() => handleSync()} disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sincronizar
          </button>
        </div>
      </div>

      {loading && progress.msg && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 size={14} className="animate-spin text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600">{progress.msg}</span>
          </div>
          <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-1.5">
            <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}

      {/* KPI Tab */}
      {tab === 'kpi' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          <KPI label="Seguidores" value={summary.followers} icon={Users} />
          <KPI label="Novos Seguidores" value={summary.newFollowers} icon={TrendingUp} color="emerald" />
          <KPI label="Crescimento" value={`${summary.growthPercent}%`} icon={TrendingUp} color="emerald" />
          <KPI label="Publicações" value={summary.postsCount} icon={BarChart3} />
          <KPI label="Reels" value={summary.reelsCount} icon={BarChart3} color="rose" />
          <KPI label="Carrosséis" value={summary.carouselCount} icon={BarChart3} color="amber" />
          <KPI label="Alcance Total" value={summary.totalReach} icon={Eye} color="sky" />
          <KPI label="Impressões" value={summary.totalImpressions} icon={Eye} color="purple" />
          <KPI label="Contas Alcançadas" value={summary.accountsReached} icon={Users} color="sky" />
          <KPI label="Visualizações" value={summary.totalViews} icon={Eye} />
          <KPI label="Curtidas" value={summary.totalLikes} icon={Heart} color="rose" />
          <KPI label="Comentários" value={summary.totalComments} icon={MessageCircle} color="amber" />
          <KPI label="Compartilhamentos" value={summary.totalShares} icon={Share2} color="emerald" />
          <KPI label="Salvamentos" value={summary.totalSaved} icon={Bookmark} color="purple" />
          <KPI label="Engajamento Total" value={summary.totalEngagement} icon={TrendingUp} />
          <KPI label="Taxa Engajamento" value={`${summary.avgEngagementRate}%`} icon={TrendingUp} color="emerald" />
          <KPI label="Melhor Publicação" value={summary.bestPost ? `${summary.bestPost.total_interactions} int.` : 'N/A'} icon={Heart} color="rose" />
        </div>
      )}

      {/* Follower History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          {followerChart.length > 1 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800">
              <h3 className="text-xs font-black uppercase tracking-widest mb-4">Evolução de Seguidores</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={followerChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="followers" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700">
                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Data/Hora</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Seguidores</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Crescimento</th>
              </tr></thead>
              <tbody>{history.slice(0, 50).map((h, i) => {
                const prev = history[i + 1];
                const diff = prev ? h.followers_count - prev.followers_count : 0;
                return (
                  <tr key={h.id || i} className="border-b border-slate-50 dark:border-zinc-800 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-[10px] font-bold text-slate-600">{new Date(h.synced_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2 text-xs font-black text-slate-900 dark:text-white text-right">{h.followers_count.toLocaleString('pt-BR')}</td>
                    <td className={`px-4 py-2 text-xs font-black text-right ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {diff > 0 ? '+' : ''}{diff}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {tab === 'posts' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead><tr className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700">
              {['','Data','Tipo','Alcance','Impr.','Curtidas','Coment.','Compart.','Salvam.','Engaj.','Taxa','Seg.Est.','Collab'].map(h => (
                <th key={h} className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>{posts.slice(0, 100).map(p => {
              const thumb = p.thumbnail_url || p.media_url || '';
              return (
              <tr key={p.id} className="border-b border-slate-50 dark:border-zinc-800 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 text-[10px]">
                <td className="px-2 py-1">
                  {thumb ? (
                    <a href={p.permalink} target="_blank" rel="noreferrer">
                      <img src={thumb} alt="post" className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-zinc-700 hover:opacity-80 transition-opacity" />
                    </a>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-300 text-[8px] font-bold border border-slate-200 dark:border-zinc-700">
                      {p.media_type === 'VIDEO' ? '▶' : '📷'}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-bold text-slate-600">{p.timestamp ? new Date(p.timestamp).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${p.media_type === 'VIDEO' ? 'bg-rose-100 text-rose-600' : p.media_type === 'CAROUSEL_ALBUM' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>{p.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : p.media_type === 'VIDEO' ? 'Reel' : 'Post'}</span></td>
                <td className="px-3 py-2 font-bold">{p.reach.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2">{p.impressions.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2">{p.like_count.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2">{p.comments_count.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2">{p.shares_count.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2">{p.saved.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 font-bold text-indigo-600">{p.total_interactions.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 font-bold text-emerald-600">{p.engagement_rate}%</td>
                <td className="px-3 py-2 font-bold text-purple-600">{p.estimated_followers > 0 ? `+${p.estimated_followers}` : '-'}</td>
                <td className="px-3 py-2">{p.is_collab ? '✅' : '-'}</td>
              </tr>
            )})}</tbody>
          </table>
        </div>
      )}

      {/* Rankings Tab */}
      {tab === 'rankings' && <RankingsSection posts={posts} />}

      {/* Charts Tab */}
      {tab === 'charts' && <ChartsSection posts={posts} history={history} />}
    </div>
  );
};

// ─── Rankings Sub-component ────────────────────────────────────────────────
const RankingsSection: React.FC<{ posts: IGPost[] }> = ({ posts }) => {
  const [rankTab, setRankTab] = useState(0);
  const rankings = useMemo(() => {
    const s = (arr: IGPost[]) => arr.slice(0, 10);
    return [
      { label: 'Maior Alcance', data: s([...posts].sort((a, b) => b.reach - a.reach)), key: 'reach' as const },
      { label: 'Mais Curtidas', data: s([...posts].sort((a, b) => b.like_count - a.like_count)), key: 'like_count' as const },
      { label: 'Mais Comentários', data: s([...posts].sort((a, b) => b.comments_count - a.comments_count)), key: 'comments_count' as const },
      { label: 'Mais Compartilhados', data: s([...posts].sort((a, b) => b.shares_count - a.shares_count)), key: 'shares_count' as const },
      { label: 'Mais Salvos', data: s([...posts].sort((a, b) => b.saved - a.saved)), key: 'saved' as const },
      { label: 'Top Reels', data: s([...posts].filter(p => p.media_type === 'VIDEO').sort((a, b) => b.total_interactions - a.total_interactions)), key: 'total_interactions' as const },
      { label: 'Top Carrosséis', data: s([...posts].filter(p => p.media_type === 'CAROUSEL_ALBUM').sort((a, b) => b.total_interactions - a.total_interactions)), key: 'total_interactions' as const },
      { label: 'Maior Engajamento', data: s([...posts].sort((a, b) => b.engagement_rate - a.engagement_rate)), key: 'engagement_rate' as const },
      { label: 'Mais Seg. Estimados', data: s([...posts].sort((a, b) => b.estimated_followers - a.estimated_followers)), key: 'estimated_followers' as const },
      { label: '🤝 Collabs', data: s([...posts].filter(p => p.is_collab).sort((a, b) => b.total_interactions - a.total_interactions)), key: 'total_interactions' as const },
    ];
  }, [posts]);

  const r = rankings[rankTab];
  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {rankings.map((rk, i) => (
          <button key={i} onClick={() => setRankTab(i)}
            className={`px-2 py-1 text-[8px] font-bold uppercase rounded-lg ${rankTab === i ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}>
            {rk.label}
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
        {(r?.data || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <span className="text-4xl">🤝</span>
            <p className="text-xs font-black uppercase tracking-widest">Nenhum post de collab encontrado</p>
            <p className="text-[10px] text-slate-400 text-center max-w-xs">
              Collabs são detectados por posts co-autorizados no Instagram ou por <span className="font-bold">@menções</span> na legenda. Clique em <span className="font-bold">Sincronizar</span> para atualizar.
            </p>
          </div>
        ) : (
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 dark:bg-zinc-800">
            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase w-8">#</th>
            <th className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase w-16">Post</th>
            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Data</th>
            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Tipo</th>
            {r?.label === '🤝 Collabs' && <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Parceiro(s)</th>}
            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">{r?.label === '🤝 Collabs' ? 'Engajamento' : r?.label}</th>
          </tr></thead>
          <tbody>{(r?.data || []).map((p, i) => {
            const thumb = p.thumbnail_url || p.media_url || '';
            return (
            <tr key={p.id} className="border-b border-slate-50 dark:border-zinc-800 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
              <td className="px-4 py-2 text-xs font-black text-indigo-600">{i + 1}</td>
              <td className="px-2 py-1">
                {thumb ? (
                  <a href={p.permalink} target="_blank" rel="noreferrer" title="Abrir no Instagram">
                    <img src={thumb} alt={`post-${i+1}`} className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-zinc-700 hover:opacity-80 hover:scale-105 transition-all shadow-sm" />
                  </a>
                ) : (
                  <a href={p.permalink} target="_blank" rel="noreferrer">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-black shadow-sm hover:opacity-80 transition-opacity">
                      {p.media_type === 'VIDEO' ? '▶' : p.media_type === 'CAROUSEL_ALBUM' ? '⊞' : '📷'}
                    </div>
                  </a>
                )}
              </td>
              <td className="px-4 py-2 text-[10px] font-bold">{new Date(p.timestamp).toLocaleDateString('pt-BR')}</td>
              <td className="px-4 py-2 text-[10px]">{p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : 'Post'}</td>
              {r?.label === '🤝 Collabs' && (
                <td className="px-4 py-2 text-[10px] text-indigo-600 font-bold max-w-[160px] truncate">
                  {p.influencer_name || <span className="text-slate-300">—</span>}
                </td>
              )}
              <td className="px-4 py-2 text-xs font-black text-right">{typeof p[r.key] === 'number' ? (p[r.key] as number).toLocaleString('pt-BR') : p[r.key]}</td>
            </tr>
          )})}</tbody>
        </table>
        )}
      </div>
    </div>
  );
};

// ─── Charts Sub-component ──────────────────────────────────────────────────
const ChartsSection: React.FC<{ posts: IGPost[]; history: IGMetricSnapshot[] }> = ({ posts, history }) => {
  const dailyEng = useMemo(() => {
    const map: Record<string, { likes: number; comments: number; shares: number; saved: number; reach: number }> = {};
    posts.forEach(p => {
      const d = p.timestamp?.split('T')[0];
      if (!d) return;
      if (!map[d]) map[d] = { likes: 0, comments: 0, shares: 0, saved: 0, reach: 0 };
      map[d].likes += p.like_count; map[d].comments += p.comments_count;
      map[d].shares += p.shares_count; map[d].saved += p.saved; map[d].reach += p.reach;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({
      label: new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), ...v
    }));
  }, [posts]);

  const byType = useMemo(() => {
    const types = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];
    return types.map(t => {
      const filtered = posts.filter(p => p.media_type === t);
      const avgEng = filtered.length > 0 ? filtered.reduce((s, p) => s + p.engagement_rate, 0) / filtered.length : 0;
      return { type: t === 'IMAGE' ? 'Post' : t === 'VIDEO' ? 'Reel' : 'Carrossel', count: filtered.length, avgEng: Math.round(avgEng * 100) / 100, totalReach: filtered.reduce((s, p) => s + p.reach, 0) };
    });
  }, [posts]);

  const Chart = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>{children as any}</ResponsiveContainer>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Chart title="Evolução de Seguidores">
        <LineChart data={[...history].reverse().slice(-48).map(h => ({ label: new Date(h.synced_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), v: h.followers_count }))}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="label" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 8 }} domain={['dataMin-10','dataMax+10']} /><Tooltip /><Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} name="Seguidores" />
        </LineChart>
      </Chart>
      <Chart title="Alcance Diário">
        <BarChart data={dailyEng}><CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="label" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 8 }} /><Tooltip /><Bar dataKey="reach" fill="#6366f1" radius={[4,4,0,0]} name="Alcance" /></BarChart>
      </Chart>
      <Chart title="Engajamento Diário">
        <BarChart data={dailyEng}><CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="label" tick={{ fontSize: 8 }} /><YAxis tick={{ fontSize: 8 }} /><Tooltip /><Bar dataKey="likes" fill="#f43f5e" stackId="a" name="Curtidas" /><Bar dataKey="comments" fill="#f59e0b" stackId="a" name="Comentários" /><Bar dataKey="shares" fill="#10b981" stackId="a" name="Compartilhamentos" /><Bar dataKey="saved" fill="#8b5cf6" stackId="a" name="Salvamentos" /></BarChart>
      </Chart>
      <Chart title="Comparação por Tipo de Conteúdo">
        <BarChart data={byType}><CartesianGrid strokeDasharray="3 3" opacity={0.1} /><XAxis dataKey="type" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 8 }} /><Tooltip /><Bar dataKey="totalReach" fill="#6366f1" radius={[4,4,0,0]} name="Alcance Total" /></BarChart>
      </Chart>
    </div>
  );
};
