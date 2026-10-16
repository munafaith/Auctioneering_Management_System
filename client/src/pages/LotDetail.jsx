import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import PublicLayout from "../components/PublicLayout";
import Countdown from "../components/Countdown";
import { kes, categoryLabel } from "../utils";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const dateTime = (d) =>
  new Date(d).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const timeOnly = (d) =>
  new Date(d).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

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
  const [bids, setBids] = useState([]);
  const [offset, setOffset] = useState(0);
  const [myNo, setMyNo] = useState(user?.bidderNo ?? null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  // Load the lot, load recent bids, then listen for live updates
  useEffect(() => {
    let active = true;

    const loadLot = () =>
      api(`/lots/${id}`).then((d) => {
        if (!active) return;
        setLot(d.lot);
        setOffset(new Date(d.serverTime) - Date.now());
      });

    loadLot().catch((e) => active && setError(e.message));
    api(`/lots/${id}/bids`)
      .then((d) => active && setBids(d.bids))
      .catch(() => {});

    const socket = io(SOCKET_URL);
    socket.on("connect", () => {
      socket.emit("lot:join", id); // join this lot's room
      setConnected(true);
    });
    socket.on("disconnect", () => setConnected(false));

    // Someone placed a bid: update price, count, leader and the activity feed
    socket.on("bid:new", (p) => {
      setLot((prev) =>
        prev && { ...prev, currentBid: p.currentBid, bidCount: p.bidCount, leadingBidderNo: p.leadingBidderNo }
      );
      setBids((prev) => (prev.some((b) => b.id === p.bid.id) ? prev : [p.bid, ...prev].slice(0, 10)));
    });

    // The auction opened or closed: reload the lot to show the new state
    socket.on("lot:status", () => loadLot().catch(() => {}));

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [id]);

  // The lowest bid currently allowed
  const minNext = lot ? (lot.bidCount === 0 ? lot.startingBid : lot.currentBid + lot.minIncrement) : 0;

  // Keep the amount box at or above the minimum, even when someone else just outbid you
  useEffect(() => {
    setAmount((a) => (Number(a) < minNext ? String(minNext) : a));
  }, [minNext]);

  const placeBid = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const d = await api(`/lots/${id}/bids`, { method: "POST", body: { amount: Number(amount) } });
      setMyNo(d.bidderNo);
      setLot((prev) => ({
        ...prev,
        currentBid: d.currentBid,
        bidCount: d.bidCount,
        leadingBidderNo: d.leadingBidderNo,
      }));
      setBids((prev) => (prev.some((b) => b.id === d.bid.id) ? prev : [d.bid, ...prev].slice(0, 10)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

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

  const isOpen = lot.status === "live";
  const isUpcoming = lot.status === "scheduled";
  const isUnsold = lot.status === "unsold";
  const isSold = ["closed", "payment_cleared", "handed_over", "completed"].includes(lot.status);
  const hasBids = lot.bidCount > 0;
  const iLead = myNo && lot.leadingBidderNo === myNo;
  const steps = [0, 1, 2].map((k) => minNext + k * lot.minIncrement);

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

        <aside className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            {/* Status banner */}
            {isOpen && (
              <p className="mb-2 rounded bg-red-50 p-2 text-center text-sm font-semibold text-red-700">
                Auction closes in <Countdown target={lot.auctionEnd} offset={offset} />
              </p>
            )}
            {isUpcoming && (
              <p className="mb-2 rounded bg-amber-50 p-2 text-center text-sm font-semibold text-amber-800">
                Opens {dateTime(lot.auctionStart)}
              </p>
            )}
            {(isSold || isUnsold) && (
              <p className="mb-2 rounded bg-slate-100 p-2 text-center text-sm font-semibold text-slate-700">
                Auction ended {dateTime(lot.auctionEnd)}
              </p>
            )}

            {/* The price */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {isSold ? "Winning bid" : hasBids ? "Current highest bid" : "Starting bid"}
              </p>
              {isOpen && (
                <span className={`text-xs font-semibold ${connected ? "text-green-600" : "text-slate-400"}`}>
                  {connected ? "● Live" : "○ Connecting..."}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {kes(isSold ? lot.winningBid ?? lot.currentBid : hasBids ? lot.currentBid : lot.startingBid)}
            </p>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              {hasBids && `${lot.bidCount} bid${lot.bidCount === 1 ? "" : "s"} | `}
              Minimum increment {kes(lot.minIncrement)}
            </p>

            {hasBids && isOpen && (
              <p className={`mb-4 rounded p-2 text-center text-sm font-semibold ${iLead ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-600"}`}>
                {iLead ? "You are the highest bidder" : `Leading: Bidder #${lot.leadingBidderNo}`}
              </p>
            )}

            {/* Open auction: who can bid */}
            {isOpen && !user && (
              <div className="space-y-2">
                <Link to="/login" className="block rounded bg-slate-900 p-2 text-center font-semibold text-white">
                  Log in to bid
                </Link>
                <Link to="/register" className="block rounded border p-2 text-center font-semibold text-slate-700">
                  Register as a bidder
                </Link>
              </div>
            )}

            {isOpen && user && user.role !== "bidder" && (
              <p className="rounded bg-slate-100 p-3 text-sm text-slate-600">
                Only registered bidders can place bids. You are logged in as {user.role}.
              </p>
            )}

            {isOpen && user?.role === "bidder" && (
              <form onSubmit={placeBid}>
                <p className="mb-2 text-sm font-medium text-slate-700">Your next bid</p>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {steps.map((v) => (
                    <button
                      type="button" key={v} onClick={() => setAmount(String(v))}
                      className="rounded-full border px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {v.toLocaleString("en-KE")}
                    </button>
                  ))}
                </div>
                <div className="mb-3 flex items-center rounded border border-slate-300">
                  <span className="bg-slate-50 px-3 text-sm text-slate-500">KES</span>
                  <input
                    type="number" min={minNext} required value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 outline-none"
                  />
                </div>
                {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
                <button
                  disabled={busy}
                  className="w-full rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Placing bid..." : `Place Bid of ${kes(Number(amount) || minNext)}`}
                </button>
                <p className="mt-2 text-center text-xs text-slate-400">
                  By placing a bid, you agree to the auction terms.
                </p>
              </form>
            )}

            {/* Not open yet / finished */}
            {isUpcoming && (
              <p className="rounded bg-slate-100 p-3 text-sm text-slate-600">
                Bidding opens {dateTime(lot.auctionStart)}. Register now so you are ready.
              </p>
            )}
            {isSold && (
              <p className={`rounded p-3 text-sm font-semibold ${iLead ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                {iLead
                  ? "Congratulations, you won this lot. The auction firm will contact you about payment."
                  : `Sold to Bidder #${lot.leadingBidderNo}.`}
              </p>
            )}
            {isUnsold && (
              <p className="rounded bg-slate-100 p-3 text-sm text-slate-600">
                This auction closed with no bids and the lot was not sold.
              </p>
            )}
          </div>

          {/* Live bid activity */}
          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-3 font-semibold text-slate-900">Live bid activity</h2>
            {bids.length === 0 && <p className="text-sm text-slate-500">No bids yet.</p>}
            <ul className="space-y-1">
              {bids.map((b, i) => (
                <li
                  key={b.id}
                  className={`flex items-center justify-between rounded p-2 text-sm ${i === 0 ? "bg-green-50" : ""}`}
                >
                  <span>
                    {b.alias}
                    {myNo && b.alias === `Bidder #${myNo}` ? " (You)" : ""}
                    <span className="block text-xs text-slate-400">{timeOnly(b.at)}</span>
                  </span>
                  <span className="font-semibold text-slate-900">{kes(b.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
}