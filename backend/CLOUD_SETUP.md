# Cloud Setup — Supabase + Upstash

This project uses hosted free-tier services in place of local Docker.

## 1. Supabase (PostgreSQL)

1. Go to https://supabase.com and sign up (GitHub login works).
2. Click **New Project**.
   - Name: `kurye-takip` (or whatever)
   - Database password: generate a strong one and save it
   - Region: choose the closest to you
   - Plan: **Free**
3. Wait ~2 minutes for provisioning.
4. In the project dashboard, click **Project Settings** → **Database**.
5. Under **Connection string**, select **URI** mode and copy the value. It looks like:
   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   - Use the **Transaction pooler** URI (port 6543) for application traffic.
   - Use the **Session pooler** or **Direct connection** for migrations (port 5432 direct, or 5432 session pooler).
6. You'll have TWO URLs:
   - `DATABASE_URL` → transaction pooler (port 6543) for app runtime
   - `MIGRATION_DATABASE_URL` → direct connection or session pooler (port 5432) for `node-pg-migrate` (it needs session mode for DDL transactions)

## 2. Upstash (Redis)

1. Go to https://upstash.com and sign up (GitHub login works).
2. Click **Create Database**.
   - Name: `kurye-takip`
   - Region: pick the closest
   - Type: **Regional** (Global is overkill for a portfolio project)
   - Enable **TLS** (default on)
3. Once created, open the database details page.
4. Scroll to the **REST API** and **Redis CLI** sections, then locate the **Redis URL** under "Connect to your database" — copy the value starting with `rediss://`.
   It looks like:
   ```
   rediss://default:<token>@<endpoint>.upstash.io:6379
   ```

## 3. Paste both into `backend/.env`

After Task 3 creates the `.env` file, replace its placeholder values with the two real strings above.

## Security note

Both URLs contain credentials. They are in `.env` (gitignored) — never commit them.
