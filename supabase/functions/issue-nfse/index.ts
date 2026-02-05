import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get request body
        const { nfseData, environment } = await req.json()

        // Get Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        // Get fiscal configuration from database
        const { data: fiscalConfig, error: configError } = await supabaseClient
            .from('fiscal_config')
            .select('*')
            .single()

        if (configError || !fiscalConfig) {
            return new Response(
                JSON.stringify({ error: 'Configuração fiscal não encontrada' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const token = fiscalConfig.focus_nfe_token
        if (!token) {
            return new Response(
                JSON.stringify({ error: 'Token Focus NFe não configurado' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Determine API URL based on environment
        const baseUrl = environment === 'homologacao'
            ? 'https://homologacao.acrasnfe.acras.com.br'
            : 'https://api.focusnfe.com.br'

        // Generate unique reference
        const reference = nfseData.reference || `NFSE-${Date.now()}`
        const apiUrl = `${baseUrl}/v2/nfse?ref=${reference}`

        // Call Focus NFe API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(token + ':')}`
            },
            body: JSON.stringify(nfseData.payload)
        })

        const data = await response.json()

        // Return response
        return new Response(
            JSON.stringify({
                success: response.ok,
                status: response.status,
                data: data,
                reference: reference
            }),
            {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error in issue-nfse function:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Erro ao emitir NFSe'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
