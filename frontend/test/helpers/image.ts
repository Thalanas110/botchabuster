import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const DEFAULT_SAMPLE_IMAGE_PATH = fileURLToPath(new URL("../../public/pwa-512x512.png", import.meta.url));

export async function uploadSamplePhoto(page: Page): Promise<void> {
  await page.locator('input[type="file"]:not([capture])').setInputFiles(DEFAULT_SAMPLE_IMAGE_PATH);
}
