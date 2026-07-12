"use client";

import { useSyncExternalStore } from "react";

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(),
  );
}

export function useClientDate() {
  return useSyncExternalStore(
    () => () => {},
    formatToday,
    () => null,
  );
}
