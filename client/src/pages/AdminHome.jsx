import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import AdminLayout from "../components/AdminLayout";
import StatusBadge from "../components/StatusBadge";
import { kes } from "../utils";

const cards = [
  ["active", "Active Cases"],
  ["pendingReview", "Pending Review"],
  ["live", "Live Auctions"],
  ["pendingHandover", "Pending Handover"],
];

export default function AdminHome() {
  const [data, setData] = useState({ counts: {}, instructions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/instructions")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Auction Case Management</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, label]) => (
          <div key={key} className="rounded-xl border bg-white p-5 text-center">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{data.counts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4">Case Ref</th>
              <th className="p-4">Client / Bank</th>
              <th className="p-4">Asset Details</th>
              <th className="p-4">Reserve (KES)</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="p-6 text-slate-500">Loading...</td></tr>}
            {!loading && data.instructions.length === 0 && (
              <tr><td colSpan="6" className="p-6 text-slate-500">No cases yet.</td></tr>
            )}
            {data.instructions.map((c) => {
              const needsReview = ["submitted", "under_review"].includes(c.status);
              return (
                <tr key={c._id} className="border-t">
                  <td className="p-4 font-semibold">{c.caseRef}</td>
                  <td className="p-4">{c.client?.organization || c.client?.name}</td>
                  <td className="p-4">{c.description}</td>
                  <td className="p-4">{kes(c.approvedReserve ?? c.proposedReserve)}</td>
                  <td className="p-4"><StatusBadge status={c.status} /></td>
                  <td className="p-4">
                    <Link
                      to={`/admin/cases/${c._id}`}
                      className={`rounded px-3 py-1.5 text-xs font-semibold ${
                        needsReview ? "bg-slate-900 text-white" : "border text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {needsReview ? "Review" : "View"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}