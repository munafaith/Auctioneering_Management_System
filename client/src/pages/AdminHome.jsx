import { useAuth } from "../AuthContext";

export default function AdminHome() {
  const { user, logout } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin Console</h1>
      <p className="mt-2 text-slate-600">Welcome, {user.name} ({user.staffTitle})</p>
      <button onClick={logout} className="mt-4 rounded bg-slate-900 px-4 py-2 text-white">Log out</button>
    </div>
  );
}