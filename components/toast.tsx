"use client";
import { CheckCircle2, XCircle } from "lucide-react";
export function Toast({ message, tone = "success" }: { message: string | null; tone?: "success" | "error" }) { if (!message) return null; return <div className={`toast toast-${tone}`} role="status"><span>{tone === "success" ? <CheckCircle2 size={17}/> : <XCircle size={17}/>}</span>{message}</div>; }
