"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

type AuthFormProps = { mode: "sign-in" | "sign-up" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password, callbackURL: "/" })
      : await authClient.signIn.email({ email, password, callbackURL: "/" });

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message || "Não foi possível concluir. Revise seus dados e tente novamente.");
      return;
    }
    router.replace("/");
    router.refresh();
  };

  const continueWithGoogle = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (result?.error) {
      setError(result.error.message || "Não foi possível continuar com o Google.");
      setIsSubmitting(false);
    }
  };

  return <section className="auth-surface" aria-labelledby="auth-title">
    <h1 id="auth-title">{isSignUp ? "Criar conta" : "Entrar"}</h1>
    <p>{isSignUp ? "Guarde suas playlists e seu histórico no seu próprio espaço." : "Entre para recuperar suas playlists e seu histórico."}</p>
    <form className="auth-form" onSubmit={submit}>
      {isSignUp && <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>}
      <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Aguarde…" : isSignUp ? "Criar conta" : "Entrar"}</button>
    </form>
    <div className="auth-divider"><span>ou</span></div>
    <button className="secondary-button" type="button" onClick={continueWithGoogle} disabled={isSubmitting}>Continuar com Google</button>
    <p className="auth-switch">{isSignUp ? "Já tem uma conta?" : "Ainda não tem uma conta?"} <Link href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"}>{isSignUp ? "Entrar" : "Criar conta"}</Link></p>
  </section>;
}
