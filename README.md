# Abro (Debal)

Abro is the repository for **Debal**, a verified Ethiopian housing and roommate marketplace. The application runs on Cloudflare through vinext and uses ChatGPT-hosted authentication, D1 for relational data, and R2 for private and public media.

## Current product slice

- Responsive discovery homepage and searchable Ethiopian property marketplace
- Owner listing management with R2 photo uploads
- Profiles, saved listings, and explained roommate compatibility scores
- Private messaging, viewing requests, rental applications, and rental offers
- In-app notifications, blocking, reporting, and moderator queues
- Private identity and property verification documents
- Ethiopian phone verification through AfroMessage
- Safety-first guidance throughout renter and owner workflows

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The local runtime expects the `DB` D1 binding and `MEDIA` R2 binding configured in `.openai/hosting.json`. Phone verification additionally requires these runtime secrets:

```text
AFROMESSAGE_API_TOKEN
AFROMESSAGE_SENDER
AFROMESSAGE_IDENTIFIER_ID  # optional
```

## Quality checks

```bash
npm run lint
npx tsc --noEmit --incremental false
npm test
```

Database changes live in `db/schema.ts` and must be accompanied by an ordered SQL migration in `drizzle/`.

## MVP roadmap

1. Add integration tests for authenticated APIs and database state transitions.
2. Add pagination to listings, conversations, applications, and moderation queues.
3. Personalize homepage inventory using saved searches and profile preferences.
4. Add reviews, audit logs, and administrator provisioning tools.
5. Add observability, abuse monitoring, and production rate-limit controls.

## Safety principle

Abro must never expose identity-document details publicly or encourage payment before the person and property have been verified and viewed.
