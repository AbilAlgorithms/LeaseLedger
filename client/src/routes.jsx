import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';
import VerifyEmailPage from './pages/public/VerifyEmailPage';
import ProfilePage from './pages/shared/ProfilePage';
import PropertiesPage from './pages/landlord/PropertiesPage';
import PropertyDetailPage from './pages/landlord/PropertyDetailPage';

function DashboardDispatcher() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
      <h1 className="text-2xl font-bold font-headline text-primary">Overview Dashboard</h1>
      <p className="text-sm text-on-surface-variant">Connecting your property and handover workflows...</p>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

      {/* Authenticated Shared Pages */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardDispatcher />
          </ProtectedRoute>
        }
      />

      {/* Landlord Property Management Pages */}
      <Route
        path="/properties"
        element={
          <ProtectedRoute roles={['LANDLORD']}>
            <PropertiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/properties/:id"
        element={
          <ProtectedRoute>
            <PropertyDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
