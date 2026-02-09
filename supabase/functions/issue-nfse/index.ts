import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { nfseData, environment } = await req.json()
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        const { data: fiscalConfig } = await supabaseClient.from('fiscal_config').select('*').single()
        if (!fiscalConfig) throw new Error('Configuração fiscal não encontrada')

        const token = fiscalConfig.focus_nfe_token
        if (!token) throw new Error('Token Focus NFe não configurado')

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
            throw new Error(`Resposta inválida da Focus NFe (não é JSON). Status: ${response.status}. Corpo: ${text.substring(0, 200)}`)
        }

        return new Response(JSON.stringify({
            success: response.ok,
            status: response.status,
            data,
            reference,
            error: response.ok ? null : (data.mensagem || `Erro ao emitir NFSe (Status ${response.status})`)
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
