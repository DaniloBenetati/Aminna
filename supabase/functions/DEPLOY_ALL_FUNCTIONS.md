# 🚀 Guia de Implantação Total - Focus NFe

Como identificamos erros de "Endpoint não encontrado" e "Failed to fetch", precisamos garantir que **todas as 3 funções** estejam publicadas no seu Supabase.

## 📋 Passo a Passo Único

1. Acesse seu Dashboard do Supabase:
   👉 [https://supabase.com/dashboard/project/eedazqhgvvelcjurigla/functions](https://supabase.com/dashboard/project/eedazqhgvvelcjurigla/functions)

2. Verifique se estas **3 funções** aparecem na lista. Se não aparecerem, crie-as:
   - `issue-nfse`
   - `register-company`
   - `upload-certificate`

3. Para cada uma, clique em **"Create a new function"**, dê o nome acima e cole o código correspondente abaixo:

---

### 1️⃣ Função: `issue-nfse`
(Esta gera a nota fiscal)

````typescript
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
        const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')
        const { data: fiscalConfig } = await supabaseClient.from('fiscal_config').select('*').single()
        const token = fiscalConfig?.focus_nfe_token
        if (!token) throw new Error('Token não configurado')
        
        const isSandbox = environment === 'homologacao' || environment === 'sandbox'
        const baseUrl = isSandbox ? 'https://homologacao.focusnfe.com.br' : 'https://api.focusnfe.com.br'
        
        const reference = nfseData.reference || `NFSE-${Date.now()}`
        const apiUrl = `${baseUrl}/v2/nfse?ref=${reference}`

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(token + ':')}` },
            body: JSON.stringify(nfseData.payload)
        })

        const data = await response.json()
        return new Response(JSON.stringify({ success: response.ok, status: response.status, data, reference }), 
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
````

---

### 2️⃣ Função: `register-company`
(Esta autoriza seu CNPJ na Focus)

````typescript
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
        const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')
        const { data: fiscalConfig } = await supabaseClient.from('fiscal_config').select('*').single()
        const token = fiscalConfig?.focus_nfe_token
        if (!token) throw new Error('Token não configurado')

        const isSandbox = environment === 'homologacao' || environment === 'sandbox'
        const baseUrl = isSandbox ? 'https://homologacao.focusnfe.com.br' : 'https://api.focusnfe.com.br'
        const apiUrl = `${baseUrl}/v2/empresas`

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(token + ':')}` },
            body: JSON.stringify(companyData)
        })

        const errorData = !response.ok ? await response.json() : null
        if (errorData && response.status === 422 && errorData.mensagem?.includes('já cadastrada')) {
            return new Response(JSON.stringify({ success: true, message: 'Empresa já cadastrada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const data = response.ok ? await response.json() : errorData
        return new Response(JSON.stringify({ success: response.ok, data, error: !response.ok ? `(Focus URL: ${apiUrl}) ${data.mensagem}` : null }), 
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
````

---

### 3️⃣ Função: `upload-certificate`
(Esta envia seu arquivo .pfx/Certificado)

````typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    try {
        const { certificateBase64, password, environment } = await req.json()
        const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')
        const { data: fiscalConfig } = await supabaseClient.from('fiscal_config').select('*').single()
        const token = fiscalConfig?.focus_nfe_token
        const cnpj = fiscalConfig?.cnpj.replace(/\D/g, '')

        const isSandbox = environment === 'homologacao' || environment === 'sandbox'
        const baseUrl = isSandbox ? 'https://homologacao.focusnfe.com.br' : 'https://api.focusnfe.com.br'
        const apiUrl = `${baseUrl}/v2/empresas/${cnpj}/certificado`

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(token + ':')}` },
            body: JSON.stringify({ arquivo: certificateBase64, senha: password })
        })

        const resultData = await response.json()
        if (response.ok && resultData.vencimento) {
            await supabaseClient.from('fiscal_config').update({ certificate_expires_at: resultData.vencimento }).eq('id', fiscalConfig.id)
        }

        return new Response(JSON.stringify({ success: response.ok, data: resultData }), 
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
````

---

### 4️⃣ Função: `reset-password`
(Esta gera uma nova senha provisória para um usuário, a partir do painel de Controle de Acesso)

````typescript
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

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
        
        if (authError || !user) {
            throw new Error("Unauthorized to perform this action")
        }

        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
             throw new Error("Only admins can reset passwords")
        }

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
````

---

## ✅ Após o Deploy
1. Atualize a página do seu app.
2. Tente enviar o certificado novamente ou teste o envio de senha provisória.
3. Se o erro de "Empresa ainda não habilitada" persistir, verifique no painel da Focus se o ambiente de homologação exige autorização manual (geralmente exige).
