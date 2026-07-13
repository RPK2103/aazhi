import { describe, expect, it } from "vitest";
import { createInMemoryPersistenceRepositories } from "@/test-support/persistence";

describe("trip repository listActiveTrips", () => {
  it("returns only ACTIVE trips", async () => {
    const repos = createInMemoryPersistenceRepositories();
    const timestamps = {
      createdAt: "2026-07-13T06:00:00.000Z",
      updatedAt: "2026-07-13T06:00:00.000Z",
    };

    await repos.trips.create(
      {
        id: "trip-active",
        vesselId: "vessel-1",
        crewCount: 4,
        plannedDurationHours: 6,
        status: "ACTIVE",
        startedAt: "2026-07-13T06:00:00.000Z",
        expectedReturnAt: "2026-07-13T14:00:00.000Z",
        marineReferenceLatitude: 13.125,
        marineReferenceLongitude: 80.3,
        marineReferenceLabel: "Chennai / Kasimedu",
      },
      timestamps,
    );

    await repos.trips.create(
      {
        id: "trip-completed",
        vesselId: "vessel-1",
        crewCount: 4,
        plannedDurationHours: 6,
        status: "COMPLETED",
        startedAt: "2026-07-12T06:00:00.000Z",
        expectedReturnAt: "2026-07-12T14:00:00.000Z",
        endedAt: "2026-07-12T14:00:00.000Z",
        marineReferenceLatitude: 13.125,
        marineReferenceLongitude: 80.3,
        marineReferenceLabel: "Chennai / Kasimedu",
      },
      timestamps,
    );

    const activeTrips = await repos.trips.listActiveTrips();
    expect(activeTrips).toHaveLength(1);
    expect(activeTrips[0]?.id).toBe("trip-active");
  });
});

describe("vessel repository findByIds", () => {
  it("returns vessels in request order subset", async () => {
    const repos = createInMemoryPersistenceRepositories();
    const timestamps = {
      createdAt: "2026-07-13T06:00:00.000Z",
      updatedAt: "2026-07-13T06:00:00.000Z",
    };

    await repos.vessels.create(
      {
        id: "vessel-a",
        displayName: "TN-A",
        vesselType: "fiberglass",
      },
      timestamps,
    );
    await repos.vessels.create(
      {
        id: "vessel-b",
        displayName: "TN-B",
        vesselType: "fiberglass",
      },
      timestamps,
    );

    const vessels = await repos.vessels.findByIds(["vessel-b", "vessel-a"]);
    expect(vessels).toHaveLength(2);
    expect(vessels.map((vessel) => vessel.id)).toEqual(["vessel-b", "vessel-a"]);
  });
});
