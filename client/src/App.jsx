import React from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-surface text-on-surface antialiased">
        <Navbar />
        <main className="flex-1">
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
