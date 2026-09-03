"use client";

import { type ReactNode } from "react";

import { useAuthDialog } from "@/components/auth-dialog";

type OpenAuthButtonProps = {
  children: ReactNode;
  className?: string;
};

export function OpenAuthButton({ children, className = "primary-button" }: OpenAuthButtonProps) {
  const { openSignIn } = useAuthDialog();
  return <button className={className} type="button" onClick={openSignIn}>{children}</button>;
}
