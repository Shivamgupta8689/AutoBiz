# Smart Invoicing Assistant
> AI-powered invoicing and payment reminder system for small Indian businesses

---

## Problem
Small kirana stores, freelancers, and traders spend hours chasing overdue payments manually — sending WhatsApp messages one by one, forgetting follow-ups, and having no visibility into which customers consistently pay late.

## Solution
Smart Invoicing Assistant automates the entire reminder workflow using an AI context engine. It evaluates each invoice against 5 smart rules (paid, active user, ignored count, overdue days, business hours) and generates personalised Hinglish reminder messages via Google Gemini — with zero manual effort.

---

## Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS (dark theme)
- React Router v6
- Recharts (analytics charts)
- qrcode.react (UPI QR codes)
- jsPDF + jspdf-autotable (PDF export)
- Web Speech API (voice invoice input)

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication (bcryptjs)
- Google Gemini 1.5 Flash API (native https, no extra SDK)

---

## Features
- GST-compliant invoice creation with PDF export
- UPI QR code per invoice
- AI reminder engine: SUPPRESS / DELAY / SEND / ESCALATE decisions
- Multi-language reminders: Hinglish, English, Hindi, Marathi, Tamil
- Busy Mode: pause all reminders with one toggle
- AI Insights: Gemini-generated business insights on the dashboard
- Customer Health Score: 0–100 score per customer based on payment behaviour
- Voice invoice creation: speak "Create invoice for Raj 5000"
- Advanced analytics: top customers, products, payment patterns
- Activity tracking: respects owner's active/idle state before sending reminders

---

## How to Run

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key

### 1. Clone and install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment

Create `server/.env`:
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/smartinvoice
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

### 3. Seed demo data

```bash
cd server
node seed.js
```

### 4. Start both servers

```bash
# Terminal 1 — backend
cd server
node server.js

# Terminal 2 — frontend
cd client
npm run dev
```

App runs at: **http://localhost:5173**

---

## Demo Credentials
```
Email:    demo@kirana.com
Password: demo1234
```

---

## Demo Simulation (Terminal)

See the AI reminder engine make live decisions across all seed invoices:

```bash
cd server
node demoSimulation.js
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| PATCH | `/api/auth/activity` | Update user activity timestamp |
| GET | `/api/customers` | List customers |
| GET | `/api/customers/:id/health` | Customer health score (0-100) |
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice |
| PATCH | `/api/invoices/:id/status` | Update invoice status |
| POST | `/api/reminders/smart` | Run smart reminders (activity-aware) |
| POST | `/api/reminders/evaluate-all` | Basic reminder evaluation |
| GET | `/api/analytics/top-customers` | Top 5 customers by revenue |
| GET | `/api/analytics/payment-patterns` | On-time vs late payers |
| GET | `/api/analytics/products` | Top 5 most sold products |
| GET | `/api/insights` | AI-generated business insights |
| POST | `/api/voice/parse` | Parse voice command to invoice fields |

---

## Screenshots

### Dashboard
<!-- Add screenshot here -->

### Invoice List with QR Codes
<!-- Add screenshot here -->

### AI Reminder Engine Results
<!-- Add screenshot here -->

### Customer Health Scores
<!-- Add screenshot here -->

### Analytics
<!-- Add screenshot here -->

---

## Project Structure

```
Automation/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # Dashboard, Invoices, Customers, Reminders, Analytics, Settings
│       ├── components/     # Layout, Sidebar
│       ├── context/        # AuthContext (JWT + activity tracking)
│       └── services/       # API calls (axios)
└── server/                 # Node.js backend
    ├── models/             # User, Customer, Invoice (Mongoose schemas)
    ├── controllers/        # Auth, Invoice, Analytics, Insights, Voice
    ├── services/           # reminderService, automationEngine, geminiService
    ├── routes/             # Express routers
    ├── seed.js             # Demo data (10 invoices, 5 customers)
    └── demoSimulation.js   # Terminal demo of AI decision engine
```
