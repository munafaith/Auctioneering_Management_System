const labelClass = "block text-sm font-medium text-slate-700";

export default function FileField({ label, required, file, onChange }) {
  return (
    <div className="mb-4">
      <label className={labelClass}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {file ? (
        <div className="mt-1 flex items-center justify-between rounded border border-slate-300 bg-slate-50 p-2 text-sm">
          <span className="truncate text-slate-700">
            {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-3 shrink-0 font-semibold text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white"
        />
      )}
    </div>
  );
}