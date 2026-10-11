import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const AdminLayout = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Outlet />
    </main>
  </div>
);

export default AdminLayout;
