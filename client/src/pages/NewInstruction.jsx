import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ClientLayout from "../components/ClientLayout";
import StatusBadge from "../components/StatusBadge";

const categories = [
  ["motor_vehicle", "Motor Vehicle (Commercial / Private)"],
  ["machinery", "Machinery"],
  ["real_estate", "Real Estate / Land"],
  ["industrial_equipment", "Industrial Equipment"],
];

const inputClass = "mt-1 w-full rounded border border-slate-300 bg-white p-2";
const labelClass = "block text-sm font-medium text-slate-700";

function FileField({ label, required, file, onChange }) {
  return (
    <div className="mb-4">
      <label className={labelClass}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {file ? (
        <div className="mt-1 flex items-center justify-between rounded border border-slate-300 bg-slate-50 p-2 text-sm">
          <span className="truncate text-slate-700">
            {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-3 shrink-0 font-semibold text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white"
        />
      )}
    </div>
  );
}

export default function NewInstruction() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: "motor_vehicle",
    description: "",
    registration: "",
    yardLocation: "",
    loanBalance: "",
    proposedReserve: "",
  });
  const [files, setFiles] = useState({
    repossessionWarrant: null,
    logbook: null,
    valuationReport: null,
  });
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/instructions/mine")
      .then((d) => setRecent(d.instructions.slice(0, 4)))
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setFile = (field) => (f) => setFiles({ ...files, [field]: f });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!files.repossessionWarrant) {
      return setError("Please attach the repossession warrant or court order.");
    }

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    Object.entries(files).forEach(([k, f]) => f && data.append(k, f));

    setBusy(true);
    try {
      const { instruction } = await api("/instructions", { method: "POST", form: data });
      navigate("/client", { state: { submitted: instruction.caseRef } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ClientLayout>
      <h1 className="text-2xl font-bold text-slate-900">Submit New Auction Instruction</h1>
      <p className="mb-6 text-sm text-slate-500">
        Submit repossessed or distressed assets for review, valuation, and listing under the
        Auctioneers Act, Cap. 526.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="space-y-6 lg:col-span-2">
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <section className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">1. Asset and Repossession Details</h2>

            <label className={labelClass}>Asset Category</label>
            <select value={form.category} onChange={set("category")} className={`${inputClass} mb-4`}>
              {categories.map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>

            <label className={labelClass}>Asset Description</label>
            <input
              required value={form.description} onChange={set("description")}
              placeholder="e.g. 2021 Isuzu D-Max Double Cabin (KDF 210M)"
              className={`${inputClass} mb-4`}
            />

            {form.category === "motor_vehicle" && (
              <>
                <label className={labelClass}>Registration Number</label>
                <input
                  value={form.registration} onChange={set("registration")}
                  placeholder="e.g. KDD 120X" className={`${inputClass} mb-4`}
                />
              </>
            )}

            <label className={labelClass}>Current Storage / Yard Location</label>
            <input
              required value={form.yardLocation} onChange={set("yardLocation")}
              placeholder="e.g. NCBA Yard, Mombasa Road, Nairobi" className={inputClass}
            />
          </section>

          <section className="rounded-xl border bg-white p-6">
            <h2 className="mb-1 font-semibold text-slate-900">2. Legal and Repossession Documents</h2>
            <p className="mb-4 text-xs text-slate-500">PDF, JPG or PNG, up to 10 MB each.</p>
            <FileField
              label="Repossession Warrant / Court Order" required
              file={files.repossessionWarrant} onChange={setFile("repossessionWarrant")}
            />
            <FileField label="Logbook / Title Document" file={files.logbook} onChange={setFile("logbook")} />
            <FileField
              label="Valuation Report (if available)"
              file={files.valuationReport} onChange={setFile("valuationReport")}
            />
          </section>

          <section className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">3. Financial Valuation and Reserve Request</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Outstanding Loan Balance (KES)</label>
                <input
                  type="number" min="1" required value={form.loanBalance}
                  onChange={set("loanBalance")} className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Proposed Reserve Price (KES)</label>
                <input
                  type="number" min="1" required value={form.proposedReserve}
                  onChange={set("proposedReserve")} className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              disabled={busy}
              className="rounded bg-blue-600 px-6 py-2 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Submitting..." : "Submit Instruction"}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-3 font-semibold text-slate-900">What happens next</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Review and legal verification of your documents</li>
              <li>Valuation and reserve approval</li>
              <li>Auction scheduling and public listing</li>
            </ol>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-3 font-semibold text-slate-900">Recent cases</h2>
            {recent.length === 0 && <p className="text-sm text-slate-500">Nothing submitted yet.</p>}
            <ul className="space-y-3">
              {recent.map((c) => (
                <li key={c._id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{c.caseRef}</p>
                    <p className="text-xs text-slate-500">{c.description}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </ClientLayout>
  );
}