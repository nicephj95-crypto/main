import type { CSSProperties } from "react";

type IconProps = {
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
};

export function SearchIcon({ size = 18, color = "currentColor", style, className }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10.5 18.5c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8Z"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M16.6 16.6 21 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ExcelIcon({ size = 20, color = "#1f7a3f", style, className }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14 2H7.5A1.5 1.5 0 0 0 6 3.5v17A1.5 1.5 0 0 0 7.5 22h9A1.5 1.5 0 0 0 18 20.5V6l-4-4Z"
        fill="#EAF6EE"
        stroke="#C6DFCF"
      />
      <path d="M14 2v4h4" fill="#D8EEE0" stroke="#C6DFCF" />
      <path
        d="M4 7.75A1.75 1.75 0 0 1 5.75 6h5.5A1.75 1.75 0 0 1 13 7.75v8.5A1.75 1.75 0 0 1 11.25 18h-5.5A1.75 1.75 0 0 1 4 16.25v-8.5Z"
        fill={color}
      />
      <path
        d="m6.6 9.35 1.55 2.4 1.55-2.4h1.35l-2.18 3.2 2.28 3.35H9.75l-1.6-2.5-1.6 2.5H5.2l2.28-3.35L5.3 9.35h1.3Z"
        fill="white"
      />
      <path
        d="M14.5 10.25h2.25M14.5 13h2.25M14.5 15.75h2.25"
        stroke="#6FA884"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SwapIcon({ size = 22, color = "#0b6eff", style, className }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 12h10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 9l3 3-3 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 12H7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 9 6 12l3 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
