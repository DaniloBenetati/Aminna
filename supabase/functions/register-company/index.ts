import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { companyData, environment } = await req.json()
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
        const apiUrl = `${baseUrl}/v2/empresas`

        console.log(`Calling Focus NFe API: ${apiUrl} (Env: ${environment})`)

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(token + ':')}` },
            body: JSON.stringify(companyData)
        })

        const text = await response.text()
        let data
        try {
            data = JSON.parse(text)
        } catch (e) {
            throw new Error(`Resposta inválida da Focus NFe (não é JSON). Status: ${response.status}. Corpo: ${text.substring(0, 100)}`)
        }

        if (!response.ok) {
            if (response.status === 422 && data.mensagem?.includes('já cadastrada')) {
                return new Response(JSON.stringify({ success: true, message: 'Empresa já cadastrada' }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
            throw new Error(data.mensagem || `Erro na API Focus (Status ${response.status})`)
        }

        return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (e) {
        console.error('Error in register-company:', e)
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
