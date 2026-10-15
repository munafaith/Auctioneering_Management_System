import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const homeFor = (role) =>
  role === "admin" ? "/admin" : role === "client" ? "/client" : "/";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-slate-500">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return children;
}