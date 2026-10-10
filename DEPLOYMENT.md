# Deployment

Frontend on **Vercel**, backend on **Render**, database on **MongoDB Atlas**.
The backend cannot run on Vercel: it keeps socket.io connections open and runs
three `node-cron` jobs (story expiry, subscription expiry, post scheduler), all
of which need one persistent Node process.

## 1. Database — MongoDB Atlas

1. Cluster -> **Security -> Network Access -> Add IP Address -> Access List Anywhere
   (`0.0.0.0/0`)**. Render's outbound IPs are dynamic, so a single-IP entry will
   break the deploy.
2. Reuse the existing `MONGO_URL` (`mongodb+srv://<user>:<pass>@...`) from
   `server/.env`. Atlas also requires a Database User with read/write on the
   target database.

## 2. Backend — Render

`render.yaml` at the repo root defines the service (rootDir
`instagram_clone-main/server`, `npm install` -> `npm start`, health check `/`).
Either import the repo as a **Blueprint**, or create a **New Web Service** manually:

| Field | Value |
| --- | --- |
| Root Directory | `instagram_clone-main/server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/` |

Environment variables to add (values come from your local `server/.env` — never
commit them):

`MONGO_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`EMAIL_USER`, `EMAIL_PASS`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET` (only if you register a webhook), `GROQ_API` (optional).
`PORT` is injected by Render.

**`CLIENT_URL` must be the exact Vercel origin** (e.g. `https://connectly.vercel.app`)
— it drives both the Express CORS allow-list and the socket.io CORS policy. It
accepts a comma-separated list, so production and preview URLs can both be
trusted: `https://connectly.vercel.app,https://preview-connectly.vercel.app`.

`npm start` now runs `node src/server.js` (not `nodemon`); `nodemon` is only for
`npm run dev`.

## 3. Frontend — Vercel

Import the repo, then set:

| Field | Value |
| --- | --- |
| Root Directory | `instagram_clone-main/client` |
| Framework Preset | Next.js |
| Build Command | `npm run build` |

Environment variable: `BACKEND_URL = https://<service>.onrender.com` (no trailing
slash). `BACKEND_URL` is baked in at build time via `next.config.ts`
(`env: { BACKEND_URL }`), so **every Vercel redeploy must see the final value** —
changing the backend URL later requires a rebuild, not just a restart.

`localStorage` carries the bearer token and cookies are not used for auth, so
cross-origin requests work without any extra session plumbing.

## 4. After both are live

1. Open the Vercel URL, log in, confirm the home feed loads (proves `BACKEND_URL`
   + CORS + Atlas are all correct).
2. Upload a story and a post — both go through the server's `/api/upload`
   Cloudinary endpoint, so this validates the media keys.
3. Razorpay: Dashboard -> API keys -> **Webhooks -> Add Webhook**, URL
   `https://<service>.onrender.com/api/subscription/webhook`, event `payment.captured`,
   then copy that signing secret into `RAZORPAY_WEBHOOK_SECRET` and redeploy.
   Optional — `POST /api/subscription/verify` already activates the plan.

## Known free-tier limits

- Render's free instance sleeps after ~15 minutes without traffic. The first
  request after a gap takes ~30-60s, and while it sleeps no cron job runs, so a
  scheduled post publishes on the next wake-up instead of exactly on time.
  Wake the service right before a demo.
- Render free web services may not support WebSockets reliably; chat and
  real-time story analytics can fall back to a degraded state. The graded flows
  (stories, OTP, subscriptions, admin, scheduling) do not depend on sockets.
- Payments are restricted to 05:00-11:00 IST by default. For a demo outside that
  window set `PAYMENT_WINDOW_START_HOUR` / `PAYMENT_WINDOW_END_HOUR` on Render
  and remove them afterwards, so the documented rule still shows in production.
- Vercel previews use `*.vercel.app`; add every deployment origin you test from
  to `CLIENT_URL`, or the browser will block API calls with a CORS error.
