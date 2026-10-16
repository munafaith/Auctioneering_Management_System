import { Link } from "react-router-dom";
import { kes, categoryLabel } from "../utils";
import Countdown from "./Countdown";

const dateTime = (d) =>
  new Date(d).toLocaleString("en-KE", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

export default function LotCard({ lot, offset }) {
  const live = lot.status === "live";
  const hasBids = live && lot.currentBid > 0;
  const price = hasBids ? lot.currentBid : lot.startingBid;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-white">
      <div className="relative flex h-44 items-center justify-center bg-slate-200 text-sm text-slate-500">
        {categoryLabel[lot.category]} photo
        <span
          className={`absolute left-3 top-3 rounded px-2 py-0.5 text-xs font-bold ${
            live ? "bg-red-600 text-white" : "bg-amber-400 text-slate-900"
          }`}
        >
          {live ? "LIVE AUCTION" : "UPCOMING"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {lot.lotNumber && <p className="text-xs font-semibold text-slate-400">{lot.lotNumber}</p>}
        <h3 className="font-semibold text-slate-900">
          {lot.description}
          {lot.registration && ` (${lot.registration})`}
        </h3>
        <p className="text-sm text-slate-500">{lot.seller} repossession</p>

        <div className="mt-4">
          <p className="text-xs text-slate-500">{hasBids ? "Current bid" : "Starting bid"}</p>
          <p className="text-xl font-bold text-slate-900">{kes(price)}</p>
          <p className="mt-1 text-xs font-medium text-amber-700">
            {live ? (
              <>Ends in <Countdown target={lot.auctionEnd} offset={offset} /></>
            ) : (
              <>Starts {dateTime(lot.auctionStart)}</>
            )}
          </p>
        </div>

        <Link
          to={`/lots/${lot.id}`}
          className="mt-4 rounded bg-slate-900 p-2 text-center text-sm font-semibold text-white"
        >
          {live ? "View Lot & Bid" : "View Details"}
        </Link>
      </div>
    </div>
  );
}