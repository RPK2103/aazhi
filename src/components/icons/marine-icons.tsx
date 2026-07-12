import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function WaveHeightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" {...props}>
      <path
        d="M2 12c2-2 3-2 5 0s3 2 5 0 3-2 5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 15c2-2 3-2 5 0s3 2 5 0 3-2 5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function WavePeriodIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" {...props}>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 10V6.5M10 10l2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WindWaveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" {...props}>
      <path
        d="M3 7h9a2 2 0 1 0 0-4M3 11h11a2 2 0 1 1 0 4M3 15h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 14c1.5-1 2.5-1 4 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SwellIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" {...props}>
      <path
        d="M3 14c2-1.5 3.5-1.5 5.5 0s3.5 1.5 5.5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 10c1.5-1 2.5-1 4 0s2.5 1 4 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M7 6c1-0.8 1.8-0.8 2.8 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export function LocationIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" {...props}>
      <path
        d="M10 17s-5-4.7-5-8.5A5 5 0 0 1 15 8.5C15 12.3 10 17 10 17Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="10" cy="8.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function VesselIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" {...props}>
      <path
        d="M3 12h14l-2 4H5l-2-4Zm2-2 5-6 5 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TripIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" {...props}>
      <path
        d="M4 6h12M4 10h8M4 14h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ObservationIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" {...props}>
      <path
        d="M4 6.5A6.5 6.5 0 0 1 16 6.5c0 3.6-6 8.5-6 8.5S4 10.1 4 6.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="10" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
