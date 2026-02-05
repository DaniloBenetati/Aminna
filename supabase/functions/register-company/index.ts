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
        const { companyData, environment } = await req.json()

        // Get Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        // Get fiscal configuration (to get token)
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
        const isSandbox = environment === 'homologacao' || environment === 'sandbox'
        const baseUrl = isSandbox
            ? 'https://homologacao.focusnfe.com.br'
            : 'https://api.focusnfe.com.br'

        const apiUrl = `${baseUrl}/v2/empresas`

        console.log(`Calling Focus NFe API: ${apiUrl}`)

        // Call Focus NFe API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(token + ':')}`
            },
            body: JSON.stringify(companyData)
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.log('Focus API error:', errorData)

            // Special handling for "CNPJ already registered"
            // If status is 422 and message contains "já cadastrada", treat as success
            if (response.status === 422 && errorData.mensagem?.includes('já cadastrada')) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        status: 422,
                        message: 'Empresa já cadastrada (Autorizado)'
                    }),
                    {
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    }
                )
            }

            return new Response(
                JSON.stringify({
                    success: false,
                    status: response.status,
                    data: errorData,
                    error: `(Focus URL: ${apiUrl}) ${errorData.mensagem || 'Erro ao cadastrar empresa'}`
                }),
                {
                    status: response.status, // Pass through original status
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Success (200 OK)
        return new Response(
            JSON.stringify({
                success: true,
                status: response.status,
                debugUrl: apiUrl
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error in register-company function:', error)
        return new Response(
            JSON.stringify({
                error: `Erro interno: ${error.message}`
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
