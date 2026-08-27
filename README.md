# Supermen Fitness Gym — Website + Admin CMS (Self-hosted)

A production-ready gym website with a full admin panel. **No Firebase, no third-party services** — your own backend:

- **Frontend:** React 19 + Vite + Tailwind v4
- **Backend:** Node.js + Express (in `server/`)
- **Database:** MongoDB (local or free MongoDB Atlas)
- **Auth:** JWT login for a single admin account
- **Images:** uploaded to the server (`server/uploads/`), served at `/uploads/...`

Admin panel manages: leads, services, trainers, testimonials, gallery, pricing, health tips, FAQs, and general settings — all live on the site with no code changes.

## 1. Setup (one time)

```bash
npm install
cp server/.env.example server/.env
```

Edit **`server/.env`**:

| Variable | What to put |
|---|---|
| `MONGODB_URI` | Local: leave as-is (needs MongoDB installed). Or create a free cluster at mongodb.com/atlas and paste its connection string. |
| `ADMIN_EMAIL` | Already set: `mesushant.official@gmail.com` |
| `ADMIN_PASSWORD` | The admin login password — pick a strong one |
| `JWT_SECRET` | Any long random string (e.g. run `openssl rand -hex 32`) |

## 2. Run locally

Two terminals:

```bash
npm run server   # backend on http://localhost:5000
npm run dev      # frontend on http://localhost:3000
```

**First run?** Fill the site with demo content + stock photos in one command (run it once, after the server connects to MongoDB):

```bash
npm run seed
```

This seeds hero text, services, trainers, testimonials, gallery, pricing, health tips and FAQs using free Unsplash images. It only fills *empty* collections, so it never overwrites anything you've edited in the admin panel. Replace the stock photos with the gym's real photos from the admin panel before launch.

Open http://localhost:3000 → Admin panel at `/login` (link in the footer). Log in with the email + password from `server/.env`.

## 3. Deploy to production

The Express server serves the built frontend itself — **one process, one deployment**:

```bash
npm install
npm run build
npm start        # serves site + API on PORT (default 5000)
```

Works on a VPS, Railway, or Render. Set the same env variables from `server/.env` in the host's dashboard, and point `MONGODB_URI` at MongoDB Atlas (free tier is plenty for a gym site).

> **⚠️ Important — uploaded images:** images are stored on the server's disk in `server/uploads/`. On hosts with **ephemeral disks (Render free tier, Railway without a volume)** uploads are wiped on every redeploy/restart. Use one of: a VPS, Render/Railway **with a persistent disk/volume attached to `server/uploads`**, or swap the upload route to Cloudinary later. Do not skip this when deploying for a paying client.

## 4. Customize the brand

- **`src/config.ts`** — gym name, city, tagline, contact email, social links, optional Google-rating badge
- **`index.html`** — page title + meta description
- Everything else (hero text, numbers, address, map, images, pricing, FAQs…) is edited from the admin panel.

## Security notes

- Only the email+password in `server/.env` can log in; sessions are 7-day JWTs.
- Public visitors can only *read* content and *create* leads (validated + rate-limited to 5/hour per IP, plus a hidden honeypot field in the form).
- All write routes require the admin token. Uploads are admin-only, images only, max 10MB.
- Never commit `server/.env` (already gitignored).

## Notes

- Leads appear in Admin → Leads (newest first). No email notification is built in — add one later via nodemailer in `server/index.js` if a client asks.
- `/privacy` and `/terms` are generic starter templates — review before launch.
