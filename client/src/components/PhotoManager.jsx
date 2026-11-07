import { useRef, useState } from "react";
import { api } from "../api";
import AuthImage from "./AuthImage";

const MAX = 8;

export default function PhotoManager({ caseId, photos, editable, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // lets the same file be chosen again later
    if (files.length === 0) return;

    setError("");
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));

    setBusy(true);
    try {
      const d = await api(`/instructions/${caseId}/photos`, { method: "POST", form });
      onChange(d.photos);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (filename) => {
    setError("");
    try {
      const d = await api(`/instructions/${caseId}/photos/${filename}`, { method: "DELETE" });
      onChange(d.photos);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-6 border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs uppercase text-slate-500">
          Photos ({photos.length}/{MAX})
        </h3>
        {editable && photos.length < MAX && (
          <>
            <input
              ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp"
              onChange={upload} className="hidden"
            />
            <button
              type="button" disabled={busy} onClick={() => inputRef.current.click()}
              className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Uploading..." : "Add photos"}
            </button>
          </>
        )}
      </div>

      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {photos.length === 0 ? (
        <p className="text-sm text-slate-500">
          No photos yet.{editable ? " Add photos so bidders can see the asset." : ""}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.filename} className="relative overflow-hidden rounded border">
              <AuthImage
                src={`/api/instructions/${caseId}/photos/${p.filename}`}
                alt={p.originalName}
                className="h-28 w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Cover
                </span>
              )}
              {editable && (
                <button
                  type="button" onClick={() => remove(p.filename)}
                  className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        JPG, PNG or WebP, up to 8 MB each. The first photo is the cover shown in the catalog.
        {editable ? "" : " Photos are locked once bidding has opened."}
      </p>
    </div>
  );
}