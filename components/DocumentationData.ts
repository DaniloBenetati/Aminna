
export const DOCUMENTATION_DATA = {
    title: "Documentação do Sistema: Gestão Inteligente - Aminna",
    description: "Esta documentação detalha a estrutura atual do sistema, as fases (módulos), o relacionamento entre os dados e os fluxos de processo. O objetivo é permitir a análise da arquitetura de dados e lógica de negócios.",
    note: "Atualmente, o sistema utiliza dados locais (mock) definidos em constants.ts e types.ts. A estrutura de banco de dados abaixo representa o esquema lógico que deve ser implementado no Supabase.",
    sections: [
        {
            title: "1. Módulos do Sistema (Detalhamento)",
            content: "Abaixo, o detalhamento funcional de cada aba do sistema:",
            subsections: [
                {
                    title: "📊 Dashboard",
                    subtitle: "Visão Geral do Negócio",
                    description: "O painel de controle principal. Aqui você tem um resumo instantâneo da saúde do seu negócio.",
                    items: [
                        { label: "KPIs", text: "Faturamento do dia, Atendimentos realizados, Ticket Médio." },
                        { label: "Gráficos", text: "Evolução de vendas e comparativos mensais." },
                        { label: "Acesso Rápido", text: "Atalhos para as funções mais usadas." }
                    ]
                },
                {
                    title: "📅 Agenda (Completa e Diária)",
                    subtitle: "Gestão de Atendimentos",
                    description: "O coração da operação. Permite visualizar e gerenciar o tempo da equipe.",
                    items: [
                        { label: "Agenda Completa", text: "Visão mensal ou semanal de todos os profissionais." },
                        { label: "Agenda Diária", text: "Foco operacional no 'hoje'. Check-in e check-out de clientes." },
                        { label: "Funcionalidades", text: "Agendamento de múltiplos serviços, bloqueio de horários, status (Confirmado, Pendente, etc.)." }
                    ]
                },
                {
                    title: "👥 Clientes",
                    subtitle: "Base de Clientes e Histórico",
                    description: "Gestão completa do relacionamento com quem frequenta o espaço.",
                    items: [
                        { label: "Perfil", text: "Dados pessoais, preferências, alergias e restrições." },
                        { label: "Histórico", text: "Lista de todos os serviços já realizados e produtos comprados." },
                        { label: "Fidelidade", text: "Identificação automática de clientes VIP ou em Risco de Churn (abandono)." }
                    ]
                },
                {
                    title: "🤝 CRM (Leads)",
                    subtitle: "Gestão de Oportunidades",
                    description: "Funil de vendas para atrair novos clientes.",
                    items: [
                        { label: "Kanban", text: "Visualização em colunas (Novo, Atendimento, Qualificado, Convertido)." },
                        { label: "Origem", text: "Rastreamento de onde o cliente veio (Instagram, Google, Indicação)." },
                        { label: "Conversão", text: "Transforme um Lead em um Cliente com um clique quando ele agendar." }
                    ]
                },
                {
                    title: "☕ Copa & Consumo",
                    subtitle: "Controle de Cortesia e Uso Interno",
                    description: "Gestão inteligente dos itens consumíveis.",
                    items: [
                        { label: "Para Clientes", text: "Registre o que foi servido (café, água). O valor é R$ 0,00 (cortesia), mas o custo é contabilizado." },
                        { label: "Para Equipe", text: "Controle de materiais de uso interno (luvas, máscaras, itens de copa)." },
                        { label: "Custo", text: "Separação clara entre Custo de Atendimento e Despesa Administrativa." }
                    ]
                },
                {
                    title: "🤛 Parcerias",
                    subtitle: "Marketing e Influenciadores",
                    description: "Gestão de campanhas promocionais e parceiros comerciais.",
                    items: [
                        { label: "Parceiros", text: "Cadastro de influenciadores ou empresas parceiras." },
                        { label: "Campanhas", text: "Criação de cupons de desconto (ex: VERAO10)." },
                        { label: "ROI", text: "Acompanhamento de quanto cada parceiro trouxe de retorno financeiro." }
                    ]
                },
                {
                    title: "✨ Serviços",
                    subtitle: "Catálogo de Procedimentos",
                    description: "Configuração do menu de serviços oferecidos.",
                    items: [
                        { label: "Detalhes", text: "Nome, Preço, Duração Estimada." },
                        { label: "Técnica", text: "Habilidade requerida (ex: Manicure, Podologia) para garantir que apenas profissionais qualificados realizem o serviço." }
                    ]
                },
                {
                    title: "👜 Profissionais",
                    subtitle: "Gestão da Equipe",
                    description: "Cadastro e configuração dos seus colaboradores.",
                    items: [
                        { label: "Dados", text: "Informações pessoais e bancárias (Chave Pix)." },
                        { label: "Especialidades", text: "O que cada um sabe fazer." },
                        { label: "Comissões", text: "Definição da taxa de comissão individual." },
                        { label: "Escala", text: "Definição dos dias de trabalho." }
                    ]
                },
                {
                    title: "🛒 Vendas",
                    subtitle: "Frente de Caixa (POS)",
                    description: "Venda rápida de produtos avulsos (home care).",
                    items: [
                        { label: "Loja", text: "Venda de cremes, óleos e acessórios para clientes." },
                        { label: "Estoque", text: "Baixa automática do estoque de revenda." }
                    ]
                },
                {
                    title: "📊 Financeiro",
                    subtitle: "Fluxo de Caixa e DRE",
                    description: "Controle financeiro rigoroso com DRE (Demonstrativo de Resultado) estruturado para análise de viabilidade real.",
                    customContent: `
                        <div style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                            <strong>Estrutura da DRE</strong>
                            <ul style="list-style-type: none; padding-left: 0; font-size: 0.9em;">
                                <li>1. <strong>Receita Bruta</strong>: Soma de todas vendas de Serviços e Produtos.</li>
                                <li>2. <strong>(-) Deduções</strong>: Impostos sobre nota (Simples/ISS) e taxas de cartão.</li>
                                <li>3. <strong>(=) Receita Líquida</strong>: O dinheiro que realmente entra.</li>
                                <li>4. <strong>(-) CMV/CPV</strong>: Custos diretos (Comissões e Custo de Produtos Vendidos).</li>
                                <li>5. <strong>(=) Lucro Bruto</strong>: O quanto sobra para pagar a operação.</li>
                                <li>6. <strong>(-) Despesas Operacionais</strong>:
                                    <ul style="padding-left: 20px;">
                                        <li><strong>Despesas com Vendas</strong>: Marketing, Ads.</li>
                                        <li><strong>Despesas Administrativas</strong>: Aluguel, Software, Energia, Salários fixos.</li>
                                        <li><strong>Despesas Financeiras</strong>: Juros, Tarifas bancárias.</li>
                                    </ul>
                                </li>
                                <li>7. <strong>(=) Resultado Antes IRPJ/CSLL</strong>: Lucro Operacional.</li>
                                <li>8. <strong>(-) Provisões IRPJ/CSLL</strong>: Impostos sobre lucro (se houver).</li>
                                <li>9. <strong>(=) Resultado Líquido</strong>: O lucro final no bolso do sócio.</li>
                            </ul>
                        </div>
                    `
                },
                {
                    title: "💰 Fechamentos",
                    subtitle: "Pagamento de Comissões",
                    description: "Ferramenta para calcular quanto pagar a cada profissional.",
                    items: [
                        { label: "Cálculo Automático", text: "Baseado nos atendimentos 'Concluídos' e na taxa de comissão gravada (snapshot)." },
                        { label: "Descontos", text: "Abate adiantamentos ou vales." },
                        { label: "Relatório", text: "Gera o extrato detalhado para o profissional." }
                    ]
                },
                {
                    title: "📦 Estoque",
                    subtitle: "Gestão de Materiais",
                    description: "Controle de produtos para uso interno e revenda.",
                    items: [
                        { label: "Categorias", text: "Separação entre 'Uso Interno' (custo) e 'Venda' (receita)." },
                        { label: "Níveis", text: "Alerta de estoque mínimo para reposição." }
                    ]
                }
            ]
        },
        {
            title: "2. Relacionamento de Banco de Dados (ERD)",
            content: "Abaixo está o diagrama de Entidade-Relacionamento (ERD) proposto, baseado nas interfaces do sistema.",
            hasDiagram: true,
            diagramType: "erd",
            analysis: [
                { label: "Customer x Appointment", text: "Um cliente pode ter múltiplos agendamentos históricos e futuros." },
                { label: "Provider x Appointment", text: "Um profissional realiza muitos agendamentos. A comissão é calculada com base na snapshot (cópia) da taxa no momento do agendamento." },
                { label: "StockItem x Sale", text: "Produtos marcados como 'Venda' saem do estoque através de Vendas." },
                { label: "StockItem x UsageLog", text: "Produtos de 'Uso Interno' saem através de logs de uso (audit)." }
            ]
        },
        {
            title: "3. Fluxogramas de Processos Chave",
            subsections: [
                {
                    title: "Fluxo de Agendamento e Atendimento",
                    description: "Este fluxo descreve o ciclo de vida de um agendamento, desde a criação até a conclusão financeira.",
                    hasDiagram: true,
                    diagramType: "flow_schedule"
                },
                {
                    title: "Fluxo de Controle de Estoque",
                    description: "Este fluxo descreve a movimentação de entrada e saída de materiais.",
                    hasDiagram: true,
                    diagramType: "flow_stock"
                }
            ]
        },
        {
            title: "4. Regras de Negócio por Módulo",
            subsections: [
                {
                    title: "🤝 Parcerias",
                    items: [
                        { label: "Gestão de Influenciadores", text: "Parceiros do tipo 'Influencer' não pagam por serviços de permuta, mas o custo técnico deve ser registrado para cálculo de CAC (Custo de Aquisição de Cliente)." },
                        { label: "Cupons de Desconto", text: "Cada campanha deve ter um código único (ex: VERAO10). O sistema deve bloquear códigos expirados ou com limite de usabilidade atingido." },
                        { label: "ROI", text: "O sistema calcula automaticamente o Retorno sobre Investimento comparando o valor descontado vs. receita gerada por clientes novos que usaram o cupom." }
                    ]
                },
                {
                    title: "📊 Financeiro & DRE",
                    items: [
                        { label: "Caixa Fechado", text: "Nenhuma movimentação financeira pode ser editada após o 'Fechamento de Caixa Diário' ser concluído pelo gerente." },
                        { label: "Plano de Contas", text: "Todas as saídas devem obrigatoriamente ser categorizadas (Fixa, Variável, Pessoal, etc.) para garantir a precisão da DRE." },
                        { label: "Comissões", text: "O pagamento de comissões só é liberado para agendamentos com status CONCLUÍDO e PAGO." }
                    ]
                },
                {
                    title: "🛒 Vendas (POS) e Fechamentos",
                    items: [
                        { label: "Comissão de Venda", text: "Profissionais podem receber uma % diferente sobre venda de produtos versus serviços." },
                        { label: "Baixa de Estoque", text: "A venda no POS (Frente de Caixa) gera baixa imediata no estoque de 'Revenda'. Se o produto não tiver saldo, o sistema deve bloquear a venda ou emitir alerta de 'Saldo Negativo'." },
                        { label: "Fechamento Quinzenal", text: "O sistema deve permitir gerar fechamentos em períodos flexíveis, mas garantir que um mesmo atendimento não seja pago em duplicidade." }
                    ]
                },
                {
                    title: "✨ Serviços e Agendamento",
                    items: [
                        { label: "Bloqueio de Agenda", text: "Profissionais não podem receber agendamentos em horários de bloqueio (almoço, folga)." },
                        { label: "Duração Dinâmica", text: "Se um serviço dura 60min, o sistema deve bloquear este slot na agenda do profissional e da sala (se aplicável)." },
                        { label: "Fidelidade", text: "Clientes com mais de 3 meses sem visita devem ser marcados automaticamente como 'Inativos' ou 'Risco de Churn' para ação do CRM." }
                    ]
                },
                {
                    title: "☕ Copa e Consumo",
                    items: [
                        { label: "Custo Zero ao Cliente", text: "Itens consumidos por clientes (água, café) entram na comanda com valor R$ 0,00 para controle de estoque e auditoria de custos." },
                        { label: "Uso Interno", text: "Consumo da equipe (po de café, açúcar) deve ser lançado como 'Despesa Administrativa' na DRE, não no custo do serviço." }
                    ]
                },
                {
                    title: "👜 Profissionais",
                    items: [
                        { label: "Escala de Trabalho", text: "O sistema deve respeitar os dias de folga configurados no cadastro do profissional ao exibir disponibilidade na agenda." },
                        { label: "Taxas Personalizadas", text: "É possível ter uma taxa de comissão global (ex: 50%) e exceções por serviço (ex: Manicure 50%, Podologia 60%)." }
                    ]
                }
            ]
        },
        {
            title: "5. Stack Tecnológico",
            content: "Tecnologias utilizadas no desenvolvimento do sistema:",
            subsections: [
                {
                    title: "Frontend (Interface)",
                    tags: ["React (Vite)", "TypeScript", "TailwindCSS", "Lucide React", "Recharts"]
                },
                {
                    title: "Backend (Banco de Dados e API)",
                    tags: ["Supabase", "PostgreSQL", "RLS (Row Level Security)", "Auth (Supabase Auth)"]
                },
                {
                    title: "Ferramentas de Desenvolvimento",
                    tags: ["Vite", "ESLint / Prettier"]
                }
            ]
        }
    ]
};
