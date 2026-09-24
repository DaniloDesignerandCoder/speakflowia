"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

const PUBLIC_ROUTES = new Set(["/login"]);
const SESSION_KEY = "speakflow:active-user";

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const clearPrivateClientState = () => {
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith("speakflow:") && key !== SESSION_KEY)
          .forEach((key) => localStorage.removeItem(key));
        sessionStorage.clear();
      } catch {
        // Storage may be unavailable in privacy-restricted browsers.
      }
    };

    const bindUser = (userId: string | null) => {
      if (!userId) {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {}
        return;
      }

      let previous: string | null = null;
      try {
        previous = localStorage.getItem(SESSION_KEY);
      } catch {}

      if (previous && previous !== userId) clearPrivateClientState();

      try {
        localStorage.setItem(SESSION_KEY, userId);
      } catch {}
    };

    const enforceSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !user) {
        bindUser(null);
        clearPrivateClientState();
        if (!PUBLIC_ROUTES.has(pathname)) router.replace("/login");
        return;
      }

      bindUser(user.id);
    };

    void enforceSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !session) {
        bindUser(null);
        clearPrivateClientState();
        if (!PUBLIC_ROUTES.has(pathname)) router.replace("/login");
        return;
      }

      bindUser(session.user.id);
    });

    const handlePageShow = () => void enforceSession();
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname, router]);

  return null;
}
