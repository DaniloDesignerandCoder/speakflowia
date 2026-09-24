import type { SVGProps } from "react";

export type SpeakFlowIconName =
  | "home"
  | "coach"
  | "progress"
  | "music"
  | "plans"
  | "settings"
  | "conversation"
  | "pronunciation"
  | "vocabulary";

type Props = SVGProps<SVGSVGElement> & { name: SpeakFlowIconName };

export function SpeakFlowIcon({ name, ...props }: Props) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };

  const paths: Record<SpeakFlowIconName, React.ReactNode> = {
    home: <><path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9.5v10.2h13V9.5"/><path d="M9.5 19.7v-6h5v6"/></>,
    coach: <><path d="M7 18.5 4.5 20l.7-3A7 7 0 1 1 8 19"/><path d="M10 8.5h4"/><path d="M12 6.5v4"/><path d="M9.5 14h5"/></>,
    progress: <><path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/><path d="M3.5 19.5h17"/></>,
    music: <><path d="M9 17.5V6l10-2v11.5"/><path d="M9 9l10-2"/><ellipse cx="6.5" cy="17.5" rx="2.5" ry="2"/><ellipse cx="16.5" cy="15.5" rx="2.5" ry="2"/></>,
    plans: <><path d="M12 3.5 20 8l-8 4.5L4 8 12 3.5Z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16 8 4.5 8-4.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.9l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.9-.8L10.5 2h-3l-.7 2a7 7 0 0 0-1.9.8L3 3.9.9 6l.9 1.9A7 7 0 0 0 1 9.8l-2 .7v3l2 .7a7 7 0 0 0 .8 1.9L.9 18l2.1 2.1 1.9-.9a7 7 0 0 0 1.9.8l.7 2h3l.7-2a7 7 0 0 0 1.9-.8l1.9.9L18 18l-.9-1.9a7 7 0 0 0 .8-1.9l2-.7Z" transform="translate(2.5 -0.5) scale(.8)"/></>,
    conversation: <><path d="M5 17.5 3.5 20l.5-3.5A7.5 7.5 0 1 1 7 19"/><path d="M8 10h8"/><path d="M8 14h5"/></>,
    pronunciation: <><path d="M12 4v16"/><path d="M8.5 7.5v9"/><path d="M15.5 7.5v9"/><path d="M5 10v4"/><path d="M19 10v4"/></>,
    vocabulary: <><path d="M4 5.5h6a2 2 0 0 1 2 2v11a2.5 2.5 0 0 0-2.5-2.5H4V5.5Z"/><path d="M20 5.5h-6a2 2 0 0 0-2 2v11a2.5 2.5 0 0 1 2.5-2.5H20V5.5Z"/></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
