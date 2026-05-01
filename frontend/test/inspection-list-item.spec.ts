import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

test("moves the confidence summary into a full-width mobile row", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/history");

  const layout = page.getByTestId("inspection-card-layout").first();
  const metrics = page.getByTestId("inspection-metrics").first();

  await expect(layout).toBeVisible();
  await expect(metrics).toBeVisible();

  const layoutClassName = (await layout.getAttribute("class")) ?? "";
  const metricsClassName = (await metrics.getAttribute("class")) ?? "";

  expect(layoutClassName).toContain("grid-cols-[auto_minmax(0,1fr)]");
  expect(layoutClassName).toContain("sm:grid-cols-[auto_minmax(0,1fr)_auto]");
  expect(metricsClassName).toContain("col-span-2");
  expect(metricsClassName).toContain("sm:col-span-1");
});
