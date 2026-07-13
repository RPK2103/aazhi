"use client";

import { useCallback, useEffect, useState } from "react";
import type { CoordinatorAttentionDTO } from "@/application/coordinator-attention";

interface CoordinatorAttentionState {
  data: CoordinatorAttentionDTO | null;
  isLoading: boolean;
  error: string;
}

export function useCoordinatorAttention() {
  const [state, setState] = useState<CoordinatorAttentionState>({
    data: null,
    isLoading: true,
    error: "",
  });

  const loadAttention = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: "" }));

    try {
      const response = await fetch("/api/risk/coordinator/attention");
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message ?? "Coordinator attention could not be loaded.",
        );
      }

      const data = (await response.json()) as CoordinatorAttentionDTO;
      setState({ data, isLoading: false, error: "" });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Coordinator attention could not be loaded.",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialAttention() {
      try {
        const response = await fetch("/api/risk/coordinator/attention");
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(
            payload?.message ?? "Coordinator attention could not be loaded.",
          );
        }

        const data = (await response.json()) as CoordinatorAttentionDTO;
        if (!cancelled) {
          setState({ data, isLoading: false, error: "" });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Coordinator attention could not be loaded.",
          });
        }
      }
    }

    void loadInitialAttention();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...state,
    refresh: loadAttention,
  };
}
