import { useEffect, useState } from "react";
import { api } from "../api";
import PublicLayout from "../components/PublicLayout";
import { kes, categoryLabel, shortDate, photoUrl } from "../utils";

export default function PastResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/lots/results")
      .then((d) => setResults(d.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <h1 className="text-2xl font-bold text-slate-900">Past Results</h1>
      <p className="mb-6 text-sm text-slate-500">
        Final prices of recent auctions. Winners are shown by bidder number only, to protect their privacy.
      </p>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">Loading results...</p>}
      {!loading && !error && results.length === 0 && (
        <p className="rounded-xl border bg-white p-6 text-slate-500">No completed auctions yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {results.map((r) => (
          <div key={r.id} className="flex overflow-hidden rounded-xl border bg-white">
            <div className="h-auto w-32 shrink-0 bg-slate-200">
              {r.photo ? (
                <img src={photoUrl(r.id, r.photo)} alt={r.description} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-center text-xs text-slate-500">
                  {categoryLabel[r.category]}
                </div>
              )}
            </div>
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-400">{r.lotNumber}</p>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    r.sold ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {r.sold ? "SOLD" : "UNSOLD"}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900">
                {r.description}
                {r.registration && ` (${r.registration})`}
              </h3>
              <p className="text-sm text-slate-500">{r.seller} repossession</p>
              <div className="mt-3 text-sm">
                {r.sold ? (
                  <>
                    <p className="text-xl font-bold text-slate-900">{kes(r.finalPrice)}</p>
                    <p className="text-slate-500">
                      {r.bidCount} bids, won by {r.winnerNo ? `Bidder #${r.winnerNo}` : "a registered bidder"}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">No bids received. Starting bid {kes(r.startingBid)}.</p>
                )}
                <p className="text-xs text-slate-400">Closed {shortDate(r.endedAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PublicLayout>
  );
}
