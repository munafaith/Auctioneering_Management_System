import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../api";
import Countdown from "./Countdown";
import { kes, dateTimeSeconds, timeOnly } from "../utils";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const HAS_BIDS = ["live", "closed", "unsold", "payment_cleared", "completed"];
const WATCHED = ["scheduled", ...HAS_BIDS];

export default function BidHistory({ id, status, closesAt, offset = 0, onLotStatus }) {
  const [bids, setBids] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [connected, setConnected] = useState(false);

  const show = HAS_BIDS.includes(status);
  const watch = WATCHED.includes(status);
  const live = status === "live";

  // Keep the newest callback without restarting the live connection
  const statusCb = useRef(onLotStatus);
  statusCb.current = onLotStatus;

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await api(`/monitor/${id}/bids`);
      setBids(d.bids);
      setError("");
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  // Load the history whenever the panel becomes relevant
  useEffect(() => {
    if (show) load();
  }, [show, load]);

  // Live connection: a new bid refreshes the table, a status change refreshes the whole case
  useEffect(() => {
    if (!watch) return;
    const socket = io(SOCKET_URL);
    socket.on("connect", () => {
      socket.emit("lot:join", id);
      setConnected(true);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("bid:new", () => load());
    socket.on("lot:status", () => {
      load();
      statusCb.current?.();
    });
    return () => socket.disconnect();
  }, [id, watch, load]);

  // Safety net: if the live connection ever drops, still refresh every 15 seconds while live
  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [live, load]);

  if (!show) return null;

  const topLabel = live ? "Leading" : "Winner";

  return (
    <section className="mt-6 rounded-xl border bg-white p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-900">Bidding activity</h2>
          {live && (
            <span className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
              Closes in <Countdown target={closesAt} offset={offset} />
            </span>
          )}
          {live && (
            <span className={`text-xs font-semibold ${connected ? "text-green-600" : "text-slate-400"}`}>
              {connected ? "● Live" : "○ Connecting..."}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && <span className="text-xs text-slate-400">Updated {timeOnly(updatedAt)}</span>}
          <button
            onClick={load}
            disabled={refreshing}
            className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white active:scale-95 disabled:cursor-wait disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Real bidder identities are visible to the firm only. The public sees "Bidder #" aliases.
      </p>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!bids && !error && <p className="text-sm text-slate-500">Loading...</p>}
      {bids && bids.length === 0 && (
        <p className="text-sm text-slate-500">
          {live ? "No bids yet. New bids will appear here automatically." : "No bids were placed on this lot."}
        </p>
      )}

      {bids && bids.length > 0 && (
        <div className="overflow-hidden rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Bidder</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b, i) => (
                <tr key={b.id} className={`border-t ${i === 0 ? "bg-green-50" : ""}`}>
                  <td className="p-3 text-slate-600">{dateTimeSeconds(b.at)}</td>
                  <td className="p-3">
                    <span className="font-medium text-slate-900">{b.bidder?.name || "Unknown"}</span>
                    {b.bidder?.bidderNo && (
                      <span className="ml-2 text-xs text-slate-500">Bidder #{b.bidder.bidderNo}</span>
                    )}
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {topLabel}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {b.bidder?.email}
                    {b.bidder?.phone && <span className="block">{b.bidder.phone}</span>}
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-900">{kes(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}