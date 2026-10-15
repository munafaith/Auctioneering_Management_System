import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";

const active = ({ isActive }) =>
  `block rounded px-3 py-2 text-sm font-medium ${
    isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
  }`;
const soon = "block cursor-not-allowed rounded px-3 py-2 text-sm text-slate-500";

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 p-5">
        <h1 className="text-xl font-bold text-white">LotLink</h1>
        <p className="mb-8 text-xs text-slate-400">Admin Console</p>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={active}>Case Instructions</NavLink>
          <span className={soon}>Lots &amp; Auctions (soon)</span>
          <span className={soon}>Bidding Monitor (soon)</span>
          <span className={soon}>Settlement &amp; Handover (soon)</span>
          <span className={soon}>Reports (soon)</span>
        </nav>
        <div className="mt-auto border-t border-slate-700 pt-4 text-sm">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="mb-3 text-xs text-slate-400">{user.staffTitle}</p>
          <button onClick={logout} className="rounded border border-slate-600 px-3 py-1 text-slate-300 hover:bg-slate-800">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}