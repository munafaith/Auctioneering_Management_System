import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import ClientLayout from "../components/ClientLayout";
import StatusBadge from "../components/StatusBadge";
import { kes, shortDate, categoryLabel } from "../utils";

export default function ClientHome() {
  const location = useLocation();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/instructions/mine")
      .then((d) => setCases(d.instructions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ClientLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Instructions</h1>
          <p className="text-sm text-slate-500">Track every asset you have submitted for auction.</p>
        </div>
        <Link to="/client/new" className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          + New Instruction
        </Link>
      </div>

      {location.state?.submitted && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">
          Instruction submitted. Your case reference is <strong>{location.state.submitted}</strong>.
        </p>
      )}
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4">Case Ref</th>
              <th className="p-4">Asset</th>
              <th className="p-4">Reserve (KES)</th>
              <th className="p-4">Status</th>
              <th className="p-4">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="5" className="p-6 text-slate-500">Loading...</td></tr>
            )}
            {!loading && cases.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-slate-500">
                  No instructions yet. <Link to="/client/new" className="font-semibold text-slate-900">Submit your first one.</Link>
                </td>
              </tr>
            )}
            {cases.map((c) => (
              <tr key={c._id} className="border-t">
                <td className="p-4 font-semibold">{c.caseRef}</td>
                <td className="p-4">
                  {c.description}
                  <p className="text-xs text-slate-500">{categoryLabel[c.category]}</p>
                </td>
                <td className="p-4">{kes(c.approvedReserve ?? c.proposedReserve)}</td>
                <td className="p-4">
                  <StatusBadge status={c.status} />
                  {c.status === "rejected" && c.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">{c.rejectionReason}</p>
                  )}
                </td>
                <td className="p-4 text-slate-500">{shortDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ClientLayout>
  );
}