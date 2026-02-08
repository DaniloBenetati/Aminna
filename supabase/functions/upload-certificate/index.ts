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
        const { certificateBase64, password, environment } = await req.json()

        // Get Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        // Get fiscal configuration (to get token and CNPJ)
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
        const cnpj = fiscalConfig.cnpj.replace(/\D/g, '')

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

        // Endpoint to update company certificate
        const apiUrl = `${baseUrl}/v2/empresas/${cnpj}/certificado`

        console.log(`Calling Focus NFe API to upload certificate for CNPJ: ${cnpj}`)

        // Call Focus NFe API
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(token + ':')}`
            },
            body: JSON.stringify({
                arquivo: certificateBase64,
                senha: password
            })
        })

        const resultData = await response.json()

        if (!response.ok) {
            console.error('Focus API error:', resultData)
            return new Response(
                JSON.stringify({
                    success: false,
                    status: response.status,
                    data: resultData,
                    error: resultData.mensagem || 'Erro ao enviar certificado'
                }),
                {
                    status: response.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Update database with expiration date if returned
        if (resultData.vencimento) {
            await supabaseClient
                .from('fiscal_config')
                .update({ certificate_expires_at: resultData.vencimento })
                .eq('id', fiscalConfig.id)
        }

        // Success (200 OK)
        return new Response(
            JSON.stringify({
                success: true,
                status: response.status,
                data: resultData
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error in upload-certificate function:', error)
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
