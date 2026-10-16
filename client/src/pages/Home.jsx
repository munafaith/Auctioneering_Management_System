import { useEffect, useState } from "react";
import { api } from "../api";
import PublicLayout from "../components/PublicLayout";
import LotCard from "../components/LotCard";

const chips = [
  ["", "All Categories"],
  ["motor_vehicle", "Motor Vehicles"],
  ["real_estate", "Real Estate & Land"],
  ["machinery,industrial_equipment", "Industrial Equipment"],
];

export default function Home() {
  const [lots, setLots] = useState([]);
  const [offset, setOffset] = useState(0);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("q", query);

    setLoading(true);
    api(`/lots?${params}`)
      .then((d) => {
        setLots(d.lots);
        setOffset(new Date(d.serverTime) - Date.now());
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, query]);

  const submitSearch = (e) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <PublicLayout>
      <h1 className="text-2xl font-bold text-slate-900">Browse Auctions</h1>
      <p className="mb-6 text-sm text-slate-500">
        Repossessed vehicles, property and equipment, sold openly and transparently.
      </p>

      <form onSubmit={submitSearch} className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by vehicle, location, lot number or registration..."
          className="flex-1 rounded border border-slate-300 bg-white p-2"
        />
        <button className="rounded bg-slate-900 px-4 font-semibold text-white">Search</button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {chips.map(([value, label]) => (
          <button
            key={label}
            onClick={() => setCategory(value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              category === value ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">Loading auctions...</p>}
      {!loading && lots.length === 0 && !error && (
        <p className="rounded-xl border bg-white p-6 text-slate-500">
          No auctions match right now. Check back soon.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => (
          <LotCard key={lot.id} lot={lot} offset={offset} />
        ))}
      </div>
    </PublicLayout>
  );
}