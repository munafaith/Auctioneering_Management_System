import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("Checking server...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setStatus(`Connected: ${d.app} is ${d.status}`))
      .catch(() => setStatus("Could not reach the server"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <h1 className="text-3xl font-bold text-slate-900">LotLink</h1>
        <p className="mt-2 text-slate-600">{status}</p>
      </div>
    </div>
  );
}