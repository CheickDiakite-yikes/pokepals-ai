import { useState, useEffect } from 'react';
import { apiService, AuthUser } from '../services/apiService';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authUser = await apiService.checkAuth();
      setUser(authUser);
      setIsAuthenticated(!!authUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    apiService.login();
  };

  const logout = () => {
    apiService.logout();
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refetchUser: checkAuth,
  };
}
