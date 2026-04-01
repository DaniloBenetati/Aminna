import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Handle Verification (GET)
    if (req.method === 'GET') {
        const url = new URL(req.url)
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        // You should set META_VERIFY_TOKEN in your Supabase Secrets
        const verifyToken = Deno.env.get('META_VERIFY_TOKEN') || 'aminna_crm_token'

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('WEBHOOK_VERIFIED')
            return new Response(challenge, { status: 200 })
        }
        return new Response('Forbidden', { status: 403 })
    }

    // 3. Handle Webhook (POST)
    if (req.method === 'POST') {
        try {
            const body = await req.json()
            
            // Log payload for debugging (optional - can be heavy)
            await supabaseClient.from('crm_webhook_logs').insert({ payload: body })

            // Basic check for WhatsApp payload structure
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        const value = change.value
                        if (value.messages) {
                            for (const message of value.messages) {
                                const from = message.from // Phone number
                                const messageId = message.id
                                const timestamp = message.timestamp
                                const text = message.text?.body || ''
                                const platform = 'whatsapp'

                                // a. Identify / Create Customer
                                let { data: customer } = await supabaseClient
                                    .from('customers')
                                    .select('id, name')
                                    .eq('phone', from)
                                    .maybeSingle()

                                if (!customer) {
                                    // Extract name if available in contacts
                                    const contact = value.contacts?.find((c: any) => c.wa_id === from)
                                    const name = contact?.profile?.name || `Novo Cliente ${from}`
                                    
                                    const { data: newCustomer, error: createError } = await supabaseClient
                                        .from('customers')
                                        .insert({
                                            name,
                                            phone: from,
                                            status: 'Novo',
                                            registration_date: new Date().toISOString()
                                        })
                                        .select()
                                        .single()
                                    
                                    if (createError) throw createError
                                    customer = newCustomer
                                }

                                // b. Find or Create Conversation
                                let { data: conversation } = await supabaseClient
                                    .from('crm_conversations')
                                    .select('id')
                                    .eq('customer_id', customer.id)
                                    .eq('platform', platform)
                                    .maybeSingle()

                                if (!conversation) {
                                    const { data: newConv, error: convError } = await supabaseClient
                                        .from('crm_conversations')
                                        .insert({
                                            customer_id: customer.id,
                                            platform,
                                            last_message_preview: text.substring(0, 100),
                                            unread_count: 1
                                        })
                                        .select()
                                        .single()
                                    
                                    if (convError) throw convError
                                    conversation = newConv
                                } else {
                                    // Update existing conversation
                                    await supabaseClient
                                        .from('crm_conversations')
                                        .update({
                                            last_message_preview: text.substring(0, 100),
                                            unread_count: 1, // increment logic would be better but this is simple star
                                            updated_at: new Date().toISOString()
                                        })
                                        .eq('id', conversation.id)
                                }

                                // c. Save Message
                                await supabaseClient.from('crm_messages').insert({
                                    conversation_id: conversation.id,
                                    meta_message_id: messageId,
                                    sender_type: 'customer',
                                    sender_id: customer.id,
                                    content: text,
                                    created_at: new Date(parseInt(timestamp) * 1000).toISOString()
                                })

                                // d. Simple Automation Example: Intent Classification
                                const lowerText = text.toLowerCase()
                                if (lowerText.includes('preço') || lowerText.includes('valor') || lowerText.includes('comprar') || lowerText.includes('agendar')) {
                                    // Mark as Lead Quente
                                    await supabaseClient.from('crm_conversations').update({
                                        metadata: { intent: 'purchase_intent', lead_temp: 'quente' }
                                    }).eq('id', conversation.id)
                                }
                            }
                        }
                    }
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        } catch (e) {
            console.error('Error in meta-webhook:', e.message)
            return new Response(JSON.stringify({ success: false, error: e.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
    }

    return new Response('Method not allowed', { status: 405 })
})
