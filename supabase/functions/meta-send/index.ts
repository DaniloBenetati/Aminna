import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const body = await req.json()
        const { to, message, conversation_id } = body

        // 1. Get Meta Config from DB
        const { data: config, error: configError } = await supabaseClient
            .from('crm_config')
            .select('*')
            .maybeSingle()
        
        if (configError || !config?.meta_access_token) {
            throw new Error('Configuração do Meta não encontrada ou incompleta.')
        }

        const accessToken = config.meta_access_token
        const phoneNumberId = config.meta_phone_number_id || 'YOUR_PHONE_NUMBER_ID' // User will need to set this

        // 2. Call Meta Graph API
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: { body: message }
            })
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(`Erro API Meta: ${JSON.stringify(data)}`)
        }

        // 3. Log sent message in DB
        if (conversation_id) {
            await supabaseClient.from('crm_messages').insert({
                conversation_id,
                meta_message_id: data.messages[0].id,
                sender_type: 'attendant',
                content: message,
                status: 'sent'
            })
        }

        return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 200, // Return 200 to handle app-side error gracefully
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
