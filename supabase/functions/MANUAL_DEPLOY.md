# 🚀 Deploy NFSe Edge Function - Guia Manual

Como a instalação do CLI falhou, vamos fazer o deploy **direto pelo Dashboard** do Supabase!

## 📋 Passo a Passo

### 1. Abra o Dashboard do Supabase
👉 https://supabase.com/dashboard/project/eedazqhgvvelcjurigla

### 2. Navegue até Edge Functions
- Clique em **"Edge Functions"** no menu lateral esquerdo
- Ou acesse direto: https://supabase.com/dashboard/project/eedazqhgvvelcjurigla/functions

### 3. Crie a Function
- Clique no botão **"Create a new function"** ou **"New Edge Function"**
- **Function name:** `issue-nfse` (exatamente assim, sem espaços)

### 4. Cole o Código
- Copie TODO o conteúdo do arquivo: `COPY_TO_DASHBOARD.ts`
- Cole na área de código do editor
- Clique em **"Deploy"** ou **"Create function"**

### 5. Verifique o Deploy
Você verá a function listada como:
- **Name:** issue-nfse
- **Status:** Active ✅
- **URL:** `https://eedazqhgvvelcjurigla.supabase.co/functions/v1/issue-nfse`

## ✅ Pronto!

Depois disso:
1. Volte para o app: http://localhost:3001
2. Abra o atendimento da Camila
3. Clique em **"EMITIR NFSE"**
4. Deve funcionar sem erros de CORS! 🎉

## 🐛 Troubleshooting

**Se der erro "Function not found":**
- Verifique se o nome está exatamente: `issue-nfse`
- Espere 30 segundos e tente novamente (deploy demora um pouco)

**Se der erro "Unauthorized":**
- Verifique se copiou o código completo
- Recarregue a página do app (F5)
