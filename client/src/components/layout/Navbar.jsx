import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../../api/notification.api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Bell, User, LogOut, Home, FileText, Settings, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isLandlord, isTenant, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const res = await notificationApi.getNotifications({ limit: 1 });
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30s
  });

  const unreadCount = notifData?.meta?.unreadCount || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = isAuthenticated
    ? [
        { label: 'Dashboard', path: '/dashboard', icon: Home },
        ...(isLandlord ? [{ label: 'Properties', path: '/properties', icon: FileText }] : []),
        ...(isAdmin ? [{ label: 'Admin Console', path: '/admin', icon: Settings }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-brass font-bold font-headline text-sm shadow-sm">
              LL
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-primary tracking-tight text-lg leading-tight">
                LeaseLedger
              </span>
              <span className="text-[10px] font-mono text-outline uppercase tracking-wider hidden sm:inline">
                Verifiable Rental Ledger
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Role Indicator */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface-container-low rounded border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant">Role:</span>
                <Badge
                  variant={isLandlord ? 'landlord' : isTenant ? 'tenant' : 'admin'}
                  size="sm"
                >
                  {user.role}
                </Badge>
                <span className="text-xs font-medium text-primary ml-1 truncate max-w-[120px]">
                  {user.name}
                </span>
              </div>

              {/* Notifications Link with unread badge */}
              <Link
                to="/notifications"
                className="relative p-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-damage text-white text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-surface">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile Link */}
              <Link
                to="/profile"
                className="p-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                title="Profile & Settings"
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:inline-flex text-error hover:bg-error/10 hover:text-error"
                icon={LogOut}
              >
                Logout
              </Button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-on-surface-variant"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t border-outline-variant/30 bg-surface-container-lowest px-4 py-3 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <span className="text-sm font-semibold">{user.name}</span>
            <Badge variant={isLandlord ? 'landlord' : isTenant ? 'tenant' : 'admin'} size="sm">
              {user.role}
            </Badge>
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-on-surface hover:bg-surface-container"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/notifications"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded text-sm text-on-surface hover:bg-surface-container"
          >
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-damage text-white font-mono text-[10px]">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded text-sm text-on-surface hover:bg-surface-container"
          >
            Profile & GDPR Data
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="w-full text-left px-3 py-2 rounded text-sm text-error hover:bg-error/10"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
