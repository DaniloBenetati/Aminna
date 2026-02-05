# Supabase Edge Functions

Edge functions to handle server-side operations that cannot be performed from the browser due to CORS restrictions.

## Functions

### issue-nfse
Handles NFSe (Nota Fiscal de Serviços Eletrônica) issuance via Focus NFe API.

**Endpoint:** `https://[project-ref].supabase.co/functions/v1/issue-nfse`

**Method:** POST

**Body:**
```json
{
  "nfseData": {
    "reference": "APPT-123-1234567890",
    "payload": {
      "data_emissao": "2026-02-04",
      "natureza_operacao": "1",
      "prestador": { ... },
      "tomador": { ... },
      "servico": { ... },
      "intermediario": { ... }
    }
  },
  "environment": "homologacao" // or "production"
}
```

## Deployment

To deploy edge functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref [your-project-ref]

# Deploy function
supabase functions deploy issue-nfse
```

## Local Testing

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve issue-nfse --env-file supabase/.env.local
```
