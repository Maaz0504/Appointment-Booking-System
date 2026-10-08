# 📅 Appointment Booking System

A lightweight, production-clean, full-stack appointment scheduling application built for a **45-minute hands-on workshop**. 

It demonstrates practical full-stack integration with **React**, **Node.js (Express)**, **SQLite** (built-in `node:sqlite`), and passwordless phone verification using **[Minimoth API](https://minimoth.dev)**.

---

## 🎯 Workshop Scope & Constraints Adherence

| Category | Strict Workshop Constraint | Implementation |
| :--- | :--- | :--- |
| **Frontend Pages** | Maximum 3 pages | **1. Auth/Login**, **2. Book Appointment**, **3. My Appointments** |
| **Backend Endpoints**| Maximum 5 endpoints | **5 clean REST endpoints** (OTP Send, OTP Verify, Services, Book/Cancel, User Appointments) |
| **Database Entities**| Maximum 3 models | **1. User**, **2. Service**, **3. Appointment** (SQLite) |
| **Auth Provider** | Minimoth API | WhatsApp & SMS OTP via `api.minimoth.dev` |

---

## 🏗️ Architecture Overview

```
appointment-booking-system/
├── backend/
│   ├── .env                 # Backend config with MINIMOTH_API_KEY
│   ├── .env.example         # Template for environment variables
│   ├── package.json         # Minimal dependencies: express, dotenv
│   ├── db.js                # SQLite init & auto-seeding (node:sqlite)
│   └── server.js            # Express API (5 endpoints)
├── frontend/
│   ├── .env                 # Frontend API URL configuration
│   ├── .env.example         # Template for frontend config
│   ├── package.json         # React 19 + Vite
│   ├── vite.config.js       # Vite proxy configuration
│   ├── index.html           # Modern typography & meta tags
│   └── src/
│       ├── main.jsx         # App mounting
│       ├── App.jsx          # Root view state & navigation
│       ├── index.css        # Clean, modern dark UI styling
│       ├── api.js           # Lightweight fetch client
│       └── components/
│           ├── Navbar.jsx            # Brand & session status
│           ├── AuthPage.jsx          # Page 1: Minimoth OTP Login/Register
│           ├── BookPage.jsx          # Page 2: Service & Slot Selection
│           └── MyAppointmentsPage.jsx# Page 3: View & Cancel Appointments
├── package.json             # Root runner scripts
└── README.md                # Workshop documentation & guide
```

---

## 🔌 5 Backend API Endpoints

1. **`POST /api/auth/send-otp`**
   - **Body:** `{ "phone": "+919876543210" }`
   - Dispatches a 6-digit OTP to the user's phone via Minimoth (`POST https://api.minimoth.dev/v1/otp/send`).
2. **`POST /api/auth/verify-otp`**
   - **Body:** `{ "phone": "+919876543210", "code": "123456", "name": "Alex" }`
   - Verifies the OTP via Minimoth (`POST https://api.minimoth.dev/v1/otp/verify`).
   - Automatically registers or logs in the user and saves them in the SQLite `users` table.
3. **`GET /api/services`**
   - Returns the list of medical/wellness services, durations, and pricing from SQLite.
4. **`POST /api/appointments`**
   - **To Book:** `{ "userId": 1, "serviceId": 2, "appointmentDate": "2026-10-15", "timeSlot": "10:00 AM", "notes": "Checkup" }`
   - **To Cancel:** `{ "action": "cancel", "appointmentId": 1, "userId": 1 }`
5. **`GET /api/appointments?userId=1`**
   - Retrieves all past and upcoming appointments for the authenticated user with joined service details.

---

## 🗄️ 3 Database Entities (SQLite)

* **`users`**: `id`, `phone` (unique), `name`, `created_at`
* **`services`**: `id`, `name`, `duration_minutes`, `price`, `description` (pre-seeded with 4 standard healthcare services)
* **`appointments`**: `id`, `user_id`, `service_id`, `appointment_date`, `time_slot`, `status`, `notes`, `created_at`

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** v22 or higher (Node 24 recommended, which includes built-in `node:sqlite` and native `fetch`)
- Free API key from **[minimoth.dev](https://minimoth.dev)** (optional for local testing)

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies (only express and dotenv)
npm install

# Configure environment variables
# Copy .env.example to .env
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
MINIMOTH_API_KEY=your_minimoth_api_key_here
MINIMOTH_BASE_URL=https://api.minimoth.dev
```

> 💡 **Workshop Demo Mode:**
> If `MINIMOTH_API_KEY` is not set or kept as `your_minimoth_api_key_here`, the backend automatically runs in **Demo Mode**. You can enter test OTP **`123456`** on the login screen to verify and test without waiting for SMS delivery. When a real key is provided, real OTPs are delivered via WhatsApp / SMS!

Start the backend:
```bash
npm start
# Server starts at http://localhost:5000
```

---

### 3. Frontend Setup

In a new terminal window:
```bash
cd frontend

# Install dependencies (React + Vite)
npm install

# Configure environment variables (optional, defaults to http://localhost:5000/api)
cp .env.example .env

# Run Vite dev server
npm run dev
# Open http://localhost:5173 in your browser
```

---

## 📱 Application Flow (3 Pages)

1. **Page 1: Auth & Login (`AuthPage`)**
   - Enter your phone number (and optional name).
   - Click **Send OTP via Minimoth**.
   - Input the 6-digit code received on your phone (or `123456` in demo mode).
   - Instant verification and session creation.

2. **Page 2: Book Appointment (`BookPage`)**
   - Browse service cards with duration and fee.
   - Pick an appointment date (date picker with past-date disabled).
   - Select a convenient time slot chip (e.g., `10:00 AM`, `02:00 PM`).
   - Add optional notes/symptoms and click **Confirm Appointment**.

3. **Page 3: My Appointments (`MyAppointmentsPage`)**
   - View your scheduled bookings with live status indicators (`Confirmed` / `Cancelled`).
   - One-click cancellation for scheduled appointments.
   - Direct button to book another appointment.

---

## 🛡️ Input Validation & Error Handling

- **Phone validation:** Ensures minimum 10 digits and formats international dial codes (+91 prefix by default).
- **OTP code validation:** Requires exact 6-digit numeric input.
- **Booking validation:** Verifies user existence, valid service ID, mandatory appointment date, and time slot.
- **Friendly feedback:** In-app visual alerts (danger/success/info) display API responses clearly to the user.

---

## 📄 License
MIT
