import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

const HOME_BY_ROLE = {
  STUDENT: '/student',
  FACULTY: '/faculty/exams',
  ADMIN: '/admin/users'
};

// Sends each signed-in user to their own home screen.
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const home = HOME_BY_ROLE[user?.role];
    if (home) navigate(home, { replace: true });
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Opening your workspace" />
    </div>
  );
};

export default Dashboard;
