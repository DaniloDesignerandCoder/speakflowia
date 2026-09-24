"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const editableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.closest(
      "input, textarea, [contenteditable='true'], [contenteditable='plaintext-only']"
    )
  );
};

const sessionMark = (userId: string) => {
  let hash = 2166136261;
  for (const char of userId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
};

export default function ContentProtection() {
  const [mark, setMark] = useState("");

  useEffect(() => {
    let mounted = true;

    const refreshMark = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setMark(session ? sessionMark(session.user.id) : "");
    };

    void refreshMark();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setMark(session ? sessionMark(session.user.id) : "");
    });

    const blockCopy = (event: ClipboardEvent) => {
      if (editableTarget(event.target)) return;
      event.preventDefault();
    };

    const blockContextMenu = (event: MouseEvent) => {
      if (editableTarget(event.target)) return;
      event.preventDefault();
    };

    const blockDrag = (event: DragEvent) => {
      if (editableTarget(event.target)) return;
      event.preventDefault();
    };

    const blockCopyShortcut = (event: KeyboardEvent) => {
      if (editableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === "c" || key === "x")) {
        event.preventDefault();
      }
    };

    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("dragstart", blockDrag);
    document.addEventListener("keydown", blockCopyShortcut);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("dragstart", blockDrag);
      document.removeEventListener("keydown", blockCopyShortcut);
    };
  }, []);

  if (!mark) return null;

  return (
    <div className="sf-content-protection" aria-hidden="true">
      <span>Conteúdo protegido · SF-{mark}</span>
    </div>
  );
}
