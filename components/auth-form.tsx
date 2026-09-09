"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, Mail, Orbit, UserRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  variant?: "page" | "dialog";
  onSuccess?: () => void;
};

async function settleWithin<T>(promise: Promise<T>, timeoutMs = 15_000): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error("A autenticação demorou mais que o esperado. Tente novamente.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

export function AuthForm({ mode: initialMode, variant = "page", onSuccess }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);

  const callbackUrlForCurrentPage = () => {
    const destination = variant === "dialog" ? `${window.location.pathname}${window.location.search}` : "/";
    return new URL(destination, window.location.origin).toString();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const callbackURL = callbackUrlForCurrentPage();
      const result = await settleWithin(
        isSignUp
          ? authClient.signUp.email({ name, email, password, callbackURL })
          : authClient.signIn.email({ email, password, callbackURL }),
      );
      if (result.error) {
        setError(result.error.message || "Não foi possível concluir. Revise seus dados e tente novamente.");
        return;
      }
      if (onSuccess) onSuccess();
      else router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a autenticação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueWithGoogle = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const callbackURL = callbackUrlForCurrentPage();
      const result = await authClient.signIn.social({ provider: "google", callbackURL });
      if (result?.error) setError(result.error.message || "Não foi possível continuar com o Google.");
    } catch {
      setError("Não foi possível abrir o login do Google. Verifique se pop-ups estão permitidos e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <section className={`auth-surface auth-surface-${variant}`} aria-labelledby="auth-title">
    {variant === "page" && <a className="auth-back" href="/"><ArrowLeft aria-hidden="true" size={16} />Voltar ao player</a>}
    <div className="auth-heading"><span className="auth-orbit"><Orbit aria-hidden="true" size={22} /></span><div><h1 id="auth-title">{isSignUp ? "Seu espaço celestial" : "Que bom ver você"}</h1><p>{isSignUp ? "Crie sua conta para guardar playlists e sessões concluídas." : "Entre para continuar de onde parou."}</p></div></div>
    <form className="auth-form" onSubmit={submit}>
      {isSignUp && <label>Nome<span className="auth-input"><UserRound aria-hidden="true" size={16} /><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></span></label>}
      <label>E-mail<span className="auth-input"><Mail aria-hidden="true" size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></span></label>
      <label>Senha<span className="auth-input"><LockKeyhole aria-hidden="true" size={16} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required /></span></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Aguarde…" : isSignUp ? "Criar conta" : "Entrar"}</button>
    </form>
    <div className="auth-divider"><span>ou</span></div>
    <button className="secondary-button google-button" type="button" onClick={continueWithGoogle} disabled={isSubmitting}>Continuar com Google</button>
    <p className="auth-persistence-note">Sem conta, você pode reproduzir livremente. Ao entrar, playlists, histórico e sessões ficam salvos só para você.</p>
    <p className="auth-switch">{isSignUp ? "Já tem uma conta?" : "Ainda não tem uma conta?"} <button type="button" onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}>{isSignUp ? "Entrar" : "Criar conta"}</button></p>
  </section>;
}
