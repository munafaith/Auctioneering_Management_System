import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { homeFor } from "../ProtectedRoute";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: "bidder", name: "", email: "", phone: "", organization: "", password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await register(form);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input = "mb-4 mt-1 w-full rounded border border-slate-300 p-2";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
        <p className="mb-6 text-sm text-slate-500">Join LotLink</p>

        {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <label className={label}>I am a</label>
        <select value={form.role} onChange={set("role")} className={input}>
          <option value="bidder">Bidder (I want to bid on items)</option>
          <option value="client">Client (a bank or institution submitting items)</option>
        </select>

        <label className={label}>Full name</label>
        <input required value={form.name} onChange={set("name")} className={input} />

        {form.role === "client" && (
          <>
            <label className={label}>Organization</label>
            <input required value={form.organization} onChange={set("organization")} className={input} />
          </>
        )}

        <label className={label}>Email</label>
        <input type="email" required value={form.email} onChange={set("email")} className={input} />

        <label className={label}>Phone</label>
        <input value={form.phone} onChange={set("phone")} className={input} />

        <label className={label}>Password (6+ characters)</label>
        <input type="password" required minLength={6} value={form.password} onChange={set("password")} className={input} />

        <button
          disabled={busy}
          className="w-full rounded bg-slate-900 p-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating..." : "Create account"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Have an account? <Link to="/login" className="font-semibold text-slate-900">Log in</Link>
        </p>
      </form>
    </div>
  );
}