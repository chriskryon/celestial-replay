"use client";

import { ChevronDown, LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useAuthDialog } from "@/components/auth-dialog";

export function AuthControls() {
  const session = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openSignIn } = useAuthDialog();

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  if (session.isPending) return <span className="account-status">Carregando conta</span>;
  if (!session.data?.user) return <button className="account-link" type="button" onClick={openSignIn}><LogIn aria-hidden="true" size={16} />Entrar</button>;

  const { user } = session.data;
  const name = user.name || user.email || "Sua conta";
  const initial = name.trim().charAt(0).toLocaleUpperCase();

  return <div className="account-menu" ref={menuRef}>
    <button className="avatar-trigger" type="button" aria-label="Abrir menu da conta" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
      {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{initial || <UserRound size={16} />}</span>}
      <ChevronDown aria-hidden="true" className={isOpen ? "is-open" : ""} size={15} />
    </button>
    {isOpen && <div className="account-popover" role="menu" aria-label="Conta">
      <div className="account-summary"><span className="account-summary-avatar" aria-hidden="true">{user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : initial}</span><div className="account-summary-copy"><strong>{name}</strong>{user.email && <small>{user.email}</small>}</div></div>
      <button role="menuitem" type="button" onClick={() => { setIsOpen(false); void authClient.signOut(); }}><LogOut aria-hidden="true" size={16} />Sair</button>
    </div>}
  </div>;
}
