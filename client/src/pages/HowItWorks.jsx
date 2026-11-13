import { Link } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";

const steps = [
  ["Create an account", "Register as a bidder with your name, contact details and national ID or passport number, and accept the auction terms."],
  ["Wait for verification", "The auction firm checks your details and approves your account. You can browse lots straight away, but you can bid only after you are verified."],
  ["Find a lot", "Browse upcoming and live auctions, view photos and details, and see the starting bid and when each auction closes."],
  ["Place your bids", "On a live lot, enter an amount at or above the minimum shown. Every bid updates instantly for everyone watching. You appear to others only as a bidder number, such as Bidder #101."],
  ["Win the lot", "When the timer ends, the highest bid wins. You can follow the progress of your win on the My Wins page."],
  ["Pay and collect", "The firm confirms your payment, then records the handover when you collect the item with your ID and sign the handover form."],
];

export default function HowItWorks() {
  return (
    <PublicLayout>
      <h1 className="text-2xl font-bold text-slate-900">How It Works</h1>
      <p className="mb-6 text-sm text-slate-500">
        From registering to collecting your purchase, in six steps.
      </p>

      <ol className="space-y-4">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-4 rounded-xl border bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border bg-white p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Good to know</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>You cannot outbid yourself while you are already the highest bidder.</li>
          <li>Each lot has a minimum increment, shown on the lot page.</li>
          <li>Payment is made to the auction firm, which records it on the system.</li>
        </ul>
      </div>

      <div className="mt-6 flex gap-3">
        <Link to="/" className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Browse Auctions</Link>
        <Link to="/register" className="rounded border px-4 py-2 text-sm font-semibold">Register as Bidder</Link>
      </div>
    </PublicLayout>
  );
}
