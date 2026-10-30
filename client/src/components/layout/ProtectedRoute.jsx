import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-surface-container-lowest rounded-lg border border-error/30 text-center">
        <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="font-headline font-bold text-lg text-primary">Access Restricted</h2>
        <p className="text-sm text-on-surface-variant mt-2">
          This portal section requires {roles.join(' or ')} privileges. You are currently signed in as a{' '}
          <strong className="uppercase">{user.role}</strong>.
        </p>
        <div className="mt-6">
          <Link to="/dashboard">
            <Button variant="primary">Return to My Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
