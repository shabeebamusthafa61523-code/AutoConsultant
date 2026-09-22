# Auto Consultant / Driving School Management System

A full-stack **MERN** (MongoDB Atlas, Express.js, React + Vite, Node.js) application designed for driving schools and auto consultant businesses to manage Students, Batches, Classes, Enquiries, and Payments cleanly without hardcoded data.

---

## Key Features

- **Dynamic Analytics Dashboard**: Calculates real-time metrics directly from MongoDB Atlas (Total Students, New Enquiries, Active Batches, Today's Classes, Pending Payments, Upcoming Tests).
- **Auto-Generated Student IDs**: Sequential ID generation (`STU-0001`, `STU-0002`, etc.) managed atomically by MongoDB.
- **Form Sections & Live Fee Math**: Student creation divided into 6 clear sections with live dynamic balance calculations (`Balance = Total Fee - Paid - Advance`).
- **Dynamic Batch Enrolment**: Shows live enrolled student count per batch directly computed from MongoDB.
- **Enquiry to Student Conversion**: One-click conversion from Enquiry to active Student record with auto-linked references.
- **Class & Payment Tracking**: Student detail profile displays full Class History and Payment History with instant quick-add actions.

---

## Project Structure

```text
d:/BENZ/
├── client/                      # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/          # Reusable UI (Sidebar, Navbar, StatCard, Table, Modal, etc.)
│   │   ├── layouts/             # MainLayout navigation wrapper
│   │   ├── pages/               # Dashboard, Students, Batches, Classes, Enquiries, Payments
│   │   ├── services/            # Axios API client & domain services
│   │   ├── App.jsx              # React Router setup
│   │   ├── index.css            # Tailwind CSS directives
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                      # Node.js + Express.js API Backend
│   ├── config/                  # Mongoose MongoDB Atlas connection
│   ├── controllers/             # REST controllers for all modules
│   ├── models/                  # Mongoose Schemas (Student, Batch, Class, Enquiry, Payment, Counter)
│   ├── routes/                  # Express Router endpoints
│   ├── middleware/              # Centralized error handler
│   ├── utils/                   # Student ID sequence generator & DB seed script
│   ├── .env                     # MongoDB URI & server configuration
│   ├── server.js                # Main server entry point
│   └── package.json
│
└── README.md
```

---

## Setup & Running Instructions

### 1. Backend Setup

```bash
cd server
npm install
npm start
```
*The server will run on `http://localhost:5000`.*

#### Optional Data Seeding:
To populate sample data into MongoDB Atlas:
```bash
npm run seed
```

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```
*The React app will launch on `http://localhost:5173`.*

---

## Environment Variables (`server/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/AUTOCONSULTANT?appName=Cluster0
CLIENT_URL=http://localhost:5173
```
