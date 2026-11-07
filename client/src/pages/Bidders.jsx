import { useEffect, useState } from "react";
import { api } from "../api";
import AdminLayout from "../components/AdminLayout";
import { dateTime } from "../utils";

export default function Bidders() {
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api("/bidders")
      .then((d) => {
        setBidders(d.bidders);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const setVerified = async (id, verified) => {
    setBusyId(id);
    try {
      await api(`/bidders/${id}/verify`, { method: "PATCH", body: { verified } });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  // Pending bidders first
  const sorted = [...bidders].sort((a, b) => Number(a.isVerified) - Number(b.isVerified));
  const pending = bidders.filter((b) => !b.isVerified).length;

  const cards = [
    ["Pending Verification", pending],
    ["Verified Bidders", bidders.length - pending],
    ["All Bidders", bidders.length],
  ];

  return (
    <AdminLayout>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Bidders</h1>
      <p className="mb-6 text-sm text-slate-500">
        Check each bidder's name and ID number against their identity documents before verifying. Only verified
        bidders can place bids.
      </p>

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
              <th className="p-4">Bidder</th>
              <th className="p-4">Contact</th>
              <th className="p-4">ID / Passport</th>
              <th className="p-4">Registered</th>
              <th className="p-4">Bids</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="p-6 text-slate-500">Loading...</td></tr>}
            {!loading && bidders.length === 0 && (
              <tr><td colSpan="7" className="p-6 text-slate-500">No bidders have registered yet.</td></tr>
            )}
            {sorted.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-4">
                  <span className="font-semibold text-slate-900">{b.name}</span>
                  {b.bidderNo && <span className="block text-xs text-slate-500">Bidder #{b.bidderNo}</span>}
                </td>
                <td className="p-4 text-xs text-slate-600">
                  {b.email}
                  {b.phone && <span className="block">{b.phone}</span>}
                </td>
                <td className="p-4">{b.idNumber || <span className="text-slate-400">Not provided</span>}</td>
                <td className="p-4 text-slate-600">{dateTime(b.createdAt)}</td>
                <td className="p-4">{b.bidCount}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      b.isVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {b.isVerified ? "Verified" : "Pending"}
                  </span>
                </td>
                <td className="p-4">
                  {b.isVerified ? (
                    <button
                      disabled={busyId === b.id}
                      onClick={() => setVerified(b.id, false)}
                      className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                    >
                      {busyId === b.id ? "Saving..." : "Revoke"}
                    </button>
                  ) : (
                    <button
                      disabled={busyId === b.id}
                      onClick={() => setVerified(b.id, true)}
                      className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      {busyId === b.id ? "Saving..." : "Verify"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}