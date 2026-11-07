import { useEffect, useState } from "react";
import { getToken } from "../api";

// Loads an image that needs the login token, then shows it
export default function AuthImage({ src, alt = "", className = "" }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    fetch(src, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!url) return <div className={`animate-pulse bg-slate-200 ${className}`} />;
  return <img src={url} alt={alt} className={className} />;
}