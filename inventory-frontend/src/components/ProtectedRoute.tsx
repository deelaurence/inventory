import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isInitialized, initializeAuth } = useAuthStore();

  useEffect(() => {
    console.log('ProtectedRoute - Initializing auth');
    initializeAuth();
  }, [initializeAuth]);

  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated, 'isInitialized:', isInitialized);

  // Wait for initialization to complete
  if (!isInitialized) {
    console.log('ProtectedRoute - Not initialized yet, showing loading');
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
