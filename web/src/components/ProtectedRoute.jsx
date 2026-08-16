/**
 * Guards protected frontend content while authentication is restored.
 */

import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/**
 * Renders its children only for residents who are allowed to see them.
 *
 * @param {object} props Component props.
 * @param {import('react').ReactNode} props.children Content rendered when access is allowed.
 * @param {string} [props.role] Role required on top of being signed in.
 * @returns {JSX.Element} A loading message, redirect or the protected content.
 */
export default function ProtectedRoute({ children, role }) {
  const { isSignedIn, isRestoring, resident } = useAuth();
  const location = useLocation();

  if (isRestoring) {
    return <p className="state state--loading">Restoring your session…</p>;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role && resident.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
