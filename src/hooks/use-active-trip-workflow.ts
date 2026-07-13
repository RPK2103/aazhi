"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ActiveTripDto,
  ActiveTripStartResponse,
  RefreshMarineResponse,
  StartTripRequestBody,
} from "@/application/active-trip";
import {
  clearActiveTripId,
  clearVesselId,
  readActiveTripId,
  writeActiveTripId,
  writeVesselId,
} from "@/lib/active-trip-storage";

export function useActiveTripWorkflow() {
  const [activeTrip, setActiveTrip] = useState<ActiveTripDto | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const tripId = readActiveTripId();
      if (!tripId) {
        if (!cancelled) setIsRestoring(false);
        return;
      }

      try {
        const response = await fetch(`/api/risk/trips/${tripId}`);
        if (!response.ok) {
          clearActiveTripId();
          if (!cancelled) setActiveTrip(null);
          return;
        }
        const data = (await response.json()) as ActiveTripDto;
        if (!cancelled) setActiveTrip(data);
      } catch {
        clearActiveTripId();
        if (!cancelled) setActiveTrip(null);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  const startTrip = useCallback(async (payload: StartTripRequestBody): Promise<ActiveTripStartResponse> => {
    setIsStarting(true);
    setError("");
    try {
      const response = await fetch("/api/risk/trips/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        if (body.error === "INVALID_VESSEL_REFERENCE") {
          clearVesselId();
        }
        throw new Error(
          body.message ?? "Trip state could not be recorded. No active trip was created.",
        );
      }

      const start = body as ActiveTripStartResponse;
      writeVesselId(start.vesselId);
      writeActiveTripId(start.tripId);

      const tripResponse = await fetch(`/api/risk/trips/${start.tripId}`);
      if (!tripResponse.ok) {
        throw new Error("Trip state could not be recorded. No active trip was created.");
      }
      setActiveTrip((await tripResponse.json()) as ActiveTripDto);
      return start;
    } catch (startError) {
      const message =
        startError instanceof Error
          ? startError.message
          : "Trip state could not be recorded. No active trip was created.";
      setError(message);
      throw startError;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const refreshMarine = useCallback(async () => {
    if (!activeTrip) return null;
    setIsRefreshing(true);
    setError("");
    try {
      const response = await fetch(
        `/api/risk/trips/${activeTrip.tripId}/refresh-marine`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.message ??
            "Latest marine context could not be checked. The last recorded trip state is unchanged.",
        );
      }
      const refresh = body as RefreshMarineResponse;
      setActiveTrip(refresh.activeTrip);
      return refresh;
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Latest marine context could not be checked. The last recorded trip state is unchanged.";
      setError(message);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTrip]);

  return {
    activeTrip,
    isRestoring,
    isStarting,
    isRefreshing,
    error,
    startTrip,
    refreshMarine,
    setActiveTrip,
  };
}
