import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {

        let body;
        try {
            const text = await req.text();
            if (!text) throw new Error("Empty body");
            body = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse request body:", e);
            throw new Error(`Invalid JSON body: ${e.message}`);
        }

        const { nfseData, environment } = body;

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        const { data: fiscalConfig, error: configError } = await supabaseClient.from('fiscal_config').select('*').single()

        if (configError) {
            console.error('Error fetching fiscal_config:', configError);
            throw new Error(`Erro ao buscar configuração fiscal: ${configError.message}`);
        }
        if (!fiscalConfig) throw new Error('Configuração fiscal não encontrada na tabela fiscal_config')

        const token = fiscalConfig.focus_nfe_token
        if (!token) throw new Error('Token Focus NFe não configurado na tabela fiscal_config')

        const isSandbox = environment === 'homologacao' || environment === 'sandbox'
        const baseUrl = isSandbox ? 'https://homologacao.focusnfe.com.br' : 'https://api.focusnfe.com.br'

        const reference = nfseData.reference || `NFSE-${Date.now()}`
        const apiUrl = `${baseUrl}/v2/nfsen?ref=${reference}` // NFSe Nacional endpoint

        console.log(`Calling Focus NFe API for NFSe issuance: ${apiUrl} (Env: ${environment})`)
        console.log(`Request payload:`, JSON.stringify(nfseData.payload, null, 2))

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(token + ':')}` },
            body: JSON.stringify(nfseData.payload)
        })

        const text = await response.text()
        console.log(`Focus NFe response status: ${response.status}`)
        console.log(`Focus NFe response body: ${text}`)

        let data
        try {
            data = JSON.parse(text)
        } catch (e) {
            console.error(`Failed to parse Focus NFe response: ${text.substring(0, 200)}`);
            // Even if it's not JSON, we return the text as error if status is bad
            if (!response.ok) {
                throw new Error(`Erro na API Focus NFe (Status ${response.status}): ${text.substring(0, 500)}`);
            }
            // If it IS ok but not JSON, that's unexpected for Focus NFe, but let's handle it
            data = { mensagem: text };
        }

        return new Response(JSON.stringify({
            success: response.ok,
            status: response.status,
            data,
            reference,
            error: response.ok ? null : (data.mensagem || JSON.stringify(data) || `Erro ao emitir NFSe (Status ${response.status})`)
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (e) {
        console.error('Error in issue-nfse:', e.message)
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
