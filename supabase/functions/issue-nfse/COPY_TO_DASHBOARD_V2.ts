// VERSÃO CORRIGIDA - Copy this entire code and paste in Supabase Dashboard
// Edge Function: issue-nfse (REPLACE EXISTING CODE)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight - CRITICAL!
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        })
    }

    try {
        const { nfseData, environment } = await req.json()

        // Get Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Get fiscal config
        const { data: fiscalConfig, error: configError } = await supabaseClient
            .from('fiscal_config')
            .select('*')
            .single()

        if (configError || !fiscalConfig) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Configuração fiscal não encontrada'
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const token = fiscalConfig.focus_nfe_token
        if (!token) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Token Focus NFe não configurado'
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Determine API URL
        const baseUrl = environment === 'homologacao'
            ? 'https://homologacao.acrasnfe.acras.com.br'
            : 'https://api.focusnfe.com.br'

        const reference = nfseData.reference || `NFSE-${Date.now()}`
        const apiUrl = `${baseUrl}/v2/nfse?ref=${reference}`

        console.log('Calling Focus NFe API:', apiUrl)

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

        console.log('Focus NFe response:', response.status, data)

        return new Response(
            JSON.stringify({
                success: response.ok,
                status: response.status,
                data: data,
                reference: reference
            }),
            {
                status: 200, // Always return 200 to avoid CORS issues
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error in issue-nfse:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Erro ao emitir NFSe'
            }),
            {
                status: 200, // Return 200 even on error to avoid CORS issues
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
