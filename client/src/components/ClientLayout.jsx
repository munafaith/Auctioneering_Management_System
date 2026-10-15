import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const linkClass = ({ isActive }) =>
  `border-b-2 pb-3 text-sm font-medium ${
    isActive
      ? "border-slate-900 text-slate-900"
      : "border-transparent text-slate-500 hover:text-slate-900"
  }`;

export default function ClientLayout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-end justify-between px-6 pt-4">
          <div className="flex items-end gap-8">
            <Link to="/client" className="pb-3 text-xl font-bold text-slate-900">LotLink</Link>
            <nav className="flex gap-6">
              <NavLink to="/client" end className={linkClass}>Dashboard</NavLink>
              <NavLink to="/client/new" className={linkClass}>Submit New Instruction</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4 pb-3 text-sm">
            <div className="text-right">
              <p className="font-semibold text-slate-900">{user.organization}</p>
              <p className="text-xs text-slate-500">{user.name}</p>
            </div>
            <button onClick={logout} className="rounded border px-3 py-1 text-slate-700 hover:bg-slate-100">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}