import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession, type ApiSpy } from "./helpers/app";

test("signed-in history fetches inspections scoped to the current user", async ({ page }) => {
  const spies: ApiSpy[] = [];
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" }, spies);

  await page.goto("/history");
  await expect(page).toHaveURL(/\/history$/);
  await expect.poll(() => spies.find((spy) => spy.url.includes("/api/inspections?"))).toBeTruthy();

  const inspectionRequest = spies.find((spy) => spy.url.includes("/api/inspections?"));
  expect(inspectionRequest).toBeTruthy();
  expect(inspectionRequest?.url).toContain("limit=50");
  expect(inspectionRequest?.url).toContain("offset=0");
  expect(inspectionRequest?.url).toContain("scope=mine");
});

test("history query does not run when no user is signed in", async ({ page }) => {
  let inspectionCalls = 0;

  await page.route("**/api/analysis/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });

  await page.route("**/api/inspections?**", async (route) => {
    inspectionCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/history");
  await page.waitForURL("**/login");
  expect(inspectionCalls).toBe(0);
});
