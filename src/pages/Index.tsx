import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Auth />;
}
