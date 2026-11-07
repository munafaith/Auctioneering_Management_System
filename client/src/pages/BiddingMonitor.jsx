import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../api";
import AdminLayout from "../components/AdminLayout";
import Countdown from "../components/Countdown";
import { kes, dateTime } from "../utils";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function BiddingMonitor() {
  const [data, setData] = useState({ live: [], upcoming: [] });
  const [offset, setOffset] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef(null);

  const load = useCallback(
    () =>
      api("/monitor/live")
        .then((d) => {
          setData({ live: d.live, upcoming: d.upcoming });
          setOffset(new Date(d.serverTime) - Date.now());
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  );

  // One live connection for the whole page. Any bid or status change reloads the table,
  // and a slow refresh catches lots that have just opened.
  useEffect(() => {
    load();
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("bid:new", load);
    socket.on("lot:status", load);
    const timer = setInterval(load, 15000);
    return () => {
      clearInterval(timer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [load]);

  // Listen to the room of every live lot (joining twice is harmless)
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const join = () => data.live.forEach((l) => s.emit("lot:join", l.id));
    join();
    s.on("connect", join);
    return () => s.off("connect", join);
  }, [data.live, connected]);

  const totalBids = data.live.reduce((n, l) => n + l.bidCount, 0);
  const cards = [
    ["Live Auctions", data.live.length],
    ["Bids on Live Lots", totalBids],
    ["Upcoming Lots", data.upcoming.length],
  ];

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bidding Monitor</h1>
        <span className={`text-sm font-semibold ${connected ? "text-green-600" : "text-slate-400"}`}>
          {connected ? "● Live updates on" : "○ Connecting..."}
        </span>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {cards.map(([label, n]) => (
          <div key={label} className="rounded-xl border bg-white p-5 text-center">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{n}</p>
          </div>
        ))}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <h2 className="mb-2 font-semibold text-slate-900">Live auctions</h2>
      <div className="mb-8 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4">Lot / Case</th>
              <th className="p-4">Asset</th>
              <th className="p-4">Current Bid</th>
              <th className="p-4">Bids</th>
              <th className="p-4">Leading Bidder</th>
              <th className="p-4">Closes In</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="p-6 text-slate-500">Loading...</td></tr>}
            {!loading && data.live.length === 0 && (
              <tr><td colSpan="7" className="p-6 text-slate-500">No auctions are live right now.</td></tr>
            )}
            {data.live.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-4 font-semibold">
                  {l.lotNumber || l.caseRef}
                  <span className="block text-xs font-normal text-slate-500">{l.caseRef}</span>
                </td>
                <td className="p-4">
                  {l.description}
                  <span className="block text-xs text-slate-500">{l.seller}</span>
                </td>
                <td className="p-4">
                  {l.bidCount > 0 ? (
                    <span className="font-semibold">{kes(l.currentBid)}</span>
                  ) : (
                    <span className="text-slate-500">No bids yet (starts {kes(l.startingBid)})</span>
                  )}
                </td>
                <td className="p-4">{l.bidCount}</td>
                <td className="p-4">
                  {l.leader ? (
                    <>
                      {l.leader.name}
                      <span className="block text-xs text-slate-500">
                        Bidder #{l.leader.bidderNo}{l.leader.phone ? ` | ${l.leader.phone}` : ""}
                      </span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-4 font-medium text-red-700">
                  <Countdown target={l.auctionEnd} offset={offset} />
                </td>
                <td className="p-4">
                  <Link to={`/admin/cases/${l.id}`} className="rounded border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Open case
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 font-semibold text-slate-900">Upcoming</h2>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4">Lot / Case</th>
              <th className="p-4">Asset</th>
              <th className="p-4">Starting Bid</th>
              <th className="p-4">Opens</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading && data.upcoming.length === 0 && (
              <tr><td colSpan="5" className="p-6 text-slate-500">Nothing scheduled.</td></tr>
            )}
            {data.upcoming.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-4 font-semibold">{l.lotNumber || l.caseRef}</td>
                <td className="p-4">{l.description}</td>
                <td className="p-4">{kes(l.startingBid)}</td>
                <td className="p-4">{dateTime(l.auctionStart)}</td>
                <td className="p-4">
                  <Link to={`/admin/cases/${l.id}`} className="rounded border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Open case
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