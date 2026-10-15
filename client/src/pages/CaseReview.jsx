import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, downloadDocument } from "../api";
import AdminLayout from "../components/AdminLayout";
import StatusBadge from "../components/StatusBadge";
import { kes, categoryLabel } from "../utils";

const docLabel = {
  repossession_warrant: "Repossession Warrant",
  logbook: "Logbook / Title",
  valuation_report: "Valuation Report",
  other: "Other Document",
};

const dateTime = (d) =>
  new Date(d).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const inputClass = "mt-1 w-full rounded border border-slate-300 bg-white p-2";
const labelClass = "block text-sm font-medium text-slate-700";

function Row({ label, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{children || "Not provided"}</p>
    </div>
  );
}

export default function CaseReview() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState({ approvedReserve: "", minIncrement: "", auctionStart: "", auctionEnd: "" });
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const load = async () => {
    const { instruction } = await api(`/instructions/${id}`);
    setC(instruction);
    return instruction;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let instruction = await load();
        // Opening a new case marks it as under review (an already-reviewed case just refuses, which is fine)
        if (instruction.status === "submitted") {
          try { await api(`/instructions/${id}/review`, { method: "PATCH" }); } catch { /* ignore */ }
          instruction = await load();
        }
        if (!cancelled) setD((prev) => ({ ...prev, approvedReserve: instruction.proposedReserve }));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const set = (field) => (e) => setD({ ...d, [field]: e.target.value });

  const approve = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(`/instructions/${id}/approve`, {
        method: "PATCH",
        body: {
          approvedReserve: Number(d.approvedReserve),
          minIncrement: Number(d.minIncrement),
          auctionStart: new Date(d.auctionStart).toISOString(),
          auctionEnd: new Date(d.auctionEnd).toISOString(),
        },
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setError("");
    setBusy(true);
    try {
      await api(`/instructions/${id}/reject`, { method: "PATCH", body: { reason } });
      setRejecting(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openDoc = async (doc) => {
    try {
      await downloadDocument(id, doc.filename, doc.originalName);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!c) {
    return (
      <AdminLayout>
        {error ? <p className="rounded bg-red-50 p-3 text-red-700">{error}</p> : <p className="text-slate-500">Loading...</p>}
      </AdminLayout>
    );
  }

  const decidable = ["submitted", "under_review"].includes(c.status);

  return (
    <AdminLayout>
      <Link to="/admin" className="text-sm text-slate-500 hover:text-slate-900">&larr; Back to Cases</Link>
      <div className="mb-6 mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Case Review: {c.caseRef}</h1>
        <StatusBadge status={c.status} />
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Asset &amp; Instruction Details</h2>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <Row label="Instructing Client">{c.client?.organization}{c.client?.name ? ` (${c.client.name})` : ""}</Row>
            <Row label="Asset Category">{categoryLabel[c.category]}</Row>
            <Row label="Asset Description">{c.description}</Row>
            <Row label="Registration">{c.registration}</Row>
            <Row label="Current Location">{c.yardLocation}</Row>
            <Row label="Outstanding Loan Balance">{kes(c.loanBalance)}</Row>
            <Row label="Client's Proposed Reserve">{kes(c.proposedReserve)}</Row>
            <Row label="Client Contact">{[c.client?.email, c.client?.phone].filter(Boolean).join(" | ")}</Row>
          </div>

          <h3 className="mb-2 mt-2 text-xs uppercase text-slate-500">Documents</h3>
          <ul className="space-y-2">
            {c.documents.map((doc) => (
              <li key={doc.filename} className="flex items-center justify-between rounded border p-3 text-sm">
                <span>
                  <span className="font-medium text-slate-900">{docLabel[doc.type]}</span>
                  <span className="ml-2 text-slate-500">{doc.originalName}</span>
                </span>
                <button onClick={() => openDoc(doc)} className="font-semibold text-blue-600 hover:underline">
                  Download
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Admin Determination</h2>

          {decidable && (
            <>
              <form onSubmit={approve}>
                <label className={labelClass}>Approved Reserve Price (KES)</label>
                <input type="number" min="1" required value={d.approvedReserve} onChange={set("approvedReserve")} className={`${inputClass} mb-4`} />

                <label className={labelClass}>Minimum Bid Increment (KES)</label>
                <input type="number" min="1" required value={d.minIncrement} onChange={set("minIncrement")} placeholder="e.g. 50000" className={`${inputClass} mb-4`} />

                <label className={labelClass}>Auction Starts</label>
                <input type="datetime-local" required value={d.auctionStart} onChange={set("auctionStart")} className={`${inputClass} mb-4`} />

                <label className={labelClass}>Auction Ends</label>
                <input type="datetime-local" required value={d.auctionEnd} onChange={set("auctionEnd")} className={`${inputClass} mb-4`} />

                <button disabled={busy} className="w-full rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50">
                  Approve &amp; Schedule Lot
                </button>
              </form>

              {!rejecting ? (
                <button
                  onClick={() => setRejecting(true)}
                  className="mt-3 w-full rounded border border-red-400 p-2 font-semibold text-red-600"
                >
                  Reject Instruction
                </button>
              ) : (
                <div className="mt-3">
                  <label className={labelClass}>Reason for rejection</label>
                  <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} mb-2`} />
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={reject} className="flex-1 rounded bg-red-600 p-2 font-semibold text-white disabled:opacity-50">
                      Confirm Rejection
                    </button>
                    <button onClick={() => setRejecting(false)} className="rounded border px-3">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}

          {c.status === "rejected" && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">
              Rejected. Reason: {c.rejectionReason}
            </p>
          )}

          {!decidable && c.status !== "rejected" && (
            <div className="text-sm">
              <Row label="Approved Reserve">{c.approvedReserve ? kes(c.approvedReserve) : ""}</Row>
              <Row label="Minimum Increment">{c.minIncrement ? kes(c.minIncrement) : ""}</Row>
              <Row label="Auction Starts">{c.auctionStart ? dateTime(c.auctionStart) : ""}</Row>
              <Row label="Auction Ends">{c.auctionEnd ? dateTime(c.auctionEnd) : ""}</Row>
            </div>
          )}
        </aside>
      </div>
    </AdminLayout>
  );
}