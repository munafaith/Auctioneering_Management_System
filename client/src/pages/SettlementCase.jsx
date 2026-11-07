import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, downloadSettlementFile } from "../api";
import AdminLayout from "../components/AdminLayout";
import StatusBadge from "../components/StatusBadge";
import DateTimeField from "../components/DateTimeField";
import FileField from "../components/FileField";
import { kes, dateTime } from "../utils";

const methodLabel = {
  bank_wire: "Direct Bank Wire (RTGS / Swift)",
  mpesa: "M-Pesa",
  cheque: "Banker's Cheque",
  cash: "Cash",
};

// Current time in the "YYYY-MM-DDTHH:mm" form the date and time field uses
const nowLocal = () => {
  const x = new Date();
  x.setSeconds(0, 0);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

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

export default function SettlementCase() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [pay, setPay] = useState({ method: "bank_wire", reference: "", amount: "" });
  const [proof, setProof] = useState(null);
  const [hand, setHand] = useState({ date: nowLocal(), collectorName: "", collectorId: "", notes: "" });
  const [signed, setSigned] = useState(null);

  const load = async () => {
    const { instruction } = await api(`/settlement/${id}`);
    setC(instruction);
    return instruction;
  };

  useEffect(() => {
    load()
      .then((i) => setPay((p) => ({ ...p, amount: p.amount || i.winningBid })))
      .catch((e) => setError(e.message));
  }, [id]);

  const setPayField = (f) => (e) => setPay({ ...pay, [f]: e.target.value });
  const setHandField = (f) => (e) => setHand({ ...hand, [f]: e.target.value });

  const confirmPayment = async (e) => {
    e.preventDefault();
    setError("");
    if (!proof) return setError("Attach the bank slip or proof of payment.");

    const form = new FormData();
    form.append("method", pay.method);
    form.append("reference", pay.reference);
    form.append("amount", pay.amount);
    form.append("proof", proof);

    setBusy(true);
    try {
      await api(`/settlement/${id}/payment`, { method: "POST", form });
      setProof(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const closeCase = async (e) => {
    e.preventDefault();
    setError("");
    if (!signed) return setError("Attach the signed handover form or gate pass.");

    const form = new FormData();
    form.append("handoverDate", new Date(hand.date).toISOString());
    form.append("collectorName", hand.collectorName);
    form.append("collectorId", hand.collectorId);
    form.append("notes", hand.notes);
    form.append("signedForm", signed);

    setBusy(true);
    try {
      await api(`/settlement/${id}/handover`, { method: "POST", form });
      setSigned(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openFile = async (f) => {
    try {
      await downloadSettlementFile(id, f.filename, f.originalName);
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

  const paymentDone = c.status !== "closed";
  const handoverDone = c.status === "completed";

  return (
    <AdminLayout>
      <Link to="/admin/settlement" className="text-sm text-slate-500 hover:text-slate-900">&larr; Back to Settlement</Link>
      <div className="mb-6 mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Post-Auction Settlement &amp; Handover</h1>
        <StatusBadge status={c.status} />
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="mb-6 rounded-xl border bg-white p-6">
        <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          <Row label="Case / Lot">{c.caseRef}{c.lotNumber ? ` | ${c.lotNumber}` : ""}</Row>
          <Row label="Asset">{c.description}{c.registration ? ` (${c.registration})` : ""}</Row>
          <Row label="Buyer">{c.winner ? `${c.winner.name} (Bidder #${c.winner.bidderNo})` : ""}</Row>
          <Row label="Amount payable">{kes(c.winningBid)}</Row>
          <Row label="Buyer email">{c.winner?.email}</Row>
          <Row label="Buyer phone">{c.winner?.phone}</Row>
          <Row label="Seller">{c.client?.organization}</Row>
          <Row label="Collection point">{c.yardLocation}</Row>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* STEP 1: payment */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Step 1: Payment Verification</h2>

          {!paymentDone ? (
            <form onSubmit={confirmPayment}>
              <label className={labelClass}>Payment Method</label>
              <select value={pay.method} onChange={setPayField("method")} className={`${inputClass} mb-4`}>
                {Object.entries(methodLabel).map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>

              <label className={labelClass}>Transaction Reference</label>
              <input
                required value={pay.reference} onChange={setPayField("reference")}
                placeholder="e.g. TXN-STANBIC-90812" className={`${inputClass} mb-4`}
              />

              <label className={labelClass}>Amount Received (KES)</label>
              <input
                type="number" min="1" required value={pay.amount} onChange={setPayField("amount")}
                className={`${inputClass} mb-4`}
              />

              <FileField label="Bank Slip / Proof of Payment" required file={proof} onChange={setProof} />

              <button disabled={busy} className="w-full rounded bg-slate-900 p-2 font-semibold text-white disabled:opacity-50">
                {busy ? "Saving..." : "Confirm Payment Cleared"}
              </button>
            </form>
          ) : (
            <div>
              <p className="mb-4 inline-block rounded bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                Payment verified
              </p>
              <Row label="Payment method">{methodLabel[c.payment?.method]}</Row>
              <Row label="Transaction reference">{c.payment?.reference}</Row>
              <Row label="Amount received">{c.payment?.amount ? kes(c.payment.amount) : ""}</Row>
              <Row label="Recorded">{c.payment?.receivedAt ? dateTime(c.payment.receivedAt) : ""}</Row>
              {c.payment?.proof && (
                <button onClick={() => openFile(c.payment.proof)} className="text-sm font-semibold text-blue-600 hover:underline">
                  Download proof of payment ({c.payment.proof.originalName})
                </button>
              )}
            </div>
          )}
        </section>

        {/* STEP 2: handover */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Step 2: Asset Handover Sign-Off</h2>

          {!paymentDone && (
            <p className="rounded bg-slate-100 p-4 text-sm text-slate-600">
              Complete Step 1 first. The asset can only be released once payment has been confirmed.
            </p>
          )}

          {paymentDone && !handoverDone && (
            <form onSubmit={closeCase}>
              <label className={labelClass}>Handover / Collection Date</label>
              <div className="mb-4">
                <DateTimeField required value={hand.date} onChange={(v) => setHand((p) => ({ ...p, date: v }))} />
              </div>

              <label className={labelClass}>Collector Name</label>
              <input required value={hand.collectorName} onChange={setHandField("collectorName")} className={`${inputClass} mb-4`} />

              <label className={labelClass}>Collector National ID</label>
              <input required value={hand.collectorId} onChange={setHandField("collectorId")} className={`${inputClass} mb-4`} />

              <label className={labelClass}>Collection Notes / Condition at Release</label>
              <textarea rows="3" value={hand.notes} onChange={setHandField("notes")} className={`${inputClass} mb-4`} />

              <FileField label="Signed Handover Form / Gate Pass" required file={signed} onChange={setSigned} />

              <button disabled={busy} className="w-full rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50">
                {busy ? "Saving..." : "Sign & Close Auction Case"}
              </button>
            </form>
          )}

          {handoverDone && (
            <div>
              <p className="mb-4 inline-block rounded bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                Asset handed over, case closed
              </p>
              <Row label="Collected">{c.handover?.date ? dateTime(c.handover.date) : ""}</Row>
              <Row label="Collector name">{c.handover?.collectorName}</Row>
              <Row label="Collector national ID">{c.handover?.collectorId}</Row>
              <Row label="Notes">{c.handover?.notes}</Row>
              {c.handover?.signedForm && (
                <button onClick={() => openFile(c.handover.signedForm)} className="text-sm font-semibold text-blue-600 hover:underline">
                  Download signed form ({c.handover.signedForm.originalName})
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}