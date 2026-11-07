import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import AdminLayout from "../components/AdminLayout";
import StatusBadge from "../components/StatusBadge";
import { kes } from "../utils";

export default function Settlement() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/settlement")
      .then((d) => setCases(d.cases))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const count = (status) => cases.filter((c) => c.status === status).length;
  const cards = [
    ["Awaiting Payment", count("closed")],
    ["Handover Due", count("payment_cleared")],
    ["Completed", count("completed")],
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Settlement &amp; Handover</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {cards.map(([label, n]) => (
          <div key={label} className="rounded-xl border bg-white p-5 text-center">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{n}</p>
          </div>
        ))}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4">Case / Lot</th>
              <th className="p-4">Asset</th>
              <th className="p-4">Seller</th>
              <th className="p-4">Buyer</th>
              <th className="p-4">Winning Bid</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="p-6 text-slate-500">Loading...</td></tr>}
            {!loading && cases.length === 0 && (
              <tr><td colSpan="7" className="p-6 text-slate-500">No sold lots to settle yet.</td></tr>
            )}
            {cases.map((c) => (
              <tr key={c._id} className="border-t">
                <td className="p-4 font-semibold">
                  {c.caseRef}
                  {c.lotNumber && <span className="block text-xs font-normal text-slate-500">{c.lotNumber}</span>}
                </td>
                <td className="p-4">{c.description}</td>
                <td className="p-4">{c.client?.organization || c.client?.name}</td>
                <td className="p-4">
                  {c.winner ? `${c.winner.name} (Bidder #${c.winner.bidderNo})` : "No winner recorded"}
                </td>
                <td className="p-4">{kes(c.winningBid)}</td>
                <td className="p-4"><StatusBadge status={c.status} /></td>
                <td className="p-4">
                  <Link
                    to={`/admin/settlement/${c._id}`}
                    className={`rounded px-3 py-1.5 text-xs font-semibold ${
                      c.status !== "completed" ? "bg-slate-900 text-white" : "border text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.status !== "completed" ? "Settle" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}