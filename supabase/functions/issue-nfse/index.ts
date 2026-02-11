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

        // action: 'issue' (default), 'get', 'cancel'
        const { nfseData, environment, action = 'issue' } = body;

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

        // Determine reference
        const reference = nfseData.reference;
        if (!reference && action !== 'issue') {
            throw new Error('Referência é obrigatória para consultar ou cancelar.');
        }

        // NFSe Nacional Endpoint (nfsen)
        const endpointType = 'nfsen';

        let apiUrl;
        let method;
        let requestBody;

        if (action === 'get') {
            // GET /v2/nfsen/{ref}
            // Note: For Nacional, documentation typically says GET /v2/nfsen/{ref}
            // For standard, GET /v2/nfse/{ref}
            apiUrl = `${baseUrl}/v2/${endpointType}/${reference}`;
            method = 'GET';
        } else if (action === 'cancel') {
            // DELETE /v2/nfsen/{ref}
            apiUrl = `${baseUrl}/v2/${endpointType}/${reference}`;
            method = 'DELETE';
            requestBody = JSON.stringify(nfseData.payload); // expects { justificativa: ... }
        } else {
            // POST /v2/nfsen?ref=...
            const refToUse = reference || `NFSE-${Date.now()}`;
            apiUrl = `${baseUrl}/v2/${endpointType}?ref=${refToUse}`;
            method = 'POST';
            requestBody = JSON.stringify(nfseData.payload);
        }

        console.log(`[Focus NFe Proxy] ${method} ${apiUrl} (Env: ${environment})`)

        const response = await fetch(apiUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(token + ':')}`
            },
            body: requestBody
        })

        const text = await response.text()
        console.log(`Focus NFe response status: ${response.status}`)

        let data
        try {
            data = JSON.parse(text)
        } catch (e) {
            // If it IS ok but not JSON, we wrap it
            data = { mensagem: text };
        }

        return new Response(JSON.stringify({
            success: response.ok,
            status: response.status,
            data,
            error: response.ok ? null : (data.mensagem || JSON.stringify(data) || `Erro na API (${response.status})`)
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
