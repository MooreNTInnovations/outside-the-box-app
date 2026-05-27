# OutSide the Box

Where Bold Thinkers Build the Future.

OutSide the Box is a production-only professional collaboration platform for scientists, engineers, doctors, inventors, researchers, entrepreneurs, and other serious professionals. It is designed as a secure innovation workspace for cross-disciplinary collaboration, project incubation, controlled discussion rooms, professional profiles, shared file metadata, and future research workflows.

## Architecture

- React + Vite frontend
- Supabase Auth for account creation, sign-in, session refresh, and sign-out
- Supabase Postgres for profiles, system rooms, messages, projects, files, reports, and admin actions
- Supabase Storage-ready file metadata through the `files` table and `VITE_SUPABASE_FILES_BUCKET`
- Row Level Security enabled on all application tables

There is no demo mode, demo provider, seeded fake activity, mock database, or localStorage-backed application database.

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SUPABASE_FILES_BUCKET=collaboration-files
VITE_AUTH_REDIRECT_URL=http://localhost:5173
```

Only the public Supabase anon key belongs in the frontend. Do not add service-role keys, database passwords, private tokens, or other secrets to Vite environment variables.

## Local Development

```bash
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, the app displays a setup error and does not show the signed-out auth flow or authenticated workspace.

## Supabase Setup

1. Create a Supabase project.
2. In Supabase Auth settings, add `http://localhost:5173` to allowed redirect URLs for local development.
3. Create a storage bucket named `collaboration-files`, or set `VITE_SUPABASE_FILES_BUCKET` to the bucket you want to use.
4. Apply the database migration in `supabase/migrations/initial_schema.sql`.

## Migration

Apply the migration with the Supabase CLI:

```bash
supabase db push
```

Or paste the contents of `supabase/migrations/initial_schema.sql` into the Supabase SQL editor and run it once for the target project.

The migration creates only the required system rooms:

- Collaboration Chat
- Ideas Chat
- General Chat

It does not create sample users, messages, projects, files, reports, profiles, notifications, or statistics.

## Vercel Deployment

1. Import the repository into Vercel.
2. Set these environment variables in the Vercel project:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_FILES_BUCKET`
   - `VITE_AUTH_REDIRECT_URL`
3. Set `VITE_AUTH_REDIRECT_URL` to the deployed Vercel URL.
4. Add the same deployed URL to Supabase Auth redirect URLs.
5. Deploy with the default Vite build command:

```bash
npm run build
```

## Security Notes

- Workspace navigation and authenticated pages are gated behind a live Supabase session.
- Signed-out users see only the brand, tagline, professional description, secure access notice, and auth forms.
- Row Level Security is enabled on all application tables.
- Profile role escalation is blocked by a database trigger.
- Admin actions and reports are restricted to moderator/admin role checks.
- The frontend contains no service-role key, database password, or private token.

## Auth Test

1. Configure `.env.local`.
2. Run the migration.
3. Start the app with `npm run dev`.
4. Create an account from the launch page.
5. Confirm the email if your Supabase Auth settings require confirmation.
6. Sign in with the created account.
7. Verify the workspace shell appears and every page displays: `No live records found yet. Add records in Supabase or create new content.`
