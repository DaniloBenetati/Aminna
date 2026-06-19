import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!);

async function run() {
    console.log("Conectando ao Supabase...");
    const { data: config, error } = await supabase.from('marketing_config').select('*').maybeSingle();
    if (error) {
        console.error("Erro ao ler marketing_config:", error);
        return;
    }
    if (!config || !config.meta_token || !config.ad_account_id) {
        console.log("Nenhum token ou conta de anúncios configurados no banco de dados.");
        return;
    }

    const token = config.meta_token;
    const adAccountId = config.ad_account_id;
    console.log(`Token encontrado. Conta de anúncios: ${adAccountId}`);

    // Período de análise ao redor de 07/06/2026
    const startDate = "2026-06-01";
    const endDate = "2026-06-18";
    console.log(`Buscando dados diários de campanhas na API da Meta de ${startDate} até ${endDate}...`);

    const insightsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?level=campaign&time_increment=1&fields=campaign_id,campaign_name,spend,impressions,clicks,actions&time_range={"since":"${startDate}","until":"${endDate}"}&limit=1000&access_token=${token}`;
    
    const resp = await fetch(insightsUrl);
    if (!resp.ok) {
        console.error(`Erro na requisição da API da Meta: ${resp.status} - ${await resp.text()}`);
        return;
    }

    const json = await resp.json();
    const insights = json.data || [];
    console.log(`Total de registros de insights diários por campanha: ${insights.length}`);

    // Estruturar dados por campanha e dia
    const campaignsDaily: Record<string, Record<string, { spend: number; conversations: number; impressions: number; name: string }>> = {};

    insights.forEach((d: any) => {
        const campId = d.campaign_id;
        const campName = d.campaign_name;
        const date = d.date_start;
        const spend = parseFloat(d.spend || '0');
        const impressions = parseInt(d.impressions || '0', 10);
        
        const actions = d.actions || [];
        const msgStarted = actions.find((a: any) => 
            a.action_type === 'messaging_conversation_started_7d' || 
            a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
            a.action_type.includes('messaging_conversation_started')
        )?.value || 0;

        if (!campaignsDaily[campName]) {
            campaignsDaily[campName] = {};
        }

        campaignsDaily[campName][date] = {
            spend,
            conversations: parseInt(msgStarted, 10),
            impressions,
            name: campName
        };
    });

    console.log("\n--- HISTÓRICO DE GASTO E CONVERSAS POR CAMPANHA ---");
    Object.keys(campaignsDaily).forEach(campName => {
        console.log(`\nCampanha: ${campName}`);
        console.log("--------------------------------------------------------------------------------");
        console.log("| Data       | Gasto (R$)  | Conversas | Custo p/ Res | Impressões |");
        console.log("--------------------------------------------------------------------------------");
        
        const dates = Object.keys(campaignsDaily[campName]).sort();
        dates.forEach(date => {
            const val = campaignsDaily[campName][date];
            const cpr = val.conversations > 0 ? (val.spend / val.conversations).toFixed(2) : "—";
            console.log(
                `| ${date} | ` +
                `R$ ${val.spend.toFixed(2).padStart(9)} | ` +
                `${String(val.conversations).padStart(9)} | ` +
                `R$ ${cpr.padStart(10)} | ` +
                `${String(val.impressions).padStart(10)} |`
            );
        });
        console.log("--------------------------------------------------------------------------------");
    });
}

run().catch(console.error);
