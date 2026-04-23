# NEXORA

Citizen complaint management platform backend built with Node.js, Supabase, and Vercel.

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (for production)

### Local Setup

1. Clone the repo:
\`\`\`bash
git clone https://github.com/yourusername/nexora-backend.git
cd nexora-backend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create \`.env.local\` from \`.env.example\`:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Add your Supabase credentials to \`.env.local\`

5. Run local development server:
\`\`\`bash
npm run dev
\`\`\`

The API will be available at \`http://localhost:3000\`

## API Documentation

See [docs/API.md](docs/API.md) for complete endpoint documentation.

## Database

Schema and migrations are in [database/](database/) directory.

To view database structure, go to Supabase Dashboard → Table Editor.

## Testing

Run tests locally:
\`\`\`bash
npm run test
\`\`\`

Watch mode:
\`\`\`bash
npm run test:watch
\`\`\`

## Linting & Formatting

Check code quality:
\`\`\`bash
npm run lint
\`\`\`

Auto-format code:
\`\`\`bash
npm run format
\`\`\`

## Deployment

Push to \`main\` branch to auto-deploy to Vercel:
\`\`\`bash
git push origin main
\`\`\`

Production URL: \`https://nexora-backend.vercel.app\`

## Folder Structure

\`\`\`
api/                    # API endpoints (Vercel serverless functions)
├── health.js           # Health check endpoint
├── auth/               # Authentication endpoints
├── complaints/         # Complaint CRUD endpoints
├── admin/              # Admin endpoints
└── middleware/         # Middleware (auth, error handling)

lib/                    # Shared utilities
├── supabase.js         # Supabase client setup
├── email.js            # Email sending
├── jwt.js              # JWT helpers
├── validation.js       # Input validation
└── geoUtils.js         # Geolocation helpers

database/               # Database schemas & migrations
├── schema.sql          # Initial schema
├── seed.sql            # Sample data
└── migrations/         # Alembic migrations

tests/                  # Test files
├── auth.test.js
├── complaints.test.js
└── fixtures/           # Test data

docs/                   # Documentation
├── API.md              # API documentation
├── DATABASE.md         # Database schema docs
├── SETUP.md            # Setup guide
└── DEPLOYMENT.md       # Deployment guide
\`\`\`

## Environment Variables

See \`.env.example\` for complete list.

**Critical variables:**
- \`SUPABASE_URL\` - Your Supabase project URL
- \`SUPABASE_SERVICE_ROLE_KEY\` - Admin access key (server-only)
- \`JWT_SECRET\` - Secret for signing JWTs

## Contributing

1. Create feature branch: \`git checkout -b feature/your-feature\`
2. Commit changes: \`git commit -m 'Add feature'\`
3. Push to branch: \`git push origin feature/your-feature\`
4. Create Pull Request

## Status

- ✅ Week 1: Database schema + health endpoint
- 🔄 Week 2: Auth + CRUD endpoints
- ⏳ Week 3-10: Full features

## Support

For issues, check [docs/](docs/) or create a GitHub issue.
