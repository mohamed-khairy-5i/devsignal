import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.DEVSIGNAL_URL || "https://devsignal.netlify.app/";
const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const evidenceDirectory = path.resolve("test-artifacts");

await mkdir(evidenceDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });

try {
  const sharedCardUrl = new URL(baseUrl);
  sharedCardUrl.search = "?u=vercel&template=terminal&accent=mint";
  await page.goto(sharedCardUrl.toString(), { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("article.profile-card h2").filter({ hasText: "Vercel" }).waitFor({ state: "visible", timeout: 20000 });
  const restoredState = await page.locator("article.profile-card").evaluate((card) => ({
    terminal: card.classList.contains("profile-card--terminal"),
    accent: getComputedStyle(card).getPropertyValue("--signal").trim(),
  }));
  if (!restoredState.terminal || restoredState.accent.toLowerCase() !== "#93e0bd") {
    throw new Error(`Share URL did not restore its visual recipe: ${JSON.stringify(restoredState)}`);
  }
  await page.screenshot({ path: path.join(evidenceDirectory, "behavior-share-restored.png"), fullPage: true });

  const appUrl = new URL(baseUrl);
  appUrl.search = "?qa=invalid-repo";
  await page.goto(appUrl.toString(), { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("#github-handle").fill("github.com/vercel/next.js");
  await page.getByRole("button", { name: /bring it in/i }).click();
  await page.getByText("Use a GitHub handle or a complete github.com profile URL.").waitFor({ state: "visible", timeout: 5000 });
  await page.screenshot({ path: path.join(evidenceDirectory, "behavior-invalid-repo.png"), fullPage: true });

  console.log(JSON.stringify({ status: "passed", share: restoredState, invalidRepositoryUrl: "rejected" }, null, 2));
} finally {
  await browser.close();
}
