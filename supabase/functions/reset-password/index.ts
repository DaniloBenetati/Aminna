import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { userId, newPassword } = await req.json()

        if (!userId || !newPassword) {
            throw new Error("Missing userId or newPassword")
        }

        // Initialize Supabase admin client with Service Role Key to bypass RLS and use Admin API
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Validate the request is coming from an authenticated admin user
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            throw new Error("Unauthorized to perform this action")
        }

        // Verify the user making the request is an admin (optional step, relying on RLS/roles)
        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
            throw new Error("Only admins can reset passwords")
        }

        // Update the target user's password
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        )

        if (updateError) {
            throw updateError;
        }

        return new Response(JSON.stringify({ success: true, message: "Password updated successfully" }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (e: any) {
        console.error('Error in reset-password:', e.message)
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
