import { useEffect, useState } from "react";
import { api } from "../api";
import AdminLayout from "../components/AdminLayout";
import { kes } from "../utils";

const stageLabel = {
  submitted: "Submitted", under_review: "Under review", rejected: "Rejected", scheduled: "Scheduled",
  live: "Live", closed: "Sold, awaiting payment", unsold: "Unsold", payment_cleared: "Payment cleared",
  handed_over: "Handed over", completed: "Completed",
};

const Tile = ({ label, value, note }) => (
  <div className="rounded-xl border bg-white p-4">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
  </div>
);

export default function Reports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/reports/summary").then(setD).catch((e) => setError(e.message));
  }, []);

  const max = d ? Math.max(1, ...Object.values(d.byStage)) : 1;

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
      <p className="mb-6 text-sm text-slate-500">A summary of the firm's cases, sales and collections.</p>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!d && !error && <p className="text-slate-500">Loading...</p>}

      {d && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Total cases" value={d.totalCases} />
            <Tile label="Total sales value" value={kes(d.totalSales)} note={`${d.sold} lots sold`} />
            <Tile
              label="Sell through rate"
              value={d.sellThrough === null ? "No data" : `${d.sellThrough}%`}
              note={`${d.sold} sold, ${d.unsold} unsold`}
            />
            <Tile label="Average bids per lot" value={d.avgBids} />
            <Tile label="Payments received" value={kes(d.paid)} />
            <Tile label="Awaiting payment" value={kes(d.awaitingPayment)} note="Sold, payment not yet recorded" />
            <Tile label="Verified bidders" value={d.bidders.verified} />
            <Tile label="Bidders pending" value={d.bidders.pending} note="Awaiting admin verification" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Cases by stage</h2>
              <div className="space-y-2">
                {Object.entries(d.byStage).map(([stage, n]) => (
                  <div key={stage} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 text-slate-600">{stageLabel[stage]}</span>
                    <div className="h-4 flex-1 rounded bg-slate-100">
                      <div className="h-4 rounded bg-slate-800" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                    <span className="w-6 text-right font-semibold text-slate-900">{n}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Results per client</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    <th className="py-2">Client</th>
                    <th className="py-2 text-right">Cases</th>
                    <th className="py-2 text-right">Sold</th>
                    <th className="py-2 text-right">Unsold</th>
                    <th className="py-2 text-right">Sales value</th>
                  </tr>
                </thead>
                <tbody>
                  {d.perClient.map((c) => (
                    <tr key={c.client} className="border-b last:border-0">
                      <td className="py-2 font-medium text-slate-900">{c.client}</td>
                      <td className="py-2 text-right">{c.cases}</td>
                      <td className="py-2 text-right">{c.sold}</td>
                      <td className="py-2 text-right">{c.unsold}</td>
                      <td className="py-2 text-right">{kes(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
