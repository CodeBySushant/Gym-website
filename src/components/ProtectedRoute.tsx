import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  user: UserProfile | null;
  requiredRole?: UserRole;
  children: React.ReactNode;
}

export default function ProtectedRoute({ user, requiredRole, children }: ProtectedRouteProps) {
  useEffect(() => {
    if (user && requiredRole && user.role !== requiredRole) {
      toast.error('Invalid access: You do not have permission to access this area.');
    }
  }, [user, requiredRole]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
