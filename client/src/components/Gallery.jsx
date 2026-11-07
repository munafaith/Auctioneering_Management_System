import { useEffect, useState } from "react";
import { photoUrl } from "../utils";

export default function Gallery({ lotId, photos = [], label }) {
  const [i, setI] = useState(0);

  useEffect(() => setI(0), [lotId]);

  if (photos.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
        {label}
      </div>
    );
  }

  const go = (step) => setI((i + step + photos.length) % photos.length);

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-slate-900">
        <img src={photoUrl(lotId, photos[i])} alt="" className="h-80 w-full object-contain" />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => go(-1)} aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg font-bold text-slate-900 hover:bg-white"
            >
              &lsaquo;
            </button>
            <button
              onClick={() => go(1)} aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg font-bold text-slate-900 hover:bg-white"
            >
              &rsaquo;
            </button>
            <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {i + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {photos.map((f, n) => (
            <button
              key={f} onClick={() => setI(n)}
              className={`overflow-hidden rounded border-2 ${n === i ? "border-slate-900" : "border-transparent"}`}
            >
              <img src={photoUrl(lotId, f)} alt="" loading="lazy" className="h-14 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}