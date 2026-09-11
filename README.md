# AI Tracker

Track API requests, token usage, and costs across multiple AI providers (OpenAI, Anthropic, Google, open-source models).

## Features

- **Token/Cost Summary** - Monthly totals with month-over-month comparison
- **Request History** - Filterable table by provider, model, and date
- **Usage Charts** - Daily token usage and cost-by-provider visualizations
- **Budget Alerts** - Set monthly spending limits and get warnings when you approach them
- **Multi-provider** - OpenAI, Anthropic, Google, and custom open-source models
- **Auth** - Email/password registration + Google OAuth

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env` and fill in the values:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate one: openssl rand -base64 32>"

# Google OAuth (optional - get from https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

> Note: If you leave Google OAuth keys blank, email/password auth still works.

### 3. Set up the database

```bash
npx prisma migrate dev
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Logging API Requests

To record a request from your AI code, POST to the `/api/requests` endpoint (with a valid session cookie):

```json
POST /api/requests
{
  "providerId": "<provider-id>",
  "model": "gpt-4o",
  "promptTokens": 1200,
  "completionTokens": 340,
  "promptPreview": "What is the capital of France?",
  "responsePreview": "Paris"
}
```

Cost is automatically calculated based on the model's published per-token pricing.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID and Secret into `.env`

## Tech Stack

- Next.js 16 (App Router)
- NextAuth.js (Credentials + Google)
- Prisma + SQLite
- Recharts
- Tailwind CSS