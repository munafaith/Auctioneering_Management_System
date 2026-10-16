import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { homeFor } from "../ProtectedRoute";

export default function PublicLayout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold text-slate-900">LotLink</Link>
          <nav className="hidden gap-6 text-sm font-medium sm:flex">
            <NavLink to="/" end className="text-slate-900">Browse Auctions</NavLink>
            <span className="cursor-not-allowed text-slate-400">Past Results</span>
            <span className="cursor-not-allowed text-slate-400">How It Works</span>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                {user.role !== "bidder" && (
                  <Link to={homeFor(user.role)} className="font-semibold text-slate-900">My portal</Link>
                )}
                <span className="text-slate-500">{user.name}</span>
                <button onClick={logout} className="rounded border px-3 py-1 hover:bg-slate-100">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="font-medium text-slate-700">Log in</Link>
                <Link to="/register" className="rounded bg-slate-900 px-3 py-1.5 font-semibold text-white">
                  Register as Bidder
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}