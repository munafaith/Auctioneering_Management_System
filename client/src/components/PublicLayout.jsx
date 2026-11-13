import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { homeFor } from "../ProtectedRoute";

export default function PublicLayout({ children }) {
  const { user, logout, refresh } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  const pending = user?.role === "bidder" && !user.isVerified;

  const check = async () => {
    setChecking(true);
    try {
      const u = await refresh();
      setStillPending(!u.isVerified);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold text-slate-900">LotLink</Link>
          <nav className="hidden gap-6 text-sm font-medium sm:flex">
            <NavLink to="/" end className="text-slate-900">Browse Auctions</NavLink>
            {user?.role === "bidder" && (
              <NavLink to="/my-wins" className="text-slate-900">My Wins</NavLink>
            )}
            <NavLink to="/results" className="text-slate-900">Past Results</NavLink>
            <NavLink to="/how-it-works" className="text-slate-900">How It Works</NavLink>
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

      {pending && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm text-amber-900">
            <p>
              <span className="font-semibold">Your account is awaiting verification.</span>{" "}
              You can browse lots now, and bid as soon as the auction firm approves your account.
              {stillPending && <span className="ml-2 font-semibold">Still pending.</span>}
            </p>
            <button
              onClick={check}
              disabled={checking}
              className="rounded border border-amber-400 px-3 py-1 font-semibold transition hover:bg-amber-900 hover:text-white disabled:opacity-60"
            >
              {checking ? "Checking..." : "Check status"}
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}