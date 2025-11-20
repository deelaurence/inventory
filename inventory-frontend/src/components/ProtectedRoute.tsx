import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Loader from './Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isInitialized, initializeAuth, user, token } = useAuthStore();

  useEffect(() => {
    console.log('[ProtectedRoute] Component mounted, initializing auth');
    initializeAuth();
  }, [initializeAuth]);

  console.log('[ProtectedRoute] Render check - isAuthenticated:', isAuthenticated, 'isInitialized:', isInitialized, 'hasUser:', !!user, 'hasToken:', !!token);
  console.log('[ProtectedRoute] localStorage check - user:', !!localStorage.getItem('user'), 'token:', !!localStorage.getItem('token'));

  // Wait for initialization to complete
  if (!isInitialized) {
    console.log('[ProtectedRoute] Not initialized yet, showing loading');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Initializing..." color="blue" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.warn('[ProtectedRoute] Not authenticated, redirecting to login');
    console.warn('[ProtectedRoute] Current state:', { isAuthenticated, isInitialized, hasUser: !!user, hasToken: !!token });
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] User authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;
