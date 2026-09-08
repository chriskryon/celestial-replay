"use client";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function Toast({ message, tone = "success" }: { message: string | null; tone?: "success" | "error" }) {
  const [visible, setVisible] = useState(message);

  useEffect(() => {
    setVisible(message);
    if (!message) return;
    const timeout = window.setTimeout(() => setVisible(null), tone === "error" ? 6500 : 4200);
    return () => window.clearTimeout(timeout);
  }, [message, tone]);

  if (!visible) return null;
  return <div className={`toast toast-${tone}`} role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"}><span>{tone === "success" ? <CheckCircle2 aria-hidden="true" size={17} /> : <XCircle aria-hidden="true" size={17} />}</span>{visible}</div>;
}
