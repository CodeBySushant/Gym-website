# Deployment Guide — Supermen Fitness Gym

**Architecture:** MongoDB Atlas (database) → Hostinger Business (Node backend) → Netlify (React frontend)

Netlify proxies `/api/*` and `/uploads/*` through to Hostinger, so the browser only ever sees one origin. No code changes, no CORS setup.

```
        visitor
           │
           ▼
  Netlify (supermenfitness.com)
    ├── serves dist/ (React)
    └── proxies /api/* and /uploads/*
                   │
                   ▼
     Hostinger (api.supermenfitness.com)
        Node + Express
        └── uploads/ and private-uploads/ on disk
                   │
                   ▼
          MongoDB Atlas (Mumbai)
```

---

## 1. MongoDB Atlas

1. Sign up at mongodb.com/cloud/atlas → **Create** → **M0 free tier**.
2. Provider AWS, region **Mumbai (ap-south-1)** — closest to Bhopal, lowest latency.
3. Cluster name: `supermen`.

**Database user:** Security → Database Access → Add New User. Username `supermen_app`, password auto-generated (copy it now, it is shown once). Role: **Read and write to any database**.

**Network access:** Security → Network Access → Add IP Address.

Hostinger shared hosting does not give you a fixed outbound IP, so you will likely need `0.0.0.0/0` (allow from anywhere). That is safe *only* because the connection still requires the username and password — but it does mean your password is the sole barrier. Make it long and never reuse it. If Hostinger support can give you a static outbound IP, use that instead.

**Connection string:** Database → Connect → Drivers → Node.js. You get something like:

```
mongodb+srv://supermen_app:<password>@supermen.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Insert the password, and add the database name before the `?`:

```
mongodb+srv://supermen_app:YOURPASSWORD@supermen.xxxxx.mongodb.net/supermen-fitness-gym?retryWrites=true&w=majority
```

That `/supermen-fitness-gym` matters. Without it everything lands in a database called `test`.

---

## 2. Backend on Hostinger

Node.js apps are supported on Business and Cloud plans (up to 5 apps on Business).

### 2.1 Subdomain

hPanel → Domains → Subdomains → create `api.supermenfitness.com`. This is what Netlify will proxy to.

### 2.2 Create the Node app

hPanel → Websites → Add Website → **Node.js**. Connect the GitHub repo (redeploys on push) or upload a zip.

- **Application root:** repository root, not `server/`
- **Startup file:** `server/index.js`
- **Node version:** 20 or higher
- **Domain:** the `api.` subdomain from above

### 2.3 Environment variables

Set these in hPanel before the first start. The server deliberately refuses to boot without the first two.

| Variable | Value |
|---|---|
| `JWT_SECRET` | 64 random characters — generate fresh, never reuse the dev value |
| `ADMIN_PASSWORD` | fresh, strong, not the dev one |
| `ADMIN_EMAIL` | the gym's address |
| `MONGODB_URI` | the Atlas string from step 1 |
| `NODE_ENV` | `production` |
| `PORT` | leave unset — Hostinger assigns it |
| `GYM_TIMEZONE` | `Asia/Kolkata` |
| `TRUST_PROXY` | `1` to start — verify in step 4 |
| `CORS_ORIGIN` | `https://supermenfitness.com` |
| `UPLOADS_DIR` | absolute path, e.g. `/home/uXXXXX/uploads` |
| `PRIVATE_UPLOADS_DIR` | absolute path, e.g. `/home/uXXXXX/private-uploads` |
| `SESSION_DAYS_MEMBER` | `7` |
| `CSP_REPORT_ONLY` | `true` for now — see step 5 |

Generate the JWT secret locally:

```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

**Put `UPLOADS_DIR` and `PRIVATE_UPLOADS_DIR` outside the application directory.** If they sit inside it, a redeploy that replaces the app folder takes every gym photo and every member progress photo with it. Somewhere under your home directory is right.

### 2.4 Two things that may bite

**`sharp` is a native module.** It ships platform-specific binaries. If the deploy log shows a sharp error, try `npm install --include=optional sharp` in the build command, or `npm rebuild sharp`.

**`node_modules` is large.** Shared hosting caps inodes (file counts), and this repo's dependencies include React and Vite, which the backend never uses. If you hit a limit, tell me and I will split out a `server/package.json` containing only the nine packages the backend actually needs.

### 2.5 Seed the database

Once the app starts and connects, run the seed scripts. If Hostinger's plan does not expose SSH, run them from your own machine with `MONGODB_URI` temporarily pointed at Atlas:

```powershell
node server/seed.js
node server/seed-members.js
node server/set-address.js
```

---

## 3. Frontend on Netlify

1. Edit `netlify.toml` — replace both instances of `api.supermenfitness.com` with your real subdomain.
2. Commit and push.
3. netlify.com → Add new site → Import from GitHub → pick the repo.
4. Build command and publish directory are read from `netlify.toml`; leave the defaults.
5. Deploy, then Domain settings → add `supermenfitness.com` and follow the DNS instructions.

Netlify issues the HTTPS certificate automatically. Hostinger issues one for the `api.` subdomain — confirm it is active, because the proxy will fail on an invalid certificate.

---

## 4. Verify the proxy chain

This is the step people skip, and it silently breaks rate limiting.

Open `https://supermenfitness.com/api/health`. You should see:

```json
{ "ok": true, "ip": "...", "trustProxy": 1, "db": "connected", "time": "..." }
```

Three things to check:

- **`db` says `connected`.** If not, the Atlas URI or the network access rule is wrong.
- **`ip` is your own address.** Check it against whatismyip.com. If it shows a datacentre address instead, `TRUST_PROXY` is too low — raise it to `2` and redeploy. Requests pass through both Netlify's edge and Hostinger's proxy, so two hops is plausible.
- **The URL bar still reads `supermenfitness.com`.** If it jumped to the api subdomain, the redirect is missing `status = 200`.

Getting `TRUST_PROXY` wrong is not cosmetic. Every visitor would share one rate-limit bucket: one person's failed logins could lock the gym owner out of the admin panel, and the 5-per-hour lead limit would apply across the entire site rather than per visitor.

---

## 5. Turn on the CSP

You deployed with `CSP_REPORT_ONLY=true` so a mistaken policy could not break the live site.

Open the site, press F12, and read the Console. Content-Security-Policy warnings tell you what *would* have been blocked. Pay attention to the inline JSON-LD block in `index.html` — depending on the browser it may need a hash added to `scriptSrc`.

If the console is clean, set `CSP_REPORT_ONLY=false` and redeploy. The policy is what stops an injected script from running, so it is worth enforcing rather than leaving in report mode.

---

## 6. Before the client sees it

| Check | Where |
|---|---|
| Ankit's bio and quote say `REPLACE ME` | Admin → Trainers → Ankit Giri |
| Change the admin password from whatever you deployed with | Admin → the value in `ADMIN_PASSWORD` |
| Member portal loads | `/member/login` with `919999900001` / `demo1234` |
| Progress photos render | Member portal → Progress. These use signed links, worth confirming through the proxy |
| Contact form writes a lead | Submit it, then check Admin → Leads |
| Upload an image | Admin → Trainers. Should come back as a WebP at ~55 KB |
| Redeploy, then check uploads survived | The single most common production failure |

---

## 7. Before real launch

| Item | Why |
|---|---|
| Replace 21 stock photos | `node server/photos.js` lists them; `--list` generates the filenames to request from the gym |
| Delete the demo member | `919999900001` / `demo1234` is a known login on a public URL |
| Remove `ADMIN_EMAIL` from `src/config.ts:12` | It compiles into the public JS bundle, so an attacker starts knowing the username |
| `npm audit fix` | One low-severity dev-only advisory outstanding |
| Set up Atlas backups | M0 has no automatic backups. Even a weekly `mongodump` on a cron is better than nothing |
| Confirm `git log --all --full-history -- server/.env` is empty | If it is not, your dev secrets are in the repo history |

---

## Rollback

Netlify keeps every deploy — Deploys → pick an earlier one → Publish. Instant.

Hostinger redeploys from the last commit, so `git revert` and push is the path back. Take an Atlas snapshot before any deploy that changes data.
