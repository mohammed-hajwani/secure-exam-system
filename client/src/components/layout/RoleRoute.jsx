import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui';

/**
 * Route wrapper that restricts access based on authenticated user's role
 *
 * @param {Array<string>} allowedRoles - e.g. ['STUDENT']
 */
const RoleRoute = ({ children, allowedRoles }) => {
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to root or dashboard based on role
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleRoute;
