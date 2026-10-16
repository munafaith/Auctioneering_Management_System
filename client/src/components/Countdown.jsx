import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

export function formatRemaining(ms) {
  if (ms <= 0) return "00h 00m 00s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}

// offset = server time minus this computer's clock, so the countdown follows the server
export default function Countdown({ target, offset = 0 }) {
  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);

  return <span>{formatRemaining(new Date(target) - now)}</span>;
}