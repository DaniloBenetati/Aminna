# Deploy das Edge Functions - Focus NFe

## Passo a Passo para Deploy

Você precisa fazer o deploy de 3 Edge Functions no Supabase:

1. **issue-nfse** - Para emitir NFSe
2. **upload-certificate** - Para fazer upload do certificado digital
3. **register-company** - Para cadastrar a empresa no Focus NFe

### Método 1: Via Supabase CLI (Recomendado)

1. Abra o terminal na pasta do projeto
2. Execute os comandos:

```bash
# Login no Supabase (se ainda não fez)
npx supabase login

# Link com seu projeto
npx supabase link --project-ref SEU_PROJECT_REF

# Deploy das funções
npx supabase functions deploy issue-nfse
npx supabase functions deploy upload-certificate
npx supabase functions deploy register-company
```

### Método 2: Via Dashboard do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions** no menu lateral
4. Clique em **"New Function"** para cada uma das 3 funções
5. Cole o código de cada arquivo:
   - `supabase/functions/issue-nfse/index.ts`
   - `supabase/functions/upload-certificate/index.ts`
   - `supabase/functions/register-company/index.ts`

### Verificar se está funcionando

Após o deploy, tente novamente:
1. Fazer upload do certificado
2. Autorizar o CNPJ
3. Emitir uma NFSe

## Observações Importantes

- **Homologação**: Em ambiente de homologação, é normal receber erro 404 ao tentar cadastrar a empresa - isso é esperado
- **Certificado**: O upload do certificado pode retornar 404 em homologação, mas se o certificado aparecer como válido no painel da Focus NFe, está tudo certo
- **Token**: Certifique-se de estar usando o token de **homologação** (não o de produção)
