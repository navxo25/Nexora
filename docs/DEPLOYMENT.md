# Deploying Nexora to Production

## Automatic Deploy (recommended)
Push any commit to the main branch:
git push origin main
# Vercel auto-builds and deploys. Takes ~1 minute.
# Production URL: https://nexora-kohl-rho.vercel.app

## Required Environment Variables in Vercel
# Go to: Vercel Dashboard → Project → Settings → Environment Variables
# Add each of these:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
JWT_SECRET
SMTP_EMAIL
SMTP_PASSWORD
CORS_ORIGIN=https://nexora-kohl-rho.vercel.app
CRON_SECRET
SENTRY_DSN

## Verifying a Deploy
curl https://nexora-kohl-rho.vercel.app/api/health
# Should return: { "status": "ok", "environment": "production" }

## Rolling Back
# In Vercel Dashboard → Deployments → click any past deploy → Promote to Production
