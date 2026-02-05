# Deploying NFSe Edge Function to Supabase

Follow these steps to deploy the Edge Function that handles NFSe issuance.

## Prerequisites

1. **Install Supabase CLI:**
   ```powershell
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```powershell
   supabase login
   ```
   This will open a browser window for authentication.

## Deployment Steps

### Step 1: Link your Supabase project

```powershell
cd "c:\Users\Danilo Souza\Documents\gestão-inteligente aminna\gestão-inteligente---aminna\Aminna"
supabase link --project-ref eedazqhgvvelcjurigla
```

### Step 2: Deploy the Edge Function

```powershell
supabase functions deploy issue-nfse
```

This will:
- Upload the `supabase/functions/issue-nfse/index.ts` file
- Make it available at: `https://eedazqhgvvelcjurigla.supabase.co/functions/v1/issue-nfse`

### Step 3: Verify Deployment

Check if the function is deployed:
```powershell
supabase functions list
```

You should see `issue-nfse` in the list.

## Testing

After deployment, test the integration:

1. Open the app: http://localhost:3001
2. Go to a completed appointment (like Camila's)
3. Click **"EMITIR NFSE"**
4. The function should now work without CORS errors!

## Troubleshooting

If you get errors:

- **"function not found"**: Redeploy with `supabase functions deploy issue-nfse --no-verify-jwt`
- **"unauthorized"**: Check your Supabase project ref is correct
- **"timeout"**: The Focus NFe API might be slow, increase timeout in Edge Function

## Environment Variables

The Edge Function automatically reads:
- `SUPABASE_URL` - Injected by Supabase
- `SUPABASE_ANON_KEY` - Injected by Supabase

No additional configuration needed!
