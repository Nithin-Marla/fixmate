import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  // The auth API returns a single `role` field; tolerate legacy arrays too.
  const userRole = Array.isArray(user.roles) ? user.roles[0] : user.role;

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" replace />; // Redirect to default page if wrong role
  }

  return children;
}
