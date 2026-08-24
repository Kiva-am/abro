# Abro

Abro is a verified Ethiopian housing and roommate marketplace. This repository starts the MVP with a public discovery experience and the data foundation for profiles, listings, trust signals, favorites, and compatibility matching.

## Current product slice

- Responsive public homepage
- Ethiopian city and housing search controls
- Listing, verification, and compatibility concepts
- Safety-first guidance
- D1 schema for users, profiles, preferences, locations, listings, photos, and favorites
- R2 media binding for profile and listing images

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## MVP roadmap

1. Foundation: seed Ethiopian locations, connect authenticated profiles, and implement phone-verification provider integration.
2. Marketplace: listing creation, media upload, search/filter results, listing details, and favorites.
3. Matching: lifestyle questionnaire, preference scoring, and explained compatibility results.
4. Communication: messaging, notifications, blocking, and reporting.
5. Trust and safety: identity/property review queues, moderation, reviews, and admin tools.

## Safety principle

Abro must never expose identity-document details publicly or encourage payment before the person and property have been verified and viewed.
