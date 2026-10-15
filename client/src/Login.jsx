import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { homeFor } from "../ProtectedRoute";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">LotLink</h1>
        <p className="mb-6 text-sm text-slate-500">Log in to your account</p>

        {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mb-4 mt-1 w-full rounded border border-slate-300 p-2"
        />
        <label className="block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="mb-6 mt-1 w-full rounded border border-slate-300 p-2"
        />
        <button
          disabled={busy}
          className="w-full rounded bg-slate-900 p-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link to="/register" className="font-semibold text-slate-900">Register</Link>
        </p>
      </form>
    </div>
  );
}