import useAuth from '../hooks/useAuth';
import { Navigate, Outlet } from 'react-router-dom';

const RequireAuth = () => {
  const { user } = useAuth();
  
  // If no user, redirect to login
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default RequireAuth;