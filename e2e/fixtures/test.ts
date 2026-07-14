import { test as base, expect, type Page, type Route } from "@playwright/test";
import {
  assessmentResponse,
  buildActiveTripDto,
  buildCoordinatorAttentionResponse,
  buildCoordinatorProcessingTraceResponse,
  buildInterpreterFailureRefreshResponse,
  buildMaterialChangeRefreshResponse,
  buildNoDeltaRefreshResponse,
  buildStartTripResponse,
  STALE_TRIP_ID,
  TRIP_ID,
} from "./mock-api";

export type MockScenario =
  | "default"
  | "material-change"
  | "interpreter-failure"
  | "coordinator-processing-trace"
  | "stale-trip";

type Fixtures = {
  mockScenario: MockScenario;
  installMocks: () => Promise<void>;
  gotoWorkspace: () => Promise<void>;
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export const test = base.extend<Fixtures>({
  mockScenario: ["default", { option: true }],
  page: async ({ page }, use) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await use(page);
  },
  installMocks: async ({ page, mockScenario }, use) => {
    const assessCalls: string[] = [];
    const coordinatorCalls: string[] = [];
    let refreshMode: "none" | "identical" | "material" | "failed" = "none";

    await use(async () => {
      await page.route("**/api/assess", async (route) => {
        assessCalls.push("assess");
        await fulfillJson(route, assessmentResponse);
      });

      await page.route("**/api/risk/trips/start", async (route) => {
        await fulfillJson(route, buildStartTripResponse());
      });

      await page.route(`**/api/risk/trips/${TRIP_ID}`, async (route) => {
        if (route.request().method() === "GET") {
          await fulfillJson(route, buildActiveTripDto());
          return;
        }
        await route.continue();
      });

      await page.route(`**/api/risk/trips/${STALE_TRIP_ID}`, async (route) => {
        await fulfillJson(
          route,
          { error: "TRIP_NOT_FOUND", message: "Active trip was not found." },
          404,
        );
      });

      await page.route(`**/api/risk/trips/${TRIP_ID}/refresh-marine`, async (route) => {
        if (refreshMode === "material") {
          await fulfillJson(route, buildMaterialChangeRefreshResponse());
        } else if (refreshMode === "failed") {
          await fulfillJson(route, buildInterpreterFailureRefreshResponse());
        } else {
          await fulfillJson(route, buildNoDeltaRefreshResponse());
        }
      });

      await page.route("**/api/risk/coordinator/attention", async (route) => {
        coordinatorCalls.push("coordinator");
        if (mockScenario === "coordinator-processing-trace") {
          await fulfillJson(route, buildCoordinatorProcessingTraceResponse());
          return;
        }
        await fulfillJson(route, buildCoordinatorAttentionResponse());
      });

      page.on("pageerror", (error) => {
        throw error;
      });

      page.on("console", (message) => {
        if (message.type() === "error") {
          const text = message.text();
          if (text.includes("favicon.ico")) return;
          if (text.includes("status of 404")) return;
          throw new Error(`Unexpected console error: ${text}`);
        }
      });

      (page as Page & {
        __aazhiMocks: {
          getAssessCallCount: () => number;
          getCoordinatorCallCount: () => number;
          setRefreshMode: (mode: typeof refreshMode) => void;
        };
      }).__aazhiMocks = {
        getAssessCallCount: () => assessCalls.length,
        getCoordinatorCallCount: () => coordinatorCalls.length,
        setRefreshMode: (mode) => {
          refreshMode = mode;
        },
      };
    });
  },
  gotoWorkspace: async ({ page, installMocks }, use) => {
    await use(async () => {
      await installMocks();
      await page.goto("/");
      await descendToWorkspace(page);
    });
  },
});

export { expect };

export function getMockControls(page: Page) {
  return (
    page as Page & {
      __aazhiMocks: {
        getAssessCallCount: () => number;
        getCoordinatorCallCount: () => number;
        setRefreshMode: (
          mode: "none" | "identical" | "material" | "failed",
        ) => void;
      };
    }
  ).__aazhiMocks;
}

export async function descendToWorkspace(page: Page) {
  await page.getByRole("button", { name: "Descend to AAZHI assessment workspace" }).click();
  await expect(page.getByLabel("Typed observation")).toBeVisible();
}

export async function fillAssessmentForm(page: Page) {
  await page.getByLabel("Typed observation").fill(
    "The sea near shore looks rougher and the engine needs checking.",
  );
  await page.getByLabel("Coastal location").selectOption("chennai-kasimedu");
  await page.getByLabel("Boat type").selectOption("Small fibre boat");
  await page.getByLabel("Crew count").fill("5");
  await page.getByLabel("Trip duration (hours)").fill("8");
}

export async function submitAssessment(page: Page) {
  await fillAssessmentForm(page);
  await page.getByRole("button", { name: "ASSESS DEPARTURE READINESS" }).click();
  await expect(page.getByText("DEPARTURE POSTURE")).toBeVisible({
    timeout: 15_000,
  });
}

export async function confirmConcern(page: Page) {
  await page.getByRole("button", { name: "CARRY INTO TRIP RISK RECORD" }).click();
  await expect(page.getByText("Confirmed for trip start")).toBeVisible();
}

export async function startTrip(page: Page) {
  await page.getByRole("button", { name: "RECORD TRIP START" }).click();
  await expect(page.getByRole("heading", { name: "ACTIVE TRIP" })).toBeVisible({
    timeout: 15_000,
  });
}

export { TRIP_ID, STALE_TRIP_ID, VESSEL_ID } from "./mock-api";
