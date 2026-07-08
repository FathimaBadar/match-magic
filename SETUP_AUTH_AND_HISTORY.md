# Auth + History Setup Guide

This app now supports Google sign-in, email/password sign-in, and automatically saves every reconciliation run (both input files, the output report, the config used, and a result summary) to a database so users can browse their history later. This requires a Supabase project.

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project (or use an existing one).
2. Wait for provisioning to finish, then go to **Project Settings -> API**.
3. Copy the **Project URL** and the **anon public** key.

## 2. Configure environment variables

In `match-magic/`, copy `.env.example` to `.env` and fill in the values from step 1:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Restart `npm run dev` after adding/changing this file.

## 3. Run the database migration

1. In the Supabase dashboard, open **SQL Editor -> New query**.
2. Paste the contents of `match-magic/supabase/migrations/0001_init.sql` and click **Run**.

This creates:
- `profiles` table (auto-populated for every new user, email/password or Google)
- `reconciliation_history` table (one row per reconciliation run: file names, storage paths, config JSON, result summary JSON, timestamp)
- a private `reconciliation-files` storage bucket, with row-level security so each user can only read/write their own files (scoped by a `<user_id>/...` path prefix)

## 4. Enable email/password auth

In the dashboard: **Authentication -> Providers -> Email** should already be enabled by default. Decide whether you want "Confirm email" on or off (Authentication -> Providers -> Email -> Confirm email). If it's on, new users must click a confirmation link before they can sign in.

## 5. Enable Google sign-in

This part requires a Google Cloud OAuth client and can't be automated — it's a one-time manual setup:

1. Go to https://console.cloud.google.com/apis/credentials (create a project if you don't have one).
2. **Create Credentials -> OAuth client ID -> Web application**.
3. Under **Authorized redirect URIs**, add the callback URL shown in Supabase at **Authentication -> Providers -> Google** (looks like `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`).
4. Copy the generated **Client ID** and **Client Secret**.
5. Back in Supabase: **Authentication -> Providers -> Google**, toggle it on, paste the Client ID/Secret, and save.

## 6. Install the new dependency and run

```
cd match-magic
npm install
npm run dev
```

`@supabase/supabase-js` was added to `package.json` — running `npm install` pulls it in.

## What changed in the code

- `src/lib/supabase.ts` — Supabase client, reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `src/contexts/AuthContext.tsx` — auth state + `signInWithPassword`, `signUpWithPassword`, `signInWithGoogle`, `signOut`.
- `src/pages/Auth.tsx` — combined sign-in/sign-up page with a "Continue with Google" button.
- `src/components/ProtectedRoute.tsx` — redirects to `/auth` if not signed in.
- `src/pages/History.tsx` + `/history` route — lists past reconciliations with match stats, a detail view (config, mappings, sort settings), and download buttons for the stored source/target/output Excel files.
- `src/utils/historyService.ts` — uploads files to Supabase Storage and writes the `reconciliation_history` row after each run.
- `src/utils/exportUtils.ts` — the Excel report-building logic, extracted out of `ReconciliationResults.tsx` so the download button and the auto-saved history file are generated from the same code.
- `src/pages/Index.tsx` — after a reconciliation finishes, it now calls `saveReconciliationHistory` automatically and shows a toast confirming the save.
- `supabase/migrations/0001_init.sql` — the schema described above.

## Note on the "give this to a client" question

Nothing in this setup ties the Supabase project to your personal account permanently — whoever owns the Supabase project (you or your client) controls billing. For a client-facing deployment with real customers, plan to move off the free tier (500MB DB / 50k monthly auth users) to the Pro plan, and keep the RLS policies in the migration as-is — they already scope each user to only their own data, which is what you want in a multi-tenant setup.
