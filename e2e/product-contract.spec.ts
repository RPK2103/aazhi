import {
  test,
  expect,
  getMockControls,
  submitAssessment,
  confirmConcern,
  startTrip,
  fillAssessmentForm,
  descendToWorkspace,
  TRIP_ID,
  STALE_TRIP_ID,
  VESSEL_ID,
} from "./fixtures/test";

test.describe("Mocked browser product-contract tests", () => {
  test("E2E-01 landing page loads and coordinator link works", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.goto("/");
    await expect(page.getByText("See the sea. Speak your situation.")).toBeVisible();
    await page.getByRole("link", { name: "COORDINATOR VIEW" }).click();
    await expect(page).toHaveURL(/\/coordinator$/);
    await expect(page.getByRole("button", { name: "Refresh coordinator attention view" })).toBeVisible();
  });

  test("E2E-02 assessment validation blocks empty submit", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    const assessBefore = getMockControls(page).getAssessCallCount();
    await page.getByRole("button", { name: "ASSESS DEPARTURE READINESS" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(getMockControls(page).getAssessCallCount()).toBe(assessBefore);
  });

  test("E2E-03 successful assessment shows dashboard and disclaimer", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    await submitAssessment(page);
    await expect(
      page.getByLabel("Departure posture: PROCEED WITH CAUTION"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "MARINE CONDITIONS" }).getByText("Wave height", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator(".assessment-dashboard__disclaimer").getByText(
        "AAZHI provides preparedness and readiness assistance",
        { exact: false },
      ),
    ).toBeVisible();
  });

  test("E2E-04 explicit concern confirmation without trip start", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    await submitAssessment(page);
    await confirmConcern(page);
    await expect(page.getByText("Confirmed for trip start")).toBeVisible();
    await expect(page.getByRole("heading", { name: "ACTIVE TRIP" })).toHaveCount(0);
  });

  test("E2E-05 record trip start opens active workspace", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    await submitAssessment(page);
    await confirmConcern(page);
    await startTrip(page);
    await expect(page.getByText("State version 1")).toBeVisible();
    await expect(
      page.locator(".active-trip-workspace").getByText("OPEN", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("MANUAL UPDATE", { exact: false })).toBeVisible();
  });

  test("E2E-06 identical marine refresh keeps version 1", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    await submitAssessment(page);
    await confirmConcern(page);
    await startTrip(page);
    await page.getByRole("button", { name: "CHECK LATEST SEA CONDITIONS" }).click();
    await expect(page.getByText("NO NEW AAZHI ACTION", { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("State version 1")).toBeVisible();
  });

  test("E2E-07 material marine change shows version 2", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    await submitAssessment(page);
    await confirmConcern(page);
    await startTrip(page);
    getMockControls(page).setRefreshMode("material");
    await page.getByRole("button", { name: "CHECK LATEST SEA CONDITIONS" }).click();
    await expect(page.getByText("State version 2")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator(".active-trip-card__action").getByText("COORDINATOR REVIEW REQUIRED"),
    ).toBeVisible();
  });

  test("E2E-08 interpreter failure keeps deterministic policy visible", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    await submitAssessment(page);
    await confirmConcern(page);
    await startTrip(page);
    getMockControls(page).setRefreshMode("failed");
    await page.getByRole("button", { name: "CHECK LATEST SEA CONDITIONS" }).click();
    await expect(page.getByText("State version 2")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator(".active-trip-card__action").getByText("COORDINATOR REVIEW REQUIRED"),
    ).toBeVisible();
    await expect(page.getByText("AAZHI could not generate a grounded contextual explanation", { exact: false })).toBeVisible();
  });

  test("E2E-09 active trip restore from localStorage", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.addInitScript(
      ({ tripId, vesselId }) => {
        localStorage.setItem("aazhi:active-trip-id", tripId);
        localStorage.setItem("aazhi:vessel-id", vesselId);
      },
      { tripId: TRIP_ID, vesselId: VESSEL_ID },
    );
    await page.goto("/");
    await descendToWorkspace(page);
    await expect(page.getByRole("heading", { name: "ACTIVE TRIP" })).toBeVisible({
      timeout: 15_000,
    });
    const storage = await page.evaluate(() => ({
      trip: localStorage.getItem("aazhi:active-trip-id"),
      riskState: localStorage.getItem("aazhi:risk-state"),
    }));
    expect(storage.trip).toBe(TRIP_ID);
    expect(storage.riskState).toBeNull();
  });

  test("E2E-10 stale trip reference clears safely", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.addInitScript((tripId) => {
      localStorage.setItem("aazhi:active-trip-id", tripId);
    }, STALE_TRIP_ID);
    await page.goto("/");
    await descendToWorkspace(page);
    await expect(page.getByLabel("Typed observation")).toBeVisible();
    const tripId = await page.evaluate(() =>
      localStorage.getItem("aazhi:active-trip-id"),
    );
    expect(tripId).toBeNull();
  });

  test("E2E-11 coordinator persisted-state attention", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.goto("/coordinator");
    await expect(
      page.getByRole("heading", { name: "ATTENTION REQUIRED" }),
    ).toBeVisible();
    await expect(
      page.locator(".coordinator-card").getByText(
        "Current recorded posture requires reassessment",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.locator(".coordinator-card").getByText("NO NEW AAZHI ACTION", {
        exact: false,
      }),
    ).toBeVisible();
  });

  test.describe("E2E-12 processing-trace coordinator", () => {
    test.use({ mockScenario: "coordinator-processing-trace" });

    test("renders material trace attention basis", async ({ page, installMocks }) => {
      await installMocks();
      await page.goto("/coordinator");
      await expect(
        page.getByRole("heading", { name: "ATTENTION REQUIRED" }),
      ).toBeVisible();
      await expect(page.getByText("Grounded explanation from latest processing trace", { exact: false })).toBeVisible();
    });
  });

  test("E2E-13 coordinator refresh does not poll", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.goto("/coordinator");
    await expect(
      page.getByRole("heading", { name: "ATTENTION REQUIRED" }),
    ).toBeVisible();
    const before = getMockControls(page).getCoordinatorCallCount();
    await page.waitForTimeout(1500);
    expect(getMockControls(page).getCoordinatorCallCount()).toBe(before);
    await page.getByRole("button", { name: "Refresh coordinator attention view" }).click();
    await expect(
      page.getByRole("heading", { name: "ATTENTION REQUIRED" }),
    ).toBeVisible();
    expect(getMockControls(page).getCoordinatorCallCount()).toBe(before + 1);
  });

  test("E2E-14 responsive smoke has no horizontal overflow", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.goto("/");
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth + 1;
    });
    expect(overflow).toBe(true);
    await descendToWorkspace(page);
    await fillAssessmentForm(page);
    const workspaceOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth + 1;
    });
    expect(workspaceOverflow).toBe(true);
  });

  test("E2E-15 keyboard smoke reaches primary controls", async ({
    page,
    gotoWorkspace,
  }) => {
    await gotoWorkspace();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Typed observation")).toBeFocused();
    await page.getByRole("button", { name: "ASSESS DEPARTURE READINESS" }).focus();
    await expect(page.getByRole("button", { name: "ASSESS DEPARTURE READINESS" })).toBeFocused();
  });

  test("E2E-16 security headers are present on document responses", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("microphone=(self)");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toBeUndefined();
  });

  test("E2E-17 reduced motion preference keeps primary landing controls usable", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.goto("/");
    const reducedMotion = await page.evaluate(() =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reducedMotion).toBe(true);
    await descendToWorkspace(page);
    await expect(page.getByLabel("Typed observation")).toBeVisible();
  });

  test("E2E-18 CSS fallback environment remains available when WebGL canvas loads", async ({
    page,
    installMocks,
  }) => {
    await installMocks();
    await page.goto("/");
    await expect(page.locator(".css-fallback-environment")).toBeVisible();
    await expect(page.locator(".ocean-canvas-wrap")).toBeVisible();
    await descendToWorkspace(page);
    await expect(page.getByRole("button", { name: "ASSESS DEPARTURE READINESS" })).toBeVisible();
  });
});
