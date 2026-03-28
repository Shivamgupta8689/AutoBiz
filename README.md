# Smart Invoicing Assistant (AutoBiz)

AI-powered invoicing, reminders, and light inventory tooling for Indian small businesses — React + Express + MongoDB.

---

## Problem

Small businesses (kirana stores, freelancers, traders) lose time and cash flow chasing payments across fragmented tools, with little visibility into late payers or smart, context-aware follow-up.

## Solution

A single app for invoices, customers, analytics, and optional raw-material / inventory tracking. A **workflow automation engine** runs on a schedule to drive notifications, emails, inventory reorder checks, and smart reminders (with Gemini-generated copy in multiple languages). **Nodemailer** sends real invoice and reminder mail when SMTP is configured.

---

## Features

### Invoicing & payments

- GST-oriented invoice creation with **PDF export** (jsPDF) and **UPI QR** per invoice (`qrcode.react`).
- Invoice status updates; **payment simulation** via webhook-style endpoint for demos.
- **Risk / priority scoring** on invoices and **customer health** scores (0–100).

### AI & automation

- **Google Gemini** for reminder message generation (e.g. Hinglish, English, Hindi, Marathi, Tamil), AI **business insights**, and **voice-to-invoice** parsing (with regex fallback).
- **Smart reminder engine**: rules such as SUPPRESS / DELAY / SEND / ESCALATE; respects **activity** and **Busy Mode** before sending.
- **Background automation** (`automationEngine`): runs on server start and every **60 seconds** for all users (notifications, emails, WhatsApp links, inventory checks).

### Comms & UX

- **Real email** via Nodemailer + Gmail app password (optional).
- **In-app notifications** with unread counts (client polls).
- **Landing page** (`/`), **Login** (`/login`), **Register** (`/register`), **About** (`/about`); authenticated area uses a shared **sidebar layout** (dashboard, invoices, customers, reminders, analytics, raw materials, inventory, notifications, settings).

### Operations extras

- **Raw materials** and **suppliers** with analytics (GST summary, monthly spend, supplier/material views).
- **Inventory** lines with reorder logic tied into automation.
- **OCR bill scan**: upload image → **Tesseract.js** + Multer (`/api/ocr/scan`).

---

## Tech stack

| Layer    | Stack |
|----------|--------|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS, Recharts, Axios |
| Backend  | Node.js, Express 4 |
| Database | MongoDB (Mongoose 8) |
| AI       | Google Gemini API |
| Email    | Nodemailer (Gmail SMTP) |
| OCR      | Tesseract.js, Multer |

---

## Prerequisites

- **Node.js 18+**
- **MongoDB** (Atlas or local)
- **Gemini API key** ([Google AI Studio](https://aistudio.google.com/))
- **Gmail app password** (optional, for email) — [Google Account → App passwords](https://myaccount.google.com/apppasswords)

---

## Setup

### 1. Install dependencies

```bash
cd server
npm install
cd ../client
npm install
```

### 2. Environment variables

Create **`server/.env`** (do not commit real secrets):

```env
MONGO_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/DATABASE_NAME
JWT_SECRET=your_long_random_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000

# Production (Render): your Vercel site URL(s), comma-separated — required for browser API calls
CLIENT_ORIGIN=https://your-app.vercel.app

# Optional — allow any https://*.vercel.app (preview deploys). Use with care.
# ALLOW_VERCEL_PREVIEWS=true

# Optional — email (omit to skip sending)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Optional — referenced in some invoice/UPI flows if configured
UPI_ID=your_upi@bank
```

The API enables **CORS** for `http://localhost:5173` by default. In production, set **`CLIENT_ORIGIN`** to your Vercel URL(s), comma-separated (see [Deployment](#deployment)). The Vite dev server **proxies** `/api` to `http://localhost:5000` when **`VITE_API_URL`** is unset (see `client/vite.config.js`). For a production build, set **`VITE_API_URL`** to your Render API origin (no `/api` suffix).

### 3. Seed demo data

```bash
cd server
node seed.js
```

Creates a demo user and sample customers, invoices, and notifications (see `seed.js` for details).

### 4. Run the app

**Terminal 1 — API**

```bash
cd server
npm start
# or during development:
npm run dev
```

**Terminal 2 — client**

```bash
cd client
npm run dev
```

Open **http://localhost:5173**. Health check: **GET** `http://localhost:5000/api/health`.

---

## Demo credentials

After seeding:

| Field    | Value           |
|----------|-----------------|
| Email    | `demo@kirana.com` |
| Password | `demo1234`        |

---

## Demo simulation (terminal)

Exercise the reminder decision flow against seeded invoices:

```bash
cd server
node demoSimulation.js
```

---

## API overview

All `/api/*` routes except `GET /api/health` expect the JSON body where noted. Most routes require **`Authorization: Bearer <JWT>`** (login/register return the token; the client stores it in `localStorage`).

| Area | Method | Path | Notes |
|------|--------|------|--------|
| Health | GET | `/api/health` | No auth |
| Auth | POST | `/api/auth/register`, `/api/auth/login` | |
| Auth | PATCH | `/api/auth/activity`, `/api/auth/busy-mode` | Protected |
| Customers | GET, POST | `/api/customers` | Protected |
| Customers | GET, DELETE | `/api/customers/:id` | Protected |
| Customers | GET | `/api/customers/:id/health` | Health score |
| Invoices | GET, POST | `/api/invoices` | Protected |
| Invoices | GET, DELETE | `/api/invoices/:id` | Protected |
| Invoices | PATCH | `/api/invoices/:id/status` | Protected |
| Payments | POST | `/api/payments/webhook` | Body: `{ invoiceId }` — demo payment |
| Reminders | POST | `/api/reminders/evaluate/:invoiceId`, `/evaluate-all`, `/smart` | Protected |
| Reminders | POST | `/api/reminders/parse-voice` | Local parser |
| Analytics | GET | `/api/analytics/advanced`, `/top-customers`, `/payment-patterns`, `/products` | Protected |
| Insights | GET | `/api/insights` | Protected |
| Voice | POST | `/api/voice/parse` | Protected — `{ command }` |
| Notifications | GET | `/api/notifications`, `/notifications/unread-count` | Protected |
| Notifications | PATCH | `/api/notifications/:id/read`, `/notifications/read-all` | Protected |
| Raw materials | GET, POST | `/api/raw-materials` | Protected |
| Raw materials | GET | `/api/raw-materials/analytics/suppliers`, `.../materials`, `.../gst`, `.../monthly` | Protected |
| Inventory | GET, POST | `/api/inventory` | Protected |
| Inventory | PATCH, DELETE | `/api/inventory/:id` | Protected |
| Suppliers | GET, POST | `/api/suppliers` | Protected |
| Suppliers | DELETE | `/api/suppliers/:id` | Protected |
| OCR | POST | `/api/ocr/scan` | Protected — `multipart/form-data` image |

---

## Priority score engine (invoices)

Each invoice gets a numeric score (about 0–110) from overdue days, amount, and how often reminders were ignored:

| Factor | Points |
|--------|--------|
| 0 days overdue | 0 |
| 1–3 days | +10 |
| 4–7 days | +25 |
| 8–14 days | +40 |
| 15+ days | +60 |
| Amount < ₹1k | 0 |
| ₹1k–5k | +10 |
| ₹5k–10k | +20 |
| > ₹10k | +30 |
| ignored 0× | 0 |
| ignored 1–2× | +10 |
| ignored 3+× | +20 |

**0–20 = low · 21–50 = medium · 51+ = high** — higher scores feed stronger escalation in the smart reminder flow.

---

## Project structure

```
smart-invoicing-assistant/
├── client/                      # Vite + React
│   ├── public/
│   ├── src/
│   │   ├── App.jsx              # Routes: public + Layout-wrapped app
│   │   ├── components/          # Layout, Sidebar, …
│   │   ├── context/             # AuthContext (JWT, activity)
│   │   ├── pages/               # Landing, Login, Register, About, Dashboard, …
│   │   ├── services/api.js      # Axios client + API helpers
│   │   └── index.css
│   ├── vite.config.js           # Dev server + /api proxy
│   ├── vercel.json              # SPA rewrites for production
│   └── package.json
├── server/
│   ├── config/db.js
│   ├── controllers/             # auth, invoices, customers, analytics, …
│   ├── middleware/authMiddleware.js
│   ├── models/                  # User, Customer, Invoice, Notification, RawMaterial, Inventory, Supplier, …
│   ├── routes/                  # Express routers mounted in server.js
│   ├── services/                # automationEngine, reminderService, geminiService, emailService, inventoryService, …
│   ├── utils/voiceParser.js
│   ├── server.js                # App entry, cron-style interval
│   ├── seed.js
│   └── demoSimulation.js
├── render.yaml                  # Optional Render Blueprint (API)
└── README.md
```

---

## Team

Built for Hackathon 2026.
