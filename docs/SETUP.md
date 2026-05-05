# Local Development Setup

## Prerequisites
- Node.js 18+
- A Supabase account (free tier is fine)
- A Vercel account (free tier)
- Git

## Step 1 — Clone the repo
git clone https://github.com/navxo25/Nexora.git
cd Nexora
npm install

## Step 2 — Set up environment
cp .env.example .env.local
# Open .env.local and fill in:
# SUPABASE_URL — from Supabase project settings
# SUPABASE_ANON_KEY — from Supabase project settings → API
# SUPABASE_SERVICE_ROLE_KEY — same page (keep secret, never commit)
# JWT_SECRET — run: openssl rand -hex 32
# SMTP_EMAIL — your Gmail address
# SMTP_PASSWORD — Gmail App Password (not your real password)

## Step 3 — Run the schema
# In Supabase Dashboard → SQL Editor:
# Paste contents of database/schema.sql → Run
# Paste contents of database/seed.sql → Run (optional, adds test data)

## Step 4 — Start local server
npm run dev
# API available at http://localhost:3000

## Step 5 — Verify it works
curl http://localhost:3000/api/health
# Expected: { "status": "ok" }
