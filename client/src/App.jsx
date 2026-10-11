import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import RoleRoute from './components/layout/RoleRoute';
import StudentDashboard from './pages/student/StudentDashboard';
import ExamBriefing from './pages/student/ExamBriefing';
import ExamPlayer from './pages/student/ExamPlayer';
import ExamResult from './pages/student/ExamResult';
import FacultyLayout from './components/layout/FacultyLayout';
import ExamManager from './pages/faculty/ExamManager';
import QuestionBank from './pages/faculty/QuestionBank';
import ExamSubmissions from './pages/faculty/ExamSubmissions';
import AdminLayout from './components/layout/AdminLayout';
import UserManagement from './pages/admin/UserManagement';
import AuditLogExplorer from './pages/admin/AuditLogExplorer';
import Profile from './pages/Profile';
import Landing from './pages/Landing';
import PracticeExam from './pages/PracticeExam';
import { Spinner } from './components/ui';

/**
 * Protected Route wrapper
 * Ensures only authenticated users can view the children components
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Public Route wrapper (redirects authenticated users away from login)
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Profile Route */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Student Portal Routes */}
        <Route
          path="/student"
          element={
            <RoleRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/student/exams/:id/briefing"
          element={
            <RoleRoute allowedRoles={['STUDENT']}>
              <ExamBriefing />
            </RoleRoute>
          }
        />
        <Route
          path="/student/exams/:id/player"
          element={
            <RoleRoute allowedRoles={['STUDENT']}>
              <ExamPlayer />
            </RoleRoute>
          }
        />
        <Route
          path="/student/exams/:id/result"
          element={
            <RoleRoute allowedRoles={['STUDENT']}>
              <ExamResult />
            </RoleRoute>
          }
        />

        {/* Faculty Portal Routes */}
        <Route
          path="/faculty"
          element={
            <RoleRoute allowedRoles={['FACULTY', 'ADMIN']}>
              <FacultyLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="/faculty/exams" replace />} />
          <Route path="exams" element={<ExamManager />} />
          <Route path="questions" element={<QuestionBank />} />
          <Route path="exams/:id/submissions" element={<ExamSubmissions />} />
        </Route>

        {/* Admin Portal Routes */}
        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="audit-logs" element={<AuditLogExplorer />} />
        </Route>

        {/* Public landing page and browser-only practice paper */}
        <Route path="/" element={<Landing />} />
        <Route path="/practice" element={<PracticeExam />} />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
