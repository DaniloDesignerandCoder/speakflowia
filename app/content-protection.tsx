"use client";

import { useEffect } from "react";

const editableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.closest(
      "input, textarea, [contenteditable='true'], [contenteditable='plaintext-only']"
    )
  );
};

export default function ContentProtection() {
  useEffect(() => {
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
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("dragstart", blockDrag);
      document.removeEventListener("keydown", blockCopyShortcut);
    };
  }, []);

  return null;
}
