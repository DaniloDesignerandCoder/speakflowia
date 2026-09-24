"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

const PUBLIC_ROUTES = new Set(["/login", "/onboarding"]);
const SESSION_KEY = "speakflow:active-user";

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const activeUserRef = useRef<string | null>(null);

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
        activeUserRef.current = null;
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

      activeUserRef.current = userId;
      try {
        localStorage.setItem(SESSION_KEY, userId);
      } catch {}
    };

    const enforceSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session) {
        bindUser(null);
        clearPrivateClientState();
        if (!PUBLIC_ROUTES.has(pathname)) router.replace("/login");
        return;
      }

      bindUser(session.user.id);
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
