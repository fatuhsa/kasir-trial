# 🛒 Kasir Rental App 🛴
A high-performance, offline-first Point of Sale (POS) system built with React, Vite, and Supabase. Tailored specifically for rental businesses (scooters, strollers, etc.) requiring precise timer tracking, shift management, and bulletproof offline synchronization.

---

## ✨ Key Features

### ⚡ Offline-First Architecture & Anti-Zombie Sync
The app is built to survive internet dropouts without losing a single transaction.
- **Local Storage Buffer:** Transactions and active sessions are seamlessly cached locally.
- **Anti-Zombie Sync:** Implements strict `_synced` flagging and `mergeSyncData` logic to ensure deleted data on the cloud doesn't get resurrected as "ghost/zombie" data when local state merges back. 

### ⏱️ Precision Overtime (OT) Tracking
No more human error when calculating overtime penalties.
- **Grace Period (10m 59s):** Customers get an automatic, mathematically-guaranteed free pass if they return items before hitting 11 minutes late.
- **Half-Hour vs Full-Hour:** Automatically calculates `Half OT` (11-40 mins) and `Full OT` (41-60 mins).
- **Multi-Hour Loops:** Works flawlessly across any number of overdue hours.

### 🔄 Split-Bill & Partial Returns
Allows returning items dynamically! 
- If a group rents 3 Scooters but returns 1 early, the app correctly splits the invoice.
- Auto-calculates proportional overtime for the partial items without disrupting the ongoing rental timer for the rest.

### 🛡️ Auto-Logout & Shift Management
- **Date-based Auto-Logout:** System strictly bounds a cashier's session to a calendar day. If the date rolls over, the shift is safely terminated to prevent human tracking errors.
- **Shift Queue Numbering:** Automated tracking of queue numbers per shift.

### 📊 Real-Time Tracking & History
- Built-in UI to view ongoing rentals with live-updating timers (flashing red when overdue).
- Beautiful History Dashboard covering Daily Incomes, Expenses, and Net Profits.
- **Dark/Light Mode** consistent theming with premium native CSS designs.

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite
- **Styling:** Vanilla CSS (Zero heavy UI frameworks for maximum speed)
- **Database & Sync:** Supabase (PostgreSQL + Realtime Subscriptions)
- **Testing:** Vitest + React Testing Library (Strictly driven by **Test-Driven Development / TDD**)

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/fatuhsa/kasir-trial.git
cd kasir-trial
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Tests
The core business logics (like Overtime Rules and Sync Merging) are thoroughly unit-tested.
```bash
npm run test
```

---

## 🏗️ Core Algorithms

### The TDD-Proven Overtime Logic
```javascript
export function calcOT(elapsedMin, limitMin) {
  const actualOver = elapsedMin - limitMin;
  if (actualOver < 0 || Math.floor(actualOver) < 11) return { otFull: 0, otHalf: 0 };

  let otFull = Math.floor(actualOver / 60);
  let otHalf = 0;
  const floorRem = Math.floor(actualOver % 60);

  if (floorRem >= 11 && floorRem <= 40) otHalf = 1;
  else if (floorRem > 40) otFull += 1;

  return { otFull, otHalf };
}
```

---
*Built with ❤️ and Test-Driven Development.*
