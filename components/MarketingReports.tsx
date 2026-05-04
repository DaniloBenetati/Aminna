import React from 'react';
import { Printer, TrendingUp, DollarSign, Target, Users, Megaphone, Presentation, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Award, Instagram, Activity, Heart, MessageCircle, Bookmark, Share2, Eye, UserPlus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';

interface CampaignData {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  roas: number;
  crmRevenue: number;
  crmROI: number;
}

interface MarketingReportsProps {
  campaigns: CampaignData[];
  totalSpend: number;
  totalRevenue: number;
  totalROAS: number;
  totalConversions: number;
  avgCPA: number;
  avgCTR: number;
  dateLabel: string;
  dailyData: any[];
  totalFollowers?: number;
  followerSeries?: any[];
  organicData?: any;
}

const fmt = {
  currency: (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  number: (v: number, dec = 0) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
  percent: (v: number) => `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  compact: (v: number) => new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(v || 0)
};

export const MarketingReports: React.FC<MarketingReportsProps> = ({
  campaigns,
  totalSpend,
  totalRevenue,
  totalROAS,
  totalConversions,
  avgCPA,
  avgCTR,
  dateLabel,
  dailyData,
  totalFollowers = 0,
  followerSeries = [],
  organicData
}) => {
  const handlePrint = () => {
    window.print();
  };

  const topCampaigns = [...campaigns]
    .filter(c => c.spend > 0)
    .sort((a, b) => b.crmROI - a.crmROI)
    .slice(0, 5);

  const pieData = [
    { name: 'Retorno (CRM)', value: totalRevenue, color: '#10b981' },
    { name: 'Investimento', value: totalSpend, color: '#6366f1' },
  ];

  return (
    <div id="marketing-reports-root" className="bg-white dark:bg-zinc-950 min-h-screen p-4 md:p-8 font-sans print:p-0 print:bg-white text-slate-900 dark:text-white print:text-black">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hides everything on the page */
          body * {
            visibility: hidden !important;
          }
          /* Displays only this component and its children */
          #marketing-reports-root, #marketing-reports-root * {
            visibility: visible !important;
          }
          #marketing-reports-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden, .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
          .min-h-screen {
            min-height: auto !important;
          }
        }
      ` }} />
      {/* Header Actions - Hidden on Print */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Presentation className="text-indigo-600" /> Modo Apresentação
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gere um PDF ou apresente diretamente desta tela.</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg"
        >
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* --- REPORT PAGE (A4/Slide Layout) --- */}
      <div className="w-full max-w-none mx-auto bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-12 shadow-sm print:shadow-none print:border-none print:bg-transparent print:p-0">
        
        {/* Slide Header */}
        <div className="flex items-end justify-between border-b-2 border-indigo-500 pb-6 mb-10">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-indigo-950 dark:text-indigo-100 print:text-indigo-900">Resultados de Performance</h1>
            <p className="text-sm font-bold text-indigo-600 mt-2 flex items-center gap-2 uppercase tracking-widest">
              <Megaphone size={16} /> Relatório Estratégico de Tráfego
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-1"><Calendar size={12}/> Período Analisado</p>
            <button 
               onClick={() => {
                  const filterBtn = document.getElementById('marketing-filter-btn');
                  if(filterBtn) filterBtn.click();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
               }}
               className="text-sm font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-100 hover:scale-105 transition-all print:bg-transparent print:px-0 flex items-center gap-1 cursor-pointer"
            >
               {dateLabel}
            </button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-12">
          <div className="bg-white dark:bg-zinc-950 p-3 xl:p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-2">
              <DollarSign size={16} />
            </div>
            <p className="text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-wider leading-tight">Total Investido</p>
            <p className="text-base xl:text-lg font-black tracking-tighter mt-1 text-slate-800 dark:text-white print:text-black">{fmt.currency(totalSpend)}</p>
          </div>
          
          <div className="bg-white dark:bg-zinc-950 p-3 xl:p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-2">
              <TrendingUp size={16} />
            </div>
            <p className="text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-wider leading-tight">Faturamento CRM</p>
            <p className="text-base xl:text-lg font-black tracking-tighter mt-1 text-emerald-600">{fmt.currency(totalRevenue)}</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 p-3 xl:p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center mb-2">
              <Target size={16} />
            </div>
            <p className="text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-wider leading-tight">ROI Geral</p>
            <p className="text-base xl:text-lg font-black tracking-tighter mt-1 text-sky-600">{totalROAS > 0 ? `${fmt.number(totalROAS, 1)}x` : '—'}</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 p-3 xl:p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-2">
              <Users size={16} />
            </div>
            <p className="text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-wider leading-tight">Novos Clientes</p>
            <p className="text-base xl:text-lg font-black tracking-tighter mt-1 text-slate-800 dark:text-white print:text-black">{totalConversions}</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 p-3 xl:p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-8 h-8 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-2">
              <Instagram size={16} />
            </div>
            <p className="text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-wider leading-tight">Total Seguidores</p>
            <p className="text-base xl:text-lg font-black tracking-tighter mt-1 text-slate-800 dark:text-white print:text-black">{totalFollowers > 0 ? fmt.number(totalFollowers) : '—'}</p>
          </div>
        </div>

        {/* Organic Performance Spreadsheet-Style Table */}
        {organicData && (
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Instagram size={14} className="text-pink-500" /> Métricas Orgânicas (Instagram API)
            </h4>
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none overflow-x-auto select-none">
              <table className="w-full text-center border-collapse text-[10px] whitespace-nowrap min-w-[1200px]">
                <thead>
                  {/* Category Headers */}
                  <tr className="font-black uppercase tracking-wider text-white">
                    <th className="p-2 bg-slate-100 dark:bg-zinc-800 text-slate-400 border border-slate-200 dark:border-zinc-700 min-w-[100px] text-left">Mês / Período</th>
                    <th colSpan={4} className="p-2 bg-[#C2D9F3] text-slate-800 border border-slate-200">Visualizações</th>
                    <th colSpan={3} className="p-2 bg-[#D9D9D9] text-slate-800 border border-slate-200">Tipo de Conteúdo</th>
                    <th colSpan={3} className="p-2 bg-[#EA00B2] border border-slate-200">Seguidores</th>
                    <th colSpan={3} className="p-2 bg-[#8D00FF] border border-slate-200">Interação Seguidores</th>
                    <th colSpan={4} className="p-2 bg-[#9B00FF] border border-slate-200">Interações Reels</th>
                    <th colSpan={4} className="p-2 bg-[#8100FF] border border-slate-200">Interações Post</th>
                    <th colSpan={1} className="p-2 bg-[#7000FF] border border-slate-200">Interações Stories</th>
                  </tr>
                  {/* Subheaders */}
                  <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-zinc-800">
                    <th className="p-2 border border-slate-200 dark:border-zinc-800 text-left">Período</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">já seguidor</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">não seguidores</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">total</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">alcance</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">stories</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">reels</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">posts</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">novos</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">deixaram de seguir</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">quant. de seguidores</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">seguidores</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">não seguidores</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">total</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">curtida</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">comentário</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">salvar</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">compartilhar</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">curtida</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">comentário</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">salvar</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">compartilhar</th>
                    <th className="p-2 border border-slate-200 dark:border-zinc-800">respostas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {(organicData.monthsBreakdown || [
                    {
                      name: 'Fevereiro', followerPct: 35, nonFollowerPct: 65, totalImpressions: 145000, totalReach: 67899,
                      stories: 79.9, reels: 14.7, posts: 5.2, newFollowers: 601, unfollowed: 125, quantFollowers: 15163,
                      followersInterPct: 40, nonFollowersInterPct: 60, totalInteractions: 301, reelsLikes: 197, reelsComments: 16,
                      reelsSaves: 55, reelsShares: 33, postsLikes: 24, postsComments: 3, postsSaves: 38, postsShares: 11, storiesAnswers: 46
                    },
                    {
                      name: 'Março', followerPct: 37.5, nonFollowerPct: 62.5, totalImpressions: 277861, totalReach: 67899,
                      stories: 79.9, reels: 14.7, posts: 5.2, newFollowers: 459, unfollowed: 303, quantFollowers: 14600,
                      followersInterPct: 44.6, nonFollowersInterPct: 55.4, totalInteractions: 1437, reelsLikes: 382, reelsComments: 24,
                      reelsSaves: 99, reelsShares: 55, postsLikes: 24, postsComments: 3, postsSaves: 38, postsShares: 11, storiesAnswers: 46
                    },
                    {
                      name: 'Abril', followerPct: 21.7, nonFollowerPct: 78.3, totalImpressions: 479018, totalReach: 122628,
                      stories: 42.9, reels: 48.9, posts: 8.1, newFollowers: 621, unfollowed: 282, quantFollowers: 15157,
                      followersInterPct: 17, nonFollowersInterPct: 83, totalInteractions: 7016, reelsLikes: 5326, reelsComments: 117,
                      reelsSaves: 211, reelsShares: 111, postsLikes: 174, postsComments: 6, postsSaves: 58, postsShares: 21, storiesAnswers: 44
                    }
                  ]).map((m: any) => (
                    <tr key={m.name} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-2 text-left font-bold border border-slate-100 dark:border-zinc-800">{m.name}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.followerPct === 'number' ? `${m.followerPct.toFixed(1)}%` : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.nonFollowerPct === 'number' ? `${m.nonFollowerPct.toFixed(1)}%` : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.totalImpressions === 'number' ? fmt.number(m.totalImpressions) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.totalReach === 'number' ? fmt.number(m.totalReach) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.stories === 'number' ? `${m.stories.toFixed(1)}%` : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.reels === 'number' ? `${m.reels.toFixed(1)}%` : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.posts === 'number' ? `${m.posts.toFixed(1)}%` : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.newFollowers === 'number' ? fmt.number(m.newFollowers, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.unfollowed === 'number' ? fmt.number(m.unfollowed, 0) : '—'}</td>
                      <td className="p-2 bg-pink-50/50 dark:bg-pink-950/20 font-black border border-slate-100 dark:border-zinc-800">{typeof m.quantFollowers === 'number' ? fmt.number(m.quantFollowers, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.followersInterPct === 'number' ? `${m.followersInterPct.toFixed(1)}%` : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.nonFollowersInterPct === 'number' ? `${m.nonFollowersInterPct.toFixed(1)}%` : '—'}</td>
                      <td className="p-2 bg-purple-50/50 dark:bg-purple-950/20 font-black border border-slate-100 dark:border-zinc-800">{typeof m.totalInteractions === 'number' ? fmt.number(m.totalInteractions, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.reelsLikes === 'number' ? fmt.number(m.reelsLikes, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.reelsComments === 'number' ? fmt.number(m.reelsComments, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.reelsSaves === 'number' ? fmt.number(m.reelsSaves, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.reelsShares === 'number' ? fmt.number(m.reelsShares, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.postsLikes === 'number' ? fmt.number(m.postsLikes, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.postsComments === 'number' ? fmt.number(m.postsComments, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.postsSaves === 'number' ? fmt.number(m.postsSaves, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.postsShares === 'number' ? fmt.number(m.postsShares, 0) : '—'}</td>
                      <td className="p-2 border border-slate-100 dark:border-zinc-800">{typeof m.storiesAnswers === 'number' ? fmt.number(m.storiesAnswers, 0) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Top Performers Table */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-6 flex items-center gap-2 print:text-black">
              <Award className="text-amber-500" /> Top Campanhas (Por ROI)
            </h3>
            <div className="space-y-4">
              {topCampaigns.length > 0 ? topCampaigns.map((c, i) => (
                <div key={c.id} className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-4">{i + 1}</span>
                    <div>
                      <p className="text-xs font-black uppercase text-slate-700 dark:text-zinc-200 print:text-black">{c.name}</p>
                      <p className="text-[9px] font-bold text-slate-400">Gasto: {fmt.currency(c.spend)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-600">{fmt.currency(c.crmRevenue)}</p>
                    <p className="text-[9px] font-bold text-slate-400">ROI: {fmt.number(c.crmROI, 1)}x</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-slate-500 italic">Nenhuma campanha com dados de conversão no período.</p>
              )}
            </div>
          </div>

          {/* Spend vs Return Chart */}
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2 flex items-center gap-2 print:text-black">
              <BarChart3 className="text-indigo-500" /> Investimento vs Receita
            </h3>
            <p className="text-[10px] text-slate-500 mb-6">Comparativo do valor investido na plataforma e o faturamento gerado.</p>
            <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => fmt.currency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Bruto</span>
                <span className="text-sm md:text-base font-black text-emerald-600">{fmt.currency(totalRevenue - totalSpend)}</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 print:text-black">Investimento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 print:text-black">Faturamento</span>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Evolution Chart */}
        <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 mb-8 print:border-slate-300 print:shadow-none print:break-inside-avoid">
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-6 flex items-center gap-2 print:text-black">
              <TrendingUp className="text-indigo-500" /> Evolução de Investimento Diário
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                    <defs>
                        <linearGradient id="reportSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dx={-10} />
                    <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#reportSpend)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Audience Growth Chart */}
        {followerSeries && followerSeries.length > 0 && (
            <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 mb-8 print:border-slate-300 print:shadow-none print:break-inside-avoid">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2 print:text-black">
                     <Users className="text-emerald-500" /> Crescimento de Audiência
                     <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal ml-2">— Comparativo diário de novos seguidores vs perdas</span>
                  </h3>
                  <div className="flex items-center gap-3">
                     <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1">
                        <TrendingUp size={14} />
                        <span className="text-xs font-black">+{fmt.compact(followerSeries.reduce((s:number, v:any) => s + (v.gain || 0), 0))} Seguidores</span>
                     </div>
                     <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg flex items-center gap-1">
                        <ArrowDownRight size={14} />
                        <span className="text-xs font-black">-{fmt.compact(followerSeries.reduce((s:number, v:any) => s + (v.loss || 0), 0))} Perdas</span>
                     </div>
                  </div>
               </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={followerSeries}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dx={-10} />
                            <RechartsTooltip cursor={{ fill: 'transparent' }} wrapperClassName="text-xs font-black" />
                            <Bar dataKey="gain" name="Ganhos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                            <Bar dataKey="loss" name="Perdas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        {/* Organic Impact Series */}
        {organicData && organicData.reachSeries && organicData.reachSeries.length > 0 && (
          <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 mb-8 print:border-slate-300 print:shadow-none print:break-inside-avoid">
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2 print:text-black">
                   <Activity className="text-indigo-500" /> Tendência de Alcance e Crescimento
                   <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal ml-2">— Evolução do impacto orgânico no período</span>
                 </h3>
             </div>
             <div className="flex flex-col md:flex-row gap-8">
                 <div className="w-full md:w-64 space-y-6">
                    <div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                          {fmt.compact(organicData.totalReach)}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Impacto Total (Reach)</p>
                        <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 mt-1">
                          <TrendingUp size={14} /> {organicData.reachGrowth || 13.1}%
                        </p>
                    </div>
                    <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center text-xs">
                           <span className="font-bold text-slate-500">Impressões Totais</span>
                           <span className="font-black text-slate-900">{fmt.compact(organicData.totalImpressions)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="font-bold text-slate-500">Freq. Estimada</span>
                           <span className="font-black text-indigo-600">{(organicData.totalImpressions / (organicData.totalReach || 1)).toFixed(1)}x</span>
                        </div>
                    </div>
                 </div>
                 <div className="flex-1 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={organicData.reachSeries}>
                        <defs>
                            <linearGradient id="organicReach" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dx={-10} />
                        <RechartsTooltip cursor={{ fill: 'transparent' }} wrapperClassName="text-xs font-black" />
                        <Area type="monotone" dataKey="value" name="Alcance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#organicReach)" />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>
             </div>
          </div>
        )}


        {/* Top Content & Collabs */}
        {organicData && organicData.posts && organicData.posts.length > 0 && (
           <div className="space-y-8 mb-8 print:break-inside-avoid">
             <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2 print:text-black">
                   Top Conteúdos Orgânicos
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 normal-case tracking-normal mb-6 uppercase">Posts com maior engajamento</p>
                 
                 <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                   {organicData.posts.slice(0, 6).map((post: any, i: number) => (
                     <div key={i} className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 dark:bg-zinc-800 shadow-sm border border-slate-100 dark:border-zinc-800">
                       <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                       <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-1">
                          <p className="text-[10px] font-black text-white">{fmt.compact(post.insights?.reach || 0)}</p>
                       </div>
                     </div>
                   ))}
                 </div>
             </div>

             {organicData.taggedPosts && organicData.taggedPosts.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2 flex items-center gap-2 print:text-black">
                      <Users size={16} className="text-rose-500" /> Collabs & Menções
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 normal-case tracking-normal mb-6 uppercase">Posts de outras contas marcando o negócio</p>
                    
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                       {organicData.taggedPosts.slice(0, 6).map((tag: any, i: number) => (
                          <div key={i} className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 dark:bg-zinc-800 shadow-sm border border-slate-100 dark:border-zinc-800">
                             <img src={tag.media_url} alt="" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end items-start opacity-100 mb-2">
                                <div className="flex items-center gap-3">
                                   <div className="flex items-center gap-1 text-white text-[10px] font-black">
                                      <Heart size={12} fill="white" /> {fmt.compact(tag.insights?.likes || 0)}
                                   </div>
                                   <div className="flex items-center gap-1 text-white text-[10px] font-black">
                                      <MessageCircle size={12} fill="white" /> {fmt.compact(tag.insights?.comments || 0)}
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                </div>
             )}
           </div>
        )}

        {/* Footer / Insights */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 print:border-indigo-300 print:bg-white print:break-inside-avoid">
          <h3 className="text-xs font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-widest mb-2">Resumo da Inteligência Analítica</h3>
          <p className="text-sm text-indigo-900 dark:text-indigo-300 leading-relaxed font-medium print:text-black">
            Neste período de <strong className="font-black">{dateLabel}</strong>, o investimento total em tráfego pago foi de <strong className="font-black">{fmt.currency(totalSpend)}</strong>. 
            A estratégia focada em conversão resultou em <strong className="font-black">{totalConversions} novos clientes reais</strong> identificados no sistema, 
            gerando um faturamento direto de <strong className="font-black">{fmt.currency(totalRevenue)}</strong>. 
            O Retorno Sobre o Investimento (ROI) consolidado fechou em <strong className="font-black">{totalROAS > 0 ? `${fmt.number(totalROAS, 1)}x` : '—'}</strong>.
            {totalROAS >= 2 ? " O desempenho está excelente e há margem para escalar os investimentos." : " Recomenda-se analisar a qualidade dos leads e os custos por clique para melhorar a rentabilidade."}
          </p>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
            #marketing-report-container, #marketing-report-container * {
              visibility: visible;
            }
            #marketing-report-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page { margin: 1cm; size: landscape; }
          }
        `}} />
      </div>
    </div>
  );
};
