import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";
import { uploadSamplePhoto } from "./helpers/image";

test("hides technical metric sections when detailed results are disabled", async ({ context, page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1", showDetailedResults: false });

  await page.goto("/inspect");
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();
  await context.setOffline(true);
  const analyzeButton = page.getByRole("button", { name: /Analyze Sample|Preparing (MobileNetV3|ResNet50)/i });
  await expect(analyzeButton).toBeVisible();
  await expect(analyzeButton).toBeEnabled({ timeout: 30_000 });
  await analyzeButton.click();

  await expect(page.getByRole("heading", { name: "Classification" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Confidence/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Analysis", exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Lab* Color Space" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "GLCM Texture" })).toHaveCount(0);
  await expect(page.getByText(/Flagged Deviations/i, { exact: true })).toHaveCount(0);
});
