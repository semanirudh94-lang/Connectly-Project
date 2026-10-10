# InstAI — Instagram Clone: Project Report

Full-stack social media application built with **Next.js 16 (App Router) + React 19** on the
frontend and **Express 5 + MongoDB/Mongoose 8** on the backend, delivered as two packages:
`client/` and `server/`.

**Tech stack:** Next.js 16, React 19, TypeScript, Zustand, axios, socket.io, Tailwind,
Express 5, Mongoose 8, JWT (access + refresh), bcrypt, Cloudinary, Multer, node-cron,
Nodemailer (Gmail), Twilio (optional), Razorpay, Groq (optional AI helper).

---

## 1. Setup

```bash
# 1 — backend
cd server
npm install
cp .env.example .env          # fill in your own credentials (see section 2)
npm run seed:admin            # creates the administrator account
npm run dev                   # http://localhost:5000

# 2 — frontend (separate terminal)
cd client
npm install
cp .env.example .env.local    # BACKEND_URL=http://localhost:5000
npm run dev                   # http://localhost:3000   (restart after any env change)
```

`.env` files are gitignored on both sides; `.env.example` documents every variable name
without values.

## 2. Configuration & external services

| Variable | Purpose | Behaviour when unset |
| --- | --- | --- |
| `MONGO_URL` | MongoDB / Atlas connection | Server exits with the Atlas whitelist error |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing | Auth fails |
| `CLIENT_URL` | socket.io CORS origin | Realtime origins restricted |
| `CLOUDINARY_*` (3) | Media storage for posts **and** stories | Uploads return 500 |
| `EMAIL_USER`, `EMAIL_PASS` | Gmail SMTP: OTP mail, invoices, publish notices | `[EMAIL STUB]` printed to console |
| `TWILIO_*` (3) | Mobile OTP delivery | `[SMS STUB]` printed to console |
| `RAZORPAY_KEY_ID/SECRET` | Real checkout + signature verification | Clearly-flagged stub order, same code path |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC | Webhook endpoint replies 503 |
| `PAYMENT_WINDOW_START_HOUR` / `END_HOUR` | Demo override of the payment window | Default rule 05:00–11:00 IST |
| `GROQ_API` | AI caption assist (not an assignment requirement) | AI routes answer 503, server still boots |

**Admin credentials** (created by `npm run seed:admin`, documented as required by the
assignment — seed source: `server/src/seed/admin.seed.js`):

```
Email:    admin@instaclone.com
Password: Admin@123
Role:     admin
```

The seed is an idempotent upsert, so re-running it restores these credentials.

---

## 3. Task 1 — Stories with real-time analytics

**Requirements → implementation**

| Requirement | Where |
| --- | --- |
| Multi-media story upload | `client/components/insta/CreateStoryModal.tsx` → `POST /api/upload` (Cloudinary) → `POST /api/stories` (`server/src/controllers/story.controller.js`, `Story.insertMany`, one document per media item) |
| 24-hour expiry | `STORY_TTL_MS = 24h` sets `expiresAt`; `server/src/jobs/storyExpiry.job.js` runs every 10 minutes and purges expired stories, destroying Cloudinary assets only when no highlight references them |
| Privacy: Public / Followers only / Close friends | `privacy` enum on `Story.model.js`; visibility resolved server-side in the feed query; close-friends list managed by `closeFriends.controller.js` (`/api/close-friends`) and `CloseFriendsModal.tsx` |
| Reactions & replies | `StoryReaction.model.js`, `StoryReply.model.js` with dedicated endpoints, surfaced in `StoryViewer.tsx` |
| Highlights from archived stories | `highlight.controller.js` + `CreateHighlightModal.tsx`; highlights keep referencing archived story ids so they outlive the 24-hour window |
| Unique-view de-duplication | `StoryView.model.js` is keyed per (story, viewer); a repeat view does not create a second record, so views never double-count |
| Delete before expiry | Owner-only soft delete (`isDeleted`) — analytics are preserved for history |
| Analytics retained after archival | `StoryAnalytics.tsx` reads aggregates independently of story lifetime |
| Query optimisation | Compound indexes `{ user, isActive, expiresAt }` and `{ isActive, expiresAt }` on stories plus the unique `{ story, viewer }` index on views, and single aggregated reads for the analytics panel instead of per-view queries |

**Realtime:** story events go through socket.io; the JWT handshake middleware
(`server/src/socket.js`) verifies the access token before accepting a connection.

## 4. Task 2 — Multi-language support with secure verification

Six locales — English, Spanish, Hindi, Portuguese, Chinese, French — are stored as flat
dictionaries in `client/locales/*.json` (**527 keys each, verified to have zero drift**).

* Routing: **French → email OTP**, the other five → **mobile OTP** (`channelForLanguage` in
  `server/src/utils/otp.js`).
* The requested language is held as a *pending* value in `OtpVerification.model.js` and is
  applied to the user profile **only after successful verification** — a failed or abandoned
  OTP never changes the UI language.
* OTP security (`server/src/utils/otp.js`): 6-digit code stored **hashed**, 5-minute TTL,
  maximum 5 wrong attempts, 15-minute lockout after that, 30-second resend cooldown.
  Comparison uses a length-checked `timingSafeEqual`.
* Delivery targets are masked in transit (`maskEmail`, `maskPhone`) and the raw code is never
  returned to the client.
* The verified language is persisted on the user record and restored on every later login.
* Server responses carry stable machine-readable `code` fields; `client/lib/serverError.ts`
  maps `code → errors.<code>` in the active language, with an English fallback so a message is
  never blank. This keeps the API English while the UI is fully localised.

## 5. Task 3 — Subscription plans with payment restrictions

Plan catalogue: `server/src/config/plans.js` (single source of truth).

| Plan | Price | Post limit | Validity |
| --- | --- | --- | --- |
| Free | ₹0 | 1 | — |
| Bronze | ₹100 | 3 | 30 days |
| Silver | ₹300 | 5 | 30 days |
| Gold | ₹1000 | Unlimited | 30 days |

* **Order & verify:** `POST /api/subscription/order` creates a Razorpay Order;
  `POST /api/subscription/verify` re-computes `HMAC-SHA256(order_id|payment_id, key_secret)`
  and compares it with `crypto.timingSafeEqual` before any plan is activated
  (`subscription.controller.js`).
* **Payment window:** transactions are accepted only between **05:00 and 11:00 IST**. The check
  uses `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"` so it is correct no matter where the
  server is hosted, and it is enforced on **both** order creation and verification
  (`server/src/utils/payment.js`). Outside the window the API answers
  `403 payments_closed_window` and the pending payment record is left untouched.
  For demonstrations the window can be moved with `PAYMENT_WINDOW_START_HOUR` /
  `PAYMENT_WINDOW_END_HOUR`; leaving them unset keeps the required 05:00–11:00 rule.
* **Post-limit validation:** `middleware/postLimit.middleware.js` guards `POST /api/posts`, so
  an over-quota post is rejected server-side; `services/plan.service.js` computes usage
  (lapsed plans are treated as Free until renewed).
* **Invoice email:** on activation, `services/mailer.js` sends an invoice containing the plan,
  amount, payment/reference ids, validity start and the next renewal date.
* **Renewal, failure, cancellation:** `jobs/subscriptionExpiryJob` runs hourly, downgrades
  expired plans, and handles `cancellation_scheduled` → `cancelled` at period end; failed
  payments never activate a plan.
* **Webhook:** `POST /api/subscription/webhook` is mounted above the JSON body parser so the
  **raw bytes** are HMAC-verified with `RAZORPAY_WEBHOOK_SECRET`; processing `payment.captured`
  is idempotent, and internal failures return 5xx so Razorpay retries.

## 6. Task 4 — Advanced login security and login history

`server/src/utils/deviceInfo.js` (ua-parser-js) classifies **browser, OS and device type
(Desktop / Laptop / Mobile)**; `auth.controller.js` decides the challenge:

| Situation | Rule |
| --- | --- |
| Chrome on desktop | Password **plus email OTP** — token issued only after `POST /api/auth/login/verify` |
| Edge (or other browsers) | Password only, no additional step |
| Mobile device | Login allowed only between **10:00 and 13:00 server time** (`utils/loginWindow.js`); outside it the attempt is denied |
| Any attempt | Recorded in `LoginHistory.model.js` |

History captures browser, OS, device type, IP, timestamp and status, where status is one of
`success`, `failed` (bad credentials), `otp_failed`, `pending`, `expired`, `denied_window` —
so both successful and unsuccessful attempts are audited. `app.set("trust proxy", true)` keeps
`req.ip` meaningful behind a proxy. Users browse their own trail in `LoginHistoryModal.tsx`
(`GET /api/auth/login-history`).

## 7. Task 5 — Admin dashboard with complete CRUD and filters

Reachable only through `middleware/admin.middleware.js` (role check after authentication); the
UI lives at `client/app/admin/page.tsx` with `components/admin/ResourceTable.tsx` and
`lib/admin.service.ts`.

* **Resources:** users, posts, stories, comments, subscriptions, reports, scheduled posts,
  publish errors.
* **CRUD:** create (manual subscription grant), read, update (edit user, comment text/soft-delete,
  report status, plan changes) and delete on every managed resource, plus admin cancellation of
  scheduled posts.
* **Filters/search/sort/pagination:** server-side on all listings — status/plan/type filters,
  keyword search (stories match owner username, full name or media URL because stories carry no
  caption), sortable columns and paginated results.
* **Summary statistics:** `GET /api/admin/stats` aggregates total/active/admin users, post, story
  and comment counts, subscriptions by plan, reports by status and overall engagement (likes,
  comments, saves, shares) in a single parallel batch for the dashboard cards.
* **Audit log:** every admin mutation writes an `AuditLog.model.js` entry via `utils/audit.js`
  (actor, action, entity, before/after diff, timestamp) and is browsable in the dashboard.
* **Reports pipeline:** end users file reports through `POST /api/reports`
  (`report.controller.js` — validates the target exists, rejects duplicate pending reports with
  `409 report_already_exists`); the UI exposes it as a **Report** action on every post, and the
  admin dashboard triages that queue.

## 8. Task 6 — Post scheduling with validation rules

`server/src/controllers/schedule.controller.js`, mounted under `/api/posts/scheduled`.

* **Validation:** scheduled time is required, must parse, must be strictly in the future
  (`schedule_time_required | invalid | past`), and a maximum of **2 pending scheduled posts per
  user** (`MAX_SCHEDULED_PER_USER`).
* **Content:** images, caption, hashtags, tagged users and location — the same media pipeline as
  instant posts (`lib/post.service.ts → POST /api/upload`), with hashtag resolution
  (`utils/hashtags.js`) and tagged-user sanitisation (`utils/taggedUsers.js`) so unknown ids are
  dropped.
* **Hidden until published:** scheduled posts carry `status: "scheduled"` and every public
  listing filters `status: "published"`, so they appear on nobody's feed.
* **User controls:** view, edit, reschedule and cancel in `ScheduledPostsSection.tsx`.
* **Background scheduler:** `jobs/postScheduler.job.js` runs **every minute**, publishes due
  posts, sends the "your post is live" email, and retries failures up to **3 attempts** before
  marking the post `failed` and recording a permanent error.
* **Error log:** `PublishErrorLog.model.js` stores post, user, attempt count, error message and
  whether the failure is permanent; admins read it through `GET /api/admin/publish-errors`.
* **Monitoring & quota:** the dashboard filters scheduled / published / cancelled / failed, and
  the publish path passes through the same plan-limit middleware, so a post can never exceed its
  plan quota.

---

## 9. Security measures

* Passwords bcrypt-hashed; access token 1 h + refresh token, secrets never logged.
* Razorpay signature and webhook HMAC compared with length-checked `crypto.timingSafeEqual`.
* OTP stored hashed with TTL, attempt cap and lockout; delivery target masked; code never sent
  to the client.
* Webhook body verified over **raw bytes** before JSON parsing, mounted above the JSON parser.
* All socket connections require a valid JWT at handshake.
* `protect` on every mutating route; `adminOnly` on the whole `/api/admin` surface.
* User-supplied search strings are escaped before being compiled into regexes (ReDoS guard).
* Tagged-user id lists sanitised against real accounts; media fields validated shape-by-shape.
* Cloudinary credentials stay server-side — the browser only ever posts `multipart/form-data`
  to `/api/upload`; the upload folder is whitelisted so a client cannot choose a storage path.
* CORS restricted to known frontend origins; `sameSite` cookie policy for refresh tokens.

## 10. How to demonstrate each task

1. **Stories:** create a multi-media story as Close Friends → open it from a second account
   (blocked) → react/reply as an allowed viewer → check analytics (view twice: count stays 1) →
   delete a story before expiry → build a highlight from an archived story.
2. **Language:** Settings → Language → French (email OTP) and Spanish (mobile OTP) → wrong OTP
   five times to see the lockout → verify → log out and back in to show persistence.
3. **Subscription:** hit the Free limit with a second post (blocked) → buy Bronze inside the
   window with the Razorpay test card `4141 4141 4141 4141`, expiry `1234`, CVV `123`,
   OTP `1234` → check the invoice email → post 4 times, the 4th must be blocked.
4. **Login security:** log in with Chrome (OTP step), Edge (no step), then a mobile user agent
   between 10:00–13:00 and again after 13:00 (denied) → open Login history.
5. **Admin:** sign in as the seeded admin → CRUD on each resource, filters/search/sort/
   pagination, summary cards, audit log, publish-errors tab.
6. **Scheduling:** schedule a post with caption/hashtags/location/tagged users → it stays out of
   the feed → reschedule, then cancel → try a third pending schedule (rejected) → let one publish
   on time and check the confirmation email.

## 11. Known limitations & honest notes

* **SMS delivery:** Twilio's free trial cannot reliably deliver to Indian numbers (DLT/TRAI
  carrier rules). The OTP logic is exercised through the console transport, which prints the
  code — the code path and validation are identical, only the carrier call is mocked.
* **Emails** require a Gmail **App Password** (normal passwords are rejected by Google).
* **Payments** are demonstrated in Razorpay **test mode**; no live money moves. The webhook needs
  a public URL (ngrok/Cloudflare tunnel); without it, verification in `POST /verify` still
  activates plans, so the webhook is a backstop rather than a hard dependency.
* **Login window** uses the server's local clock (10:00–13:00) exactly as specified, while the
  **payment window** is pinned to IST — the two are deliberately different because the
  requirements are worded differently.
* A few decorative clone features (saved-posts bookmark, suggested-users rail, unread DM badge,
  and the Search/Explore/Reels/Notifications nav entries) are still mock or inert; they are part
  of the original UI skeleton and are not covered by the six assignment tasks.
