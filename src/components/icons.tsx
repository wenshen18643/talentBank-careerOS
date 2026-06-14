import type { SVGProps } from "react";

/**
 * Geometric line icons drawn at 24x24 on a 1.8 stroke. Inline SVG keeps them
 * crisp and themeable via `currentColor`; no icon dependency required.
 */

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 17c4 0 5-4 8-4s4 4 5 4" opacity="0.5" />
      <path d="M3 14c4 0 5-9 8-9s4 7 5 7" />
      <circle cx="11" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M19 3v6m-3-3h6" />
    </svg>
  );
}

export function LandscapeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 19h18" />
      <path d="M3 16c3-7 5-7 7-3s4-9 7-2" />
      <path d="M6 19v-4m6 4v-7m6 7v-5" opacity="0.5" />
    </svg>
  );
}

export function ArcIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 18c0-8 6-12 18-12" />
      <circle cx="3" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="11" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="21" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SpeechIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9.5h8M8 12.5h5" opacity="0.6" />
    </svg>
  );
}

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 15l6-6" />
      <path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
    </svg>
  );
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function LedgerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 9h8M8 13h8M8 17h5" opacity="0.7" />
    </svg>
  );
}

export function DocIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" opacity="0.6" />
    </svg>
  );
}

export function InboxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13l2.5-7h11L20 13v6H4z" />
      <path d="M4 13h5l1.5 2h3L18 13h2" />
    </svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
