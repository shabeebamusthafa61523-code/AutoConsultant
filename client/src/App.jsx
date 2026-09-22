import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentListPage from './pages/Students/StudentListPage';
import StudentFormPage from './pages/Students/StudentFormPage';
import StudentDetailPage from './pages/Students/StudentDetailPage';
import BatchListPage from './pages/Batches/BatchListPage';
import BatchDetailPage from './pages/Batches/BatchDetailPage';
import ClassListPage from './pages/Classes/ClassListPage';
import EnquiryListPage from './pages/Enquiries/EnquiryListPage';
import PaymentListPage from './pages/Payments/PaymentListPage';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Application Routes */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/students" element={<ProtectedRoute><StudentListPage /></ProtectedRoute>} />
            <Route path="/students/add" element={<ProtectedRoute><StudentFormPage /></ProtectedRoute>} />
            <Route path="/students/:id" element={<ProtectedRoute><StudentDetailPage /></ProtectedRoute>} />
            <Route path="/students/:id/edit" element={<ProtectedRoute><StudentFormPage /></ProtectedRoute>} />

            {/* Batch Routes */}
            <Route path="/batches" element={<ProtectedRoute><BatchListPage /></ProtectedRoute>} />
            <Route path="/batches/:id" element={<ProtectedRoute><BatchDetailPage /></ProtectedRoute>} />

            {/* Class Routes */}
            <Route path="/classes" element={<ProtectedRoute><ClassListPage /></ProtectedRoute>} />

            {/* Enquiry Routes */}
            <Route path="/enquiries" element={<ProtectedRoute><EnquiryListPage /></ProtectedRoute>} />

            {/* Payment Routes */}
            <Route path="/payments" element={<ProtectedRoute><PaymentListPage /></ProtectedRoute>} />

            {/* Users Route */}
            <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />

            {/* Fallback Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
