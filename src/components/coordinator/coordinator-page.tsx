"use client";

import { CoordinatorView } from "@/components/coordinator/coordinator-view";
import { useCoordinatorAttention } from "@/hooks/use-coordinator-attention";

export function CoordinatorPage() {
  const workflow = useCoordinatorAttention();
  return <CoordinatorView workflow={workflow} />;
}
