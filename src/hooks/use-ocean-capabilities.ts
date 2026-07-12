"use client";

import { useSyncExternalStore } from "react";

interface OceanCapabilities {
  isMobile: boolean;
  dpr: [number, number];
  waterSegments: number;
  reducedParticles: boolean;
  lightShaftCount: number;
}

const MOBILE_QUERY = "(max-width: 639px)";

const SERVER_SNAPSHOT = Object.freeze({
  isMobile: false,
  dpr: Object.freeze([1, 1.5] as [number, number]),
  waterSegments: 96,
  reducedParticles: false,
  lightShaftCount: 5,
}) as OceanCapabilities;

const DESKTOP_SNAPSHOT = Object.freeze({
  isMobile: false,
  dpr: Object.freeze([1, 1.5] as [number, number]),
  waterSegments: 96,
  reducedParticles: false,
  lightShaftCount: 5,
}) as OceanCapabilities;

const MOBILE_SNAPSHOT = Object.freeze({
  isMobile: true,
  dpr: Object.freeze([1, 1.15] as [number, number]),
  waterSegments: 64,
  reducedParticles: true,
  lightShaftCount: 3,
}) as OceanCapabilities;

let cachedSnapshot: OceanCapabilities = SERVER_SNAPSHOT;

const listeners = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;

function readCapabilities(): OceanCapabilities {
  return window.matchMedia(MOBILE_QUERY).matches
    ? MOBILE_SNAPSHOT
    : DESKTOP_SNAPSHOT;
}

function snapshotsEqual(
  previous: OceanCapabilities,
  next: OceanCapabilities,
): boolean {
  return (
    previous.isMobile === next.isMobile &&
    previous.dpr[0] === next.dpr[0] &&
    previous.dpr[1] === next.dpr[1] &&
    previous.waterSegments === next.waterSegments &&
    previous.reducedParticles === next.reducedParticles &&
    previous.lightShaftCount === next.lightShaftCount
  );
}

function getSnapshot(): OceanCapabilities {
  const next = readCapabilities();
  if (snapshotsEqual(cachedSnapshot, next)) {
    return cachedSnapshot;
  }
  cachedSnapshot = next;
  return cachedSnapshot;
}

function getServerSnapshot(): OceanCapabilities {
  return SERVER_SNAPSHOT;
}

function handleMediaChange() {
  const next = readCapabilities();
  if (snapshotsEqual(cachedSnapshot, next)) {
    return;
  }
  cachedSnapshot = next;
  listeners.forEach((listener) => listener());
}

function ensureMediaQuery() {
  if (mediaQuery === null) {
    mediaQuery = window.matchMedia(MOBILE_QUERY);
    mediaQuery.addEventListener("change", handleMediaChange);
  }
}

function subscribe(onStoreChange: () => void) {
  ensureMediaQuery();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && mediaQuery !== null) {
      mediaQuery.removeEventListener("change", handleMediaChange);
      mediaQuery = null;
    }
  };
}

export function useOceanCapabilities() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
