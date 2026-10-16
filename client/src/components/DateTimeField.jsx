import { useEffect, useState } from "react";
import { dateTime } from "../utils";

const pad = (n) => String(n).padStart(2, "0");

// "2026-10-20T14:30" becomes { date, h: 2, m: 30, p: "PM" }
const parse = (v) =>
  v
    ? {
        date: v.slice(0, 10),
        h: Number(v.slice(11, 13)) % 12 || 12,
        m: Number(v.slice(14, 16)),
        p: Number(v.slice(11, 13)) >= 12 ? "PM" : "AM",
      }
    : { date: "", h: 9, m: 0, p: "AM" };

// { date, h: 2, m: 30, p: "PM" } becomes "2026-10-20T14:30"
const toStamp = (x) =>
  x.date ? `${x.date}T${pad((x.h % 12) + (x.p === "PM" ? 12 : 0))}:${pad(x.m)}` : "";

const box = "rounded border border-slate-300 bg-white p-2";

export default function DateTimeField({ value, onChange, required }) {
  const [parts, setParts] = useState(() => parse(value));

  // Follow the parent if it sets the value from outside (for example when editing opens)
  useEffect(() => {
    if (value) setParts(parse(value));
  }, [value]);

  const update = (patch) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(toStamp(next));
  };

  return (
    <div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          type="date" required={required} value={parts.date}
          onChange={(e) => update({ date: e.target.value })} className={box}
        />
        <select value={parts.h} onChange={(e) => update({ h: Number(e.target.value) })} className={box}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span>:</span>
        <select value={parts.m} onChange={(e) => update({ m: Number(e.target.value) })} className={box}>
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>{pad(m)}</option>
          ))}
        </select>
        <select value={parts.p} onChange={(e) => update({ p: e.target.value })} className={box}>
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>
      {parts.date && (
        <p className="mt-1 text-xs font-medium text-slate-600">{dateTime(toStamp(parts))}</p>
      )}
    </div>
  );
}