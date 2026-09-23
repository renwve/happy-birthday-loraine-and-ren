# Happy Birthday Loraine & Ren — Next.js Birthday Wall

Converted from the supplied 479-line single-page birthday wall into a Next.js App Router project.

## What changed

- Preserves the original scrapbook-style wall, typography, colors, stickers, masonry cards, upload modal, captions, and removal interaction.
- Adds an attendee picker for Guest 1–7 on first visit.
- Saves the selected attendee in a signed HTTP-only cookie.
- Stores photo metadata in Supabase.
- Uploads the actual image to one configured Google Drive folder through a server-only Next.js route.
- Keeps Google service-account credentials out of the browser.
- Photo list and deletion go through server routes backed by Supabase.

## 1. Install

```bash
npm install
```

## 2. Environment

Copy `.env.example` to `.env.local` and fill in the values.

For Google Drive, create a Google Cloud service account, enable the Drive API, and share the target Drive folder with the service account email. Put that folder ID in `GOOGLE_DRIVE_FOLDER_ID`.

The private key can be copied into `.env.local` with literal `\\n` sequences as shown in the example.

## 3. Supabase

Open the Supabase SQL editor and run `supabase/schema.sql`.

The app uses the Supabase service role only on the server for this private event wall. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## 4. Run

```bash
npm run dev
```

Then open http://localhost:3000.

## Attendees

The picker intentionally contains exactly:

- Guest 1
- Guest 2
- Guest 3
- Guest 4
- Guest 5
- Guest 6
- Guest 7

You can change these names later in `supabase/schema.sql` and the `ATTENDEES` list in `lib/attendees.ts`.

## Google Drive note

This version treats “selected Google Drive” as one Drive folder configured by `GOOGLE_DRIVE_FOLDER_ID`. Every attendee uploads into that same folder.
