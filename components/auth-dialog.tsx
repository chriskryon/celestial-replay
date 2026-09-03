"use client";

import { X } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

import { AuthForm } from "@/components/auth-form";

type AuthMode = "sign-in" | "sign-up";
type AuthDialogContextValue = {
  openSignIn: () => void;
  openSignUp: () => void;
};

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [isOpen, setIsOpen] = useState(false);

  const open = (nextMode: AuthMode) => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMode(nextMode);
    setIsOpen(true);
  };

  const close = () => {
    dialogRef.current?.close();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <AuthDialogContext.Provider value={{ openSignIn: () => open("sign-in"), openSignUp: () => open("sign-up") }}>
      {children}
      <dialog className="auth-dialog" ref={dialogRef} aria-labelledby="auth-title" onClose={handleClose}>
        <button className="auth-dialog-close" type="button" onClick={close} aria-label="Fechar autenticação"><X aria-hidden="true" size={18} /></button>
        <AuthForm key={mode} mode={mode} variant="dialog" onSuccess={close} />
      </dialog>
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  const value = useContext(AuthDialogContext);
  if (!value) throw new Error("useAuthDialog deve ser usado dentro de AuthDialogProvider.");
  return value;
}
