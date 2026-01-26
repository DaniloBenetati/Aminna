# Deployment Guide - Vercel

Follow these steps to deploy the **Aminna Gestão Inteligente** project to Vercel.

## 1. Environment Variables

You MUST configure the following environment variables in the Vercel Dashboard (**Project Settings -> Environment Variables**):

| Variable | Description | Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL | `https://eedazqhgvvelcjurigla.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon/Publishable Key | `sb_publishable_s...` |
| `GEMINI_API_KEY` | Your Google Gemini API Key | *(Your Key)* |

## 2. Deployment Steps

1.  **Push to GitHub**: Ensure your code is in a GitHub repository.
2.  **Import to Vercel**:
    *   Log in to [vercel.com](https://vercel.com).
    *   Click **"New Project"**.
    *   Import your repository.
3.  **Configure Project**:
    *   **Root Directory**: Set this to `Aminna` if the project is nested, or leave as default if it's in the root.
    *   **Framework Preset**: Select **Vite**.
    *   **Environment Variables**: Add the variables listed above.
4.  **Deploy**: Click **"Deploy"**.

## 3. Post-Deployment

*   Add the production URL to your **Supabase Redirect URLs** (in Authentication -> Settings) if you plan to use social login or password resets in the future.
