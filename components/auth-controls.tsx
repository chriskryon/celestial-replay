"use client";

import { ChevronDown, LogIn, LogOut, Pencil, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useAuthDialog } from "@/components/auth-dialog";

export function AuthControls() {
  const session = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openSignIn } = useAuthDialog();
  const router = useRouter();

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProfileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isProfileOpen]);

  if (session.isPending) return <span className="account-status">Carregando conta</span>;
  if (!session.data?.user) return <button className="account-link" type="button" onClick={openSignIn}><LogIn aria-hidden="true" size={16} />Entrar</button>;

  const { user } = session.data;
  const name = user.name || user.email || "Sua conta";
  const initial = name.trim().charAt(0).toLocaleUpperCase();
  const openProfile = () => { setProfileName(user.name || ""); setProfileImage(user.image || ""); setProfileError(null); setIsOpen(false); setIsProfileOpen(true); };
  const saveProfile = async () => {
    setIsSavingProfile(true); setProfileError(null);
    try {
      const result = await authClient.updateUser({ name: profileName.trim(), image: profileImage.trim() || undefined });
      if (result.error) { setProfileError(result.error.message || "Não foi possível salvar seu perfil."); return; }
      setIsProfileOpen(false);
    } catch {
      setProfileError("Não foi possível salvar seu perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const signOut = async () => {
    setSignOutError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setSignOutError(result.error.message || "Não foi possível sair agora. Tente novamente.");
        return;
      }
      setIsOpen(false);
      router.refresh();
    } catch {
      setSignOutError("Não foi possível sair agora. Tente novamente.");
    }
  };

  return <div className="account-menu" ref={menuRef}>
    <button className="avatar-trigger" type="button" aria-label="Abrir menu da conta" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
      {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{initial || <UserRound size={16} />}</span>}
      <ChevronDown aria-hidden="true" className={isOpen ? "is-open" : ""} size={15} />
    </button>
    {isOpen && <div className="account-popover" role="menu" aria-label="Conta">
      <div className="account-summary"><span className="account-summary-avatar" aria-hidden="true">{user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : initial}</span><div className="account-summary-copy"><strong>{name}</strong>{user.email && <small>{user.email}</small>}</div></div>
      <button role="menuitem" type="button" onClick={openProfile}><Pencil aria-hidden="true" size={16} />Editar perfil</button>
      <button role="menuitem" type="button" onClick={() => void signOut()}><LogOut aria-hidden="true" size={16} />Sair</button>
      {signOutError && <p className="account-menu-error" role="alert">{signOutError}</p>}
    </div>}
    {isProfileOpen && <div className="profile-backdrop" role="presentation" onMouseDown={() => setIsProfileOpen(false)}>
      <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="auth-dialog-close" type="button" onClick={() => setIsProfileOpen(false)} aria-label="Fechar perfil"><X aria-hidden="true" size={18} /></button>
        <div className="profile-heading"><span className="history-heading-icon"><UserRound aria-hidden="true" size={21} /></span><div><h2 id="profile-title">Seu perfil</h2><p>Essa identificação aparece apenas na sua conta.</p></div></div>
        <label htmlFor="profile-name">Nome</label>
        <input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} autoComplete="name" />
        <label htmlFor="profile-image">Foto (URL opcional)</label>
        <input id="profile-image" value={profileImage} onChange={(event) => setProfileImage(event.target.value)} placeholder="https://..." inputMode="url" autoComplete="url" />
        {profileError && <p className="field-error" role="alert">{profileError}</p>}
        <button className="primary-button" type="button" onClick={() => void saveProfile()} disabled={!profileName.trim() || isSavingProfile}>{isSavingProfile ? "Salvando…" : "Salvar perfil"}</button>
      </section>
    </div>}
  </div>;
}
