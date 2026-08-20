# FixMate — Preview Run Doc

Project layout (monorepo under `D:\Projects`):

- `fixmate/` — Spring Boot core backend (port 8081)
- `fixmate-api-gateway/` — Spring Cloud Gateway (port 8080, single CORS origin for the frontend)
- `fixmate-eureka-server/` — Eureka service discovery (port 8761)
- `fixmate-frontend/` — React + Vite frontend (port 5173)

The frontend makes API calls directly to `http://localhost:8080/api/...` (the gateway) — `vite.config.js` has no proxy. The gateway adds the CORS headers; the backend must NOT add its own (there is intentionally no `CorsConfig` in the backend).

## Reproduce artifacts (fresh checkout)

- **Frontend deps:** `cd fixmate-frontend && npm install` (nothing else — no `.env` files are needed; the API base URL is hardcoded to `http://localhost:8080` in `src/api.js`).
- **Backend:** plain Maven projects, no copied artifacts. `DataSeeder` seeds service categories + one demo admin on startup (idempotent; MySQL must be running, config in `fixmate/src/main/resources/application.properties`). **No service partners are seeded** — partners must register themselves.

## Run the servers

Backend stack (MySQL must be up first):

```bash
cd fixmate-eureka-server && mvn spring-boot:run   # 8761
cd fixmate && mvn spring-boot:run                 # 8081
cd fixmate-api-gateway && mvn spring-boot:run     # 8080
```

Or double-click `start-backend.bat` (paths point at `d:\Projects\...`).

Frontend dev server:

```bash
cd fixmate-frontend && npm run dev                # 5173
```

Verify: the UI is reachable at `http://localhost:5173`; API calls go through the gateway at `http://localhost:8080/api/v1/...`.

## Frontend architecture (redesigned — Aug 2026)

The React frontend was redesigned into a production-style marketplace while keeping every API call and handler intact:

- **Design system** — `src/index.css` holds the full token set + component library (buttons, badges, cards, forms, tables, modals, tabs, skeletons, empty/error states, stepper, responsive rules). Palette: indigo primary `#4f46e5` + violet accent `#7c3aed` + slate neutrals. No UI library added — `lucide-react` provides icons.
- **Reusable components** — `src/components/ui/`: `Button`, `Modal`, `StatusBadge`, `Avatar`, `StatCard`, `RatingStars` (+ `StarSelector`, `RatingDistribution`), `Skeleton`, `EmptyState`/`ErrorState`, `ServiceIcon` (category name → icon), `Stepper`, `MobileNav` (+ `navIcons.js` presets).
- **Pages** — `Login`/`Register` are split-screen (brand panel + form); `AdminDashboard` shows real KPIs from `/admin/dashboard` (users, partners, pending KYC, bookings, completed, emergency, revenue); `Navbar` is role-aware.
- **Customer dashboard** — hero ("What do you need help with?"), live category cards from `/categories` (clicking one starts a booking), 🚨 emergency banner, and a **5-step booking journey** in the modal: Service → Location (pending coords + Set Location + address) → Schedule (date + notes) → Partners (all nearby results with View Profile / Select) → Confirm (summary + estimated cost). Search still uses the confirmed location only; the results list is LIVE (SSE) and sorted by distance. Partner cards show avatar, verified badge, ⭐ score, distance, rate, experience, badges. The profile modal adds a rating distribution + real reviews. A "Track" button opens a status-pipeline modal (Request Sent → Accepted → In Progress → Completed).
- **Partner dashboard** — stat cards (status, pending, in-progress, completed), a prominent Go Online/Go Offline control with the preserved Set Location flow, filterable jobs table (Pending/Accepted/In Progress/Completed/All) with Accept/Start/Complete actions, KYC status hint, and the portaled notification drawer grouped by Today/Yesterday/Earlier with per-type icons.
- **Mobile** — bottom navigation on both dashboards (Home/Book/Bookings for customers; Dashboard/Requests/Alerts for partners); cards stack, modals go full-width under 640px.

Lint: `npm run lint` (oxlint) must stay at 0 warnings. Build: `npx vite build`.

## Demo the dynamic nearby-partner search (no hardcoded partners)

The customer dashboard has NO static partner dropdown. Partners are discovered at search time from the database, filtered by category + KYC-APPROVED + ONLINE + AVAILABLE + fresh location, and returned sorted by backend-computed distance.

**Location confirmation flow (both dashboards):** the Latitude/Longitude fields hold PENDING values — typing or scrolling them never changes the active location. Only clicking **Set Location** (after client-side range validation, lat −90..90 / lon −180..180) applies it: for a partner it POSTs to `/partners/location`; for a customer it becomes the confirmed search location. **"Use my current location"** reads real browser GPS (`navigator.geolocation`) into the pending fields — nothing is saved until Set Location is clicked. There is no "Demo/Simulated Location" UI anywhere.

1. **Register two mechanics** (separate browser sessions / incognito windows):
   - `partnerA@gmail.com` / `Partner@123` — category `MECHANIC`
   - `partnerB@gmail.com` / `Partner@123` — category `MECHANIC`
   - Admin (`admin@fixmate.com` / `Admin@123`) must approve their KYC (KYC status starts PENDING).
2. **Partner dashboard:** enter coordinates in **Current Location** and click **Set Location** (saved per-account), e.g. A → `17.4500, 78.3900`, B → `17.4700, 78.4100`, then click **Go Online**.
3. **Customer session** (`customer@gmail.com` / `Customer@123`): the booking journey is a 5-step modal — pick **Mechanic** (step 1) → enter `17.4550, 78.3950` and click **Set Location** + pick an address (step 2, required for the booking API) → date & notes (step 3) → **Find Nearby Professionals** → choose a partner (step 4) → **Confirm & Book** (step 5). Searching without a confirmed location is blocked with "Please set your location before continuing."
4. Expect both partners listed with distances (~0.77 km and ~2.31 km), hourly rates, and ACTIVE/AVAILABLE badges from the backend.

The search returns **ALL eligible partners within the radius, sorted nearest → farthest** — never just the closest one. The result count ("1 nearby partner found" / "3 nearby partners found") is dynamic and reflects how many partners are currently online + available + KYC-approved + offering the category with a fresh location. Each result card has its own **View Profile** and **Book** buttons; booking targets exactly the partner whose button was clicked (verified: booking the 3rd-farthest partner stored that partner's id + coordinates).

**View Profile** (per card, above Book): opens a modal via `GET /api/v1/partners/{userId}/profile?categoryName=...&latitude=...&longitude=...` (JWT-authenticated; partner identified by user id, never by name). It shows the partner's real database info — name, service category, experience, hourly rate, live distance, KYC status, availability, **average rating / total reviews / Smart Service Score** and their actual review history (newest first, "View All Reviews" when more than 3). No sensitive data (email/phone/documents) is exposed. Empty states are honest ("Not rated yet", "No reviews yet", "Information not available"). View Profile never creates or alters a booking — only Book does. Reviews are created by customers on COMPLETED bookings via `POST /api/v1/reviews/booking/{bookingId}` and update the partner's Smart Service Score.

Ready-made extra partners for a multi-result demo (already registered, ONLINE, KYC APPROVED, Plumbing):

- `plumbinga@test.local` / `Partner@123` — Anil Kumar, 17.4750, 78.3950 (~2.2 km from the customer)
- `plumbingb@test.local` / `Partner@123` — Bala Murthy, 17.4920, 78.3950 (~4.1 km)

Together with the customer's own plumbing partner (e.g. `batta2@gmail.com`, adithya batta at ~1.6 km) a Plumbing search from 17.4550, 78.3950 shows **3 nearby partners found** in distance order. A partner outside the 5 km radius (e.g. the seeded Mohan Das at ~12 km, whose location is also stale) is excluded — that's the radius filter working.

**Notifications (database-backed):** when a booking is created, the backend persists a notification for the selected partner (in the `notifications` MySQL table — survives refresh, logout/login, and backend restarts) **after** the booking row is saved; a failed booking creates no notification. Scheduled bookings send `BOOKING_CREATED` ("New Service Request" with customer, service, backend-computed distance, booking type, date, time); emergency bookings send `EMERGENCY_REQUEST` ("Emergency Service Request" with distance). The partner dashboard shows a 🔔 bell with a live unread badge, polled every 8s (`GET /api/v1/notifications/unread-count`) so it updates without a refresh. Clicking the bell opens the notifications panel (unread highlighted with a blue indicator): each item shows title, message, Booking ID, relative time, and a **View Request** button that marks it read and scrolls/highlights the booking row in the jobs table. Endpoints: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all` — all scoped to the JWT-authenticated user (a customer cannot read or mark another partner's notifications). Customer confirmation after booking: "✅ Booking created successfully — Your request has been sent to {partner}."

Re-running the search reflects live state immediately: go a partner OFFLINE (or move their location far away) and they drop out of the results.

**Live updates (SSE):** after a successful search the results panel shows a 🟢 LIVE badge and subscribes to an SSE stream (`POST /api/v1/search/nearby/stream` → ticket → `GET /api/v1/search/nearby/stream/{ticket}` via EventSource). When any partner changes status or pushes a new location (the partner dashboard pushes every 30s while online), the customer's list updates automatically — partners appear/disappear and distances re-sort with no re-search. The stream closes when the modal closes, the search changes, or a booking is made. Streams are in-memory per backend instance and die on backend restart (the customer just re-searches).

## Seeded demo accounts

- Admin: `admin@fixmate.com` / `Admin@123` (approves partner KYC)
- All other accounts (customers/partners) are created via the app's Register page during the demo.
