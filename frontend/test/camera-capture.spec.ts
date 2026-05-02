import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";
import { uploadSamplePhoto } from "./helpers/image";

test("uploaded image can be confirmed without blur false-positive from canvas re-check", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/inspect");
  await uploadSamplePhoto(page);
  await expect(page.getByText(/center crop -> 224x224 model input/i)).toBeVisible();

  await page.getByRole("button", { name: "Use Photo" }).click();

  await expect(page.getByRole("button", { name: "Analyze Sample" })).toBeVisible();
  await expect(page.getByText(/Image appears blurry/i)).toHaveCount(0);
});
