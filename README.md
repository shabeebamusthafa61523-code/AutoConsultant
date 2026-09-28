# RAZAIN-BENZ Auto Consultant & Driving School Management System

A full-stack **MERN** (MongoDB Atlas, Express.js, React + Vite, Node.js) enterprise application designed for driving schools and auto consultant businesses to manage Students, Batches, Classes, Enquiries, Payments, Expenses, Student Ledgers, and Daily Collections.

---

## 🌟 Key Features

- **Managing Director (MD) Executive Dashboard**: Real-time operational command centre with live financial metrics (Today's Collections, Operational Expenses, Total Students, Active Batches, Today's Classes, Pending Payments, Upcoming Tests).
- **Payment & Receipts Ledger**: Multi-method transaction ledger (Cash, UPI, Bank Transfer, Card) with customizable Payment Types manager (`+ Manage`).
- **Unified Printable Receipts with BENZ Logo**: Official computer-generated receipts with organization branding, candidate information, transaction details, and instant **Download PDF / Print** capabilities.
- **Student Ledger & Financial Statements**: Dedicated candidate financial portal (`/student-ledger`) allowing single-student lookups, payment history tracking, fee balance calculations, and downloadable statements.
- **Daily Collection & Cash Register**: End-of-Day cash drawer management (`/daily-collection`) with date controls, Cash vs Digital collection breakdowns, and printable EOD sheets.
- **Expenses & Expenditure Module**: Complete operational expenditure tracker (`/expenses`) for fuel, vehicle maintenance, salaries, RTO fees, and customizable expense categories.
- **Auto-Generated Sequential IDs**: Atomic sequence generators for Students (`STU-XXXX`), Receipts (`REC-XXXX`), Vouchers (`EXP-XXXX`), Complaints (`CMP-XXXX`), and Fees (`FEE-XXXX`).

---

## 📁 Project Structure

```text
d:/benz2/
├── client/                      # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/          # Reusable UI (Sidebar, Navbar, StatCard, ReceiptModal, DataTable, Modal)
│   │   ├── layouts/             # MainLayout navigation wrapper
│   │   ├── pages/               # MD Dashboard, Students, Batches, Classes, Enquiries, Payments, Student Ledger, Daily Collection, Expenses
│   │   ├── services/            # Axios API client & domain services (paymentService, expenseService, studentService, etc.)
│   │   ├── App.jsx              # React Router setup & protected routes
│   │   ├── index.css            # Tailwind CSS directives
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Node.js + Express.js API Backend
│   ├── config/                  # Mongoose MongoDB Atlas connection
│   ├── controllers/             # REST controllers (paymentController, expenseController, studentController, dashboardController, etc.)
│   ├── models/                  # Mongoose Schemas (Student, Payment, Expense, Batch, Class, Enquiry, Counter, User, AuditLog)
│   ├── routes/                  # Express Router endpoints
│   ├── middleware/              # Authentication & Error handler
│   ├── tests/                   # Automated API integration verification suites
│   ├── server.js                # Main server entry point
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup & Running Instructions

### 1. Backend Setup

```bash
cd server
npm install
node server.js
```
*The server runs on `http://localhost:5000`.*

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```
*The React application launches on `http://localhost:5173`.*

---

## ⚙️ Environment Configuration (`server/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/AUTOCONSULTANT?appName=Cluster0
JWT_SECRET=autoconsultant_jwt_secret_key_2026
CLIENT_URL=http://localhost:5173
```
