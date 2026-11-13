import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { homeFor } from "../ProtectedRoute";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: "bidder", name: "", email: "", phone: "", organization: "", idType: "national_id", idNumber: "", password: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const isBidder = form.role === "bidder";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = isBidder ? { ...form, acceptTerms: accepted } : { ...form, idNumber: undefined, idType: undefined };
      const user = await register(payload);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Kenyan national IDs are 7 or 8 digits. Passports mix letters and digits.
  const isPassport = form.idType === "passport";
  const idRule = isPassport
    ? { pattern: "[A-Za-z0-9]{6,9}", title: "Passport number: 6 to 9 letters or digits", hint: "6 to 9 letters or digits, e.g. A1234567" }
    : { pattern: "[0-9]{7,8}", title: "National ID: 7 or 8 digits only", hint: "7 or 8 digits only" };
  const passwordTitle =
    "Password should be 6 characters or more and include uppercase, lowercase, a number and a special character";

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

        {!isBidder && (
          <>
            <label className={label}>Organization</label>
            <input required value={form.organization} onChange={set("organization")} className={input} />
          </>
        )}

        <label className={label}>Email</label>
        <input type="email" required value={form.email} onChange={set("email")} className={input} />

        <label className={label}>Phone</label>
        <input required={isBidder} value={form.phone} onChange={set("phone")} className={input} />

        {isBidder && (
          <>
            <label className={label}>ID type</label>
            <select
              value={form.idType}
              onChange={(e) => setForm({ ...form, idType: e.target.value, idNumber: "" })}
              className={input}
            >
              <option value="national_id">National ID (Kenyan citizens)</option>
              <option value="passport">Passport</option>
            </select>

            <label className={label}>{isPassport ? "Passport number" : "National ID number"}</label>
            <input
              required value={form.idNumber} onChange={set("idNumber")}
              pattern={idRule.pattern} title={idRule.title}
              inputMode={isPassport ? "text" : "numeric"}
              placeholder={idRule.hint} className={input}
            />
          </>
        )}

        <label className={label}>Password</label>
        <input
          type="password" required value={form.password} onChange={set("password")}
          pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,72}"
          title={passwordTitle} className="mt-1 w-full rounded border border-slate-300 p-2"
        />
        <p className="mb-4 mt-1 text-xs text-slate-500">
          At least 6 characters, with uppercase, lowercase, a number and a special character.
        </p>

        {isBidder && (
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-800">Auction terms</p>
            <ul className="mb-2 list-disc space-y-1 pl-4">
              <li>Every bid you place is binding.</li>
              <li>Assets are sold as seen, where they are.</li>
              <li>The winning bidder pays the full amount to the auction firm before collecting the asset.</li>
              <li>Your account must be verified by the firm before you can bid.</li>
            </ul>
            <label className="flex items-start gap-2">
              <input
                type="checkbox" required checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5"
              />
              <span>I have read and accept the auction terms.</span>
            </label>
          </div>
        )}

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