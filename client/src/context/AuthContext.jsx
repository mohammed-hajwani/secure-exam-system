import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken as setGlobalAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Attempt silent session restore on mount using the HttpOnly refresh token cookie
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.post('/auth/refresh');
        const token = response.data.accessToken;
        const userData = response.data.user;

        setGlobalAccessToken(token);
        setAccessTokenState(token);
        setUser(userData);
      } catch (err) {
        // No active session or cookie expired
        setGlobalAccessToken(null);
        setAccessTokenState(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Log in user with credentials
   */
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.requiresOtp) {
        return response.data;
      }

      const token = response.data.accessToken;
      const userData = response.data.user;

      // Store in memory ONLY (never localStorage)
      setGlobalAccessToken(token);
      setAccessTokenState(token);
      setUser(userData);

      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Login failed. Please check your credentials.';
      const err = new Error(message);
      err.response = error.response;
      throw err;
    }
  };

  /**
   * Verify 6-digit OTP code to complete 2FA authentication
   */
  const verifyOtp = async (tempToken, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { tempToken, otp });
      const token = response.data.accessToken;
      const userData = response.data.user;

      setGlobalAccessToken(token);
      setAccessTokenState(token);
      setUser(userData);

      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'OTP verification failed.';
      const err = new Error(message);
      err.response = error.response;
      throw err;
    }
  };

  /**
   * Resend OTP code for active 2FA session
   */
  const resendOtp = async (tempToken) => {
    try {
      const response = await api.post('/auth/resend-otp', { tempToken });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to resend code.';
      const err = new Error(message);
      err.response = error.response;
      throw err;
    }
  };

  /**
   * Log out user and revoke session cookie
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      // Clear in-memory auth state
      setGlobalAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
    }
  };

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: !!user && !!accessToken,
    login,
    verifyOtp,
    resendOtp,
    logout
  };


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
