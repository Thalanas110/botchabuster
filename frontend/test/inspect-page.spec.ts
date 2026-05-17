import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";
import { uploadSamplePhoto } from "./helpers/image";

test("prevents saving the same analyzed record more than once", async ({ page }) => {
  test.setTimeout(120_000);

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/inspect");
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();
  let uploadCalls = 0;
  let createCalls = 0;
  let createPayload = "";

  await page.route("**/api/upload/inspection-image", async (route) => {
    uploadCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ imageUrl: "https://example.com/sample.jpg" }),
    });
  });

  await page.route("**/api/inspections", async (route) => {
    if (route.request().method() === "POST") {
      createCalls += 1;
      createPayload = route.request().postData() ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "inspection-1" }),
      });
      return;
    }
    await route.fallback();
  });

  const analyzeButton = page.getByRole("button", { name: /Analyze Sample|Preparing MobileNetV3/i });
  await expect(analyzeButton).toBeVisible();
  await expect(analyzeButton).toBeEnabled({ timeout: 30_000 });
  await analyzeButton.click();

  await expect(page.getByRole("heading", { name: "Classification" })).toBeVisible({ timeout: 60_000 });

  await expect.poll(() => uploadCalls).toBe(1);
  await expect.poll(() => createCalls).toBe(1);
  expect(JSON.parse(createPayload)).toMatchObject({ location: "Old Market" });
  await expect(page.getByRole("button", { name: "Record Saved" })).toBeDisabled();
});
