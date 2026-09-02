"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-4 text-sm font-medium text-ink disabled:opacity-60"
    >
      <LogOut aria-hidden className="size-4" />
      {isSigningOut ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
