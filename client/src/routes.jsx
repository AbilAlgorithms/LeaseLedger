import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';
import VerifyEmailPage from './pages/public/VerifyEmailPage';
import JoinTenancyPage from './pages/public/JoinTenancyPage';
import ProfilePage from './pages/shared/ProfilePage';
import DashboardPage from './pages/shared/DashboardPage';
import PropertiesPage from './pages/landlord/PropertiesPage';
import PropertyDetailPage from './pages/landlord/PropertyDetailPage';
import CreateTenancyPage from './pages/landlord/CreateTenancyPage';
import TenancyDetailPage from './pages/shared/TenancyDetailPage';
import InspectionWizardPage from './pages/shared/InspectionWizardPage';
import InspectionReviewPage from './pages/shared/InspectionReviewPage';

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
      <Route path="/join/:token" element={<JoinTenancyPage />} />

      {/* Authenticated Shared Pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenancies/:id"
        element={
          <ProtectedRoute>
            <TenancyDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Inspection Walkthrough & Review Pages */}
      <Route
        path="/tenancies/:id/inspections/:type"
        element={
          <ProtectedRoute>
            <InspectionWizardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenancies/:id/inspections/:type/review"
        element={
          <ProtectedRoute>
            <InspectionReviewPage />
          </ProtectedRoute>
        }
      />

      {/* Landlord Specific Pages */}
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
      <Route
        path="/tenancies/new"
        element={
          <ProtectedRoute roles={['LANDLORD']}>
            <CreateTenancyPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
