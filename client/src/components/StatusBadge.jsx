const styles = {
  submitted: ["Submitted", "bg-blue-50 text-blue-700"],
  under_review: ["Under review", "bg-amber-50 text-amber-700"],
  rejected: ["Rejected", "bg-red-50 text-red-700"],
  scheduled: ["Scheduled", "bg-indigo-50 text-indigo-700"],
  live: ["Live bidding", "bg-green-50 text-green-700"],
  closed: ["Awaiting payment", "bg-orange-50 text-orange-700"],
  payment_cleared: ["Handover due", "bg-purple-50 text-purple-700"],
  handed_over: ["Handed over", "bg-slate-100 text-slate-700"],
  completed: ["Completed", "bg-slate-100 text-slate-700"],
};

export default function StatusBadge({ status }) {
  const [label, cls] = styles[status] || [status, "bg-slate-100 text-slate-700"];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
  );
}