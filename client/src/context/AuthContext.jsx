import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { setAccessToken } from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSetAuth = (userData, token) => {
    setUser(userData);
    setTokenState(token);
    setAccessToken(token);
  };

  const handleClearAuth = () => {
    setUser(null);
    setTokenState(null);
    setAccessToken(null);
  };

  // Silent session restore on app load
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const res = await authApi.refresh();
        if (isMounted && res.data?.data) {
          handleSetAuth(res.data.data.user, res.data.data.accessToken);
        }
      } catch (err) {
        handleClearAuth();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();

    const handleSessionExpired = () => {
      handleClearAuth();
      toast.error('Session expired. Please log in again.');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const { user: userData, accessToken: token } = res.data.data;
    handleSetAuth(userData, token);
    toast.success(`Welcome back, ${userData.name}!`);
    return userData;
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    toast.success(res.data.message || 'Registration successful!');
    return res.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      handleClearAuth();
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (data) => {
    const res = await authApi.updateProfile(data);
    setUser(res.data.data);
    toast.success('Profile updated');
    return res.data.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLandlord: user?.role === 'LANDLORD',
        isTenant: user?.role === 'TENANT',
        isAdmin: user?.role === 'ADMIN',
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
