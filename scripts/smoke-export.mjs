import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.DEVSIGNAL_URL || "https://devsignal.netlify.app/?qa=export-smoke";
const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const evidenceDirectory = path.resolve("test-artifacts");
const exportFormat = process.env.DEVSIGNAL_EXPORT_FORMAT === "pdf" ? "pdf" : "png";

await mkdir(evidenceDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const pageErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("#github-handle").fill("vercel");
  await page.getByRole("button", { name: /bring it in/i }).click();
  await page.locator("article.profile-card").waitFor({ state: "visible", timeout: 20000 });
  await page.locator("article.profile-card h2").filter({ hasText: "Vercel" }).waitFor({ state: "visible", timeout: 20000 });
  await page.screenshot({ path: path.join(evidenceDirectory, "export-smoke-card.png"), fullPage: true });

  const downloadPromise = page.waitForEvent("download", { timeout: 25000 });
  await page.getByRole("button", { name: `Export ${exportFormat.toUpperCase()}`, exact: true }).click();
  const download = await downloadPromise;
  const outputPath = path.join(evidenceDirectory, `vercel-devcard.${exportFormat}`);
  await download.saveAs(outputPath);
  const failure = await download.failure();
  if (failure) throw new Error(`Download failed: ${failure}`);
  console.log(JSON.stringify({ status: "passed", download: outputPath }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(evidenceDirectory, "export-smoke-failure.png"), fullPage: true }).catch(() => undefined);
  throw new Error(`${error instanceof Error ? error.message : String(error)}\nConsole errors: ${consoleErrors.join(" | ") || "none"}\nPage errors: ${pageErrors.join(" | ") || "none"}`);
} finally {
  await browser.close();
}
