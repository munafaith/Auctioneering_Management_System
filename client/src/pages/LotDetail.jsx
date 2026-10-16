import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import PublicLayout from "../components/PublicLayout";
import Countdown from "../components/Countdown";
import { kes, categoryLabel } from "../utils";

const dateTime = (d) =>
  new Date(d).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

function Fact({ label, children }) {
  return (
    <div className="mb-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{children || "Not provided"}</p>
    </div>
  );
}

export default function LotDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lot, setLot] = useState(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/lots/${id}`)
      .then((d) => {
        setLot(d.lot);
        setOffset(new Date(d.serverTime) - Date.now());
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (!lot) {
    return (
      <PublicLayout>
        {error ? (
          <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>
        ) : (
          <p className="text-slate-500">Loading...</p>
        )}
        <Link to="/" className="mt-4 inline-block text-sm text-slate-500">&larr; Back to auctions</Link>
      </PublicLayout>
    );
  }

  const live = lot.status === "live";
  const hasBids = live && lot.currentBid > 0;

  return (
    <PublicLayout>
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">&larr; Back to auctions</Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-slate-900">
        {lot.description}
        {lot.registration && ` (${lot.registration})`}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        {lot.lotNumber && `${lot.lotNumber} | `}{categoryLabel[lot.category]} | {lot.seller} repossession
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex h-72 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
            {categoryLabel[lot.category]} photo
          </div>
          <section className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Asset details</h2>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Fact label="Category">{categoryLabel[lot.category]}</Fact>
              <Fact label="Registration">{lot.registration}</Fact>
              <Fact label="Location">{lot.yardLocation}</Fact>
              <Fact label="Seller">{lot.seller}</Fact>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border bg-white p-6">
          {live ? (
            <p className="mb-2 rounded bg-red-50 p-2 text-center text-sm font-semibold text-red-700">
              Auction closes in <Countdown target={lot.auctionEnd} offset={offset} />
            </p>
          ) : (
            <p className="mb-2 rounded bg-amber-50 p-2 text-center text-sm font-semibold text-amber-800">
              Opens {dateTime(lot.auctionStart)}
            </p>
          )}

          <p className="mt-4 text-xs text-slate-500">{hasBids ? "Current highest bid" : "Starting bid"}</p>
          <p className="text-3xl font-bold text-slate-900">
            {kes(hasBids ? lot.currentBid : lot.startingBid)}
          </p>
          <p className="mb-4 mt-1 text-xs text-slate-500">
            Minimum increment {kes(lot.minIncrement)} | Closes {dateTime(lot.auctionEnd)}
          </p>

          {!user ? (
            <div className="space-y-2">
              <Link to="/login" className="block rounded bg-slate-900 p-2 text-center font-semibold text-white">
                Log in to bid
              </Link>
              <Link to="/register" className="block rounded border p-2 text-center font-semibold text-slate-700">
                Register as a bidder
              </Link>
            </div>
          ) : (
            <p className="rounded bg-slate-100 p-3 text-sm text-slate-600">
              The live bidding panel is built in the next step.
            </p>
          )}
        </aside>
      </div>
    </PublicLayout>
  );
}