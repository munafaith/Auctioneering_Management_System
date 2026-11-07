import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import PublicLayout from "../components/PublicLayout";
import { kes, dateTime } from "../utils";

const steps = ["Won", "Payment confirmed", "Collected"];
const stage = { closed: 0, payment_cleared: 1, completed: 2 };

export default function MyWins() {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/settlement/mine")
      .then((d) => setWins(d.wins))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <h1 className="text-2xl font-bold text-slate-900">My Wins</h1>
      <p className="mb-6 text-sm text-slate-500">Lots you have won, and where each one stands.</p>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">Loading...</p>}
      {!loading && wins.length === 0 && !error && (
        <p className="rounded-xl border bg-white p-6 text-slate-500">
          You have not won any lots yet. <Link to="/" className="font-semibold text-slate-900">Browse auctions.</Link>
        </p>
      )}

      <div className="space-y-6">
        {wins.map((w) => {
          const at = stage[w.status] ?? 0;
          return (
            <div key={w.id} className="rounded-xl border bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  {w.lotNumber && <p className="text-xs font-semibold text-slate-400">{w.lotNumber}</p>}
                  <h2 className="text-lg font-semibold text-slate-900">
                    {w.description}{w.registration ? ` (${w.registration})` : ""}
                  </h2>
                  <p className="text-sm text-slate-500">{w.seller} repossession | {w.yardLocation}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{w.status === "closed" ? "Amount payable" : "Amount paid"}</p>
                  <p className="text-2xl font-bold text-slate-900">{kes(w.winningBid)}</p>
                </div>
              </div>

              <ol className="my-5 grid grid-cols-3 gap-2 text-center text-xs">
                {steps.map((label, i) => (
                  <li key={label}>
                    <div className={`mx-auto mb-1 h-2 rounded-full ${i <= at ? "bg-green-500" : "bg-slate-200"}`} />
                    <span className={i <= at ? "font-semibold text-slate-900" : "text-slate-400"}>{label}</span>
                  </li>
                ))}
              </ol>

              {w.status === "closed" && (
                <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
                  Congratulations, you won this lot. Please pay {kes(w.winningBid)} to the auction firm using the
                  payment details they send you, and quote {w.lotNumber || "the lot number"} as your reference.
                  The firm will confirm here once your payment is received.
                </p>
              )}
              {w.status === "payment_cleared" && (
                <p className="rounded bg-green-50 p-3 text-sm text-green-800">
                  Payment confirmed{w.paidAt ? ` on ${dateTime(w.paidAt)}` : ""}. You can now collect the asset from
                  {" "}{w.yardLocation}. Bring your national ID.
                </p>
              )}
              {w.status === "completed" && (
                <p className="rounded bg-slate-100 p-3 text-sm text-slate-700">
                  Collected{w.collectedAt ? ` on ${dateTime(w.collectedAt)}` : ""}. This sale is complete.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PublicLayout>
  );
}