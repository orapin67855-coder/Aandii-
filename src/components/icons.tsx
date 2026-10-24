import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1-1.6A1.5 1.5 0 0 1 10 3.7h4a1.5 1.5 0 0 1 1.3.7l1 1.6h1.2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.6" r="3.2" />
      <circle cx="17" cy="9.3" r=".6" fill="currentColor" />
    </svg>
  );
}

export function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M4 17.5l4.6-4.3a1.6 1.6 0 0 1 2.2 0l2.4 2.3 1.6-1.5a1.6 1.6 0 0 1 2.2 0l3 2.8" />
    </svg>
  );
}

export function CalculatorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <rect x="8" y="6" width="8" height="3" rx="1" />
      <g fill="currentColor" stroke="none">
        <circle cx="9" cy="13" r=".9" />
        <circle cx="12" cy="13" r=".9" />
        <circle cx="15" cy="13" r=".9" />
        <circle cx="9" cy="16.5" r=".9" />
        <circle cx="12" cy="16.5" r=".9" />
        <circle cx="15" cy="16.5" r=".9" />
      </g>
    </svg>
  );
}

export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M7 7l.8 11a2 2 0 0 0 2 1.8h4.4a2 2 0 0 0 2-1.8L17 7M10.5 11v5M13.5 11v5" />
    </svg>
  );
}
