import React from 'react';
import { Printer, TrendingUp, DollarSign, Target, Users, Megaphone, Presentation, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
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
}

const fmt = {
  currency: (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  number: (v: number, dec = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
  percent: (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
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
  dailyData
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
    <div className="bg-white dark:bg-zinc-950 min-h-screen p-4 md:p-8 font-sans print:p-0 print:bg-white text-slate-900 dark:text-white print:text-black">
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
      <div className="max-w-5xl mx-auto bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-12 shadow-sm print:shadow-none print:border-none print:bg-transparent print:p-0">
        
        {/* Slide Header */}
        <div className="flex items-end justify-between border-b-2 border-indigo-500 pb-6 mb-10">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-indigo-950 dark:text-indigo-100 print:text-indigo-900">Resultados de Performance</h1>
            <p className="text-sm font-bold text-indigo-600 mt-2 flex items-center gap-2 uppercase tracking-widest">
              <Megaphone size={16} /> Relatório Estratégico de Tráfego
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-end gap-1"><Calendar size={12}/> Período Analisado</p>
            <p className="text-sm font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg print:bg-transparent print:px-0">{dateLabel}</p>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <DollarSign size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Investido</p>
            <p className="text-2xl font-black mt-1 text-slate-800 dark:text-white print:text-black">{fmt.currency(totalSpend)}</p>
          </div>
          
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento CRM</p>
            <p className="text-2xl font-black mt-1 text-emerald-600">{fmt.currency(totalRevenue)}</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center mb-4">
              <Target size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ROI Geral (Retorno)</p>
            <p className="text-2xl font-black mt-1 text-sky-600">{totalROAS > 0 ? `${fmt.number(totalROAS, 1)}x` : '—'}</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-zinc-800 print:border-slate-300 print:shadow-none">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <Users size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Novos Clientes</p>
            <p className="text-2xl font-black mt-1 text-slate-800 dark:text-white print:text-black">{totalConversions}</p>
          </div>
        </div>

        {/* Charts Section */}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Bruto</span>
                <span className="text-lg font-black text-emerald-600">{fmt.currency(totalRevenue - totalSpend)}</span>
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
