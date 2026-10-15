import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Home() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="rounded-xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">LotLink</h1>
        <p className="mt-2 text-slate-600">Public auction catalog coming soon.</p>
        <div className="mt-4 space-x-4 text-sm font-semibold">
          {user ? (
            <button onClick={logout}>Log out ({user.name})</button>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}